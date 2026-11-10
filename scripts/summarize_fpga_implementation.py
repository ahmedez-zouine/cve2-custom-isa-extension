#!/usr/bin/env python3
"""Validate the archived OOC implementation pair and export its report data."""

import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
VARIANTS = ("baseline", "extended")
RESOURCE_FIELDS = ("total_luts", "logic_luts", "lutrams", "srls", "ffs", "ramb36", "ramb18", "dsps")
TIMING_FIELDS = ("wns_ns", "tns_ns", "setup_failing_endpoints", "setup_total_endpoints",
                 "whs_ns", "ths_ns", "hold_failing_endpoints", "hold_total_endpoints",
                 "wpws_ns", "tpws_ns", "pulse_failing_endpoints", "pulse_total_endpoints")
REPORTS = ("utilization.rpt", "timing_summary.rpt", "register_setup_paths.rpt", "setup_paths.rpt",
           "hold_paths.rpt", "check_timing.rpt", "methodology.rpt", "drc.rpt", "clocks.rpt",
           "clock_utilization.rpt", "route_status.rpt")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha256(content):
    return hashlib.sha256(content).hexdigest()


def fields(text):
    return dict(line.split(": ", 1) for line in text.splitlines() if ": " in line)


def match(pattern, text):
    value = re.search(pattern, text, re.MULTILINE)
    require(value is not None, "Missing report field: " + pattern)
    return value


def header(text, key):
    return match(r"^\| " + re.escape(key) + r"\s*:\s*(.*?)\s*$", text).group(1)


def resources(text):
    row = match(r"^\| cve2_fpga_top\s*\|\s*\(top\)\s*\|(.*)$", text).group(1)
    values = [int(cell.strip()) for cell in row.strip().strip("|").split("|")]
    require(len(values) == len(RESOURCE_FIELDS), "Unexpected utilization columns")
    return dict(zip(RESOURCE_FIELDS, values))


def timing(text):
    section = text.split("| Design Timing Summary", 1)[1].split("| Clock Summary", 1)[0]
    rows = [line.split() for line in section.splitlines() if re.match(r"^\s*-?\d+\.\d+\s", line)]
    require(len(rows) == 1 and len(rows[0]) == len(TIMING_FIELDS), "Unexpected timing summary")
    result = {key: int(value) if key.endswith("endpoints") else float(value)
              for key, value in zip(TIMING_FIELDS, rows[0])}
    require(all(math.isfinite(value) for value in result.values()), "Nonfinite timing value")
    for check, slack in (("setup", "wns_ns"), ("hold", "whs_ns"), ("pulse", "wpws_ns")):
        failing, total = result[check + "_failing_endpoints"], result[check + "_total_endpoints"]
        require(0 <= failing <= total and (result[slack] < 0) == (failing > 0), "Inconsistent timing counts")
    return result


def paths(text):
    blocks = re.split(r"(?=^Slack \()", text, flags=re.MULTILINE)[1:]
    require(len(blocks) == 10, "Expected ten reported timing paths")
    result = []
    for block in blocks:
        delay = match(r"Data Path Delay:\s*([\d.]+)ns\s*\(logic ([\d.]+)ns.*?route ([\d.]+)ns", block)
        carry = re.search(r"Logic Levels:[^\n]*CARRY4=(\d+)", block)
        result.append({
            "slack_ns": float(match(r"^Slack \([^)]+\)\s*:\s*(-?[\d.]+)ns", block).group(1)),
            "source": match(r"^  Source:\s*(.*?)\s*$", block).group(1),
            "destination": match(r"^  Destination:\s*(.*?)\s*$", block).group(1),
            "data_delay_ns": float(delay.group(1)), "logic_delay_ns": float(delay.group(2)),
            "route_delay_ns": float(delay.group(3)),
            "logic_levels": int(match(r"Logic Levels:\s*(\d+)", block).group(1)),
            "carry4_on_path": int(carry.group(1)) if carry else 0,
            "traverses_isqrt": "isqrt_comb." in block,
        })
    require(result[0]["slack_ns"] == min(path["slack_ns"] for path in result), "First path is not worst")
    return result


def rules(text):
    section = text.split("2. REPORT DETAILS\n-----------------", 1)[0]
    return {key: {"severity": severity, "count": int(count), "description": description.strip()}
            for key, severity, description, count in re.findall(
                r"^\|\s*([A-Z]+-\d+)\s*\|\s*(\w+)\s*\|([^|]+)\|\s*(\d+)\s*\|", section, re.MULTILINE)}


def constraint_commands(text):
    return [line.strip() for line in text.splitlines() if line.strip() and not line.lstrip().startswith("#")]


def read_run(directory, variant):
    info = fields((directory / "implementation_info.txt").read_text())
    require(info["status"] == "reports_generated", "Implementation did not finish: " + variant)
    require(info["variant"] == variant and info["tool"] == "2024.2", "Variant or tool mismatch")
    require(info["part"] == "xc7a35tcsg324-1" and float(info["clock_period_ns"]) == 20.0, "Target mismatch")
    require(info["max_threads"] == "4", "Thread setting mismatch")
    texts = {name: (directory / name).read_text() for name in REPORTS}
    for name, text in texts.items():
        if name == "route_status.rpt":
            continue
        require(header(text, "Design") == "cve2_fpga_top", "Wrong top in " + variant + "/" + name)
        require(header(text, "Design State") in ("Routed", "Fully Routed"), "Wrong design stage in " + name)
        require("v.2024.2 " in header(text, "Tool Version") and "Build 5239630" in header(text, "Tool Version"), "Tool build mismatch")
        require("Ubuntu 24.04.5 LTS" in header(text, "Host"), "Unexpected report host")
        require(header(text, "Device").replace("-", "") in ("7a35tcsg324", "xc7a35tcsg3241"), "Device mismatch")
        require(header(text, "Speed File").split()[0] == "-1", "Speed grade mismatch")
    require(float(match(r"^core_clk\s+([\d.]+)\s+", texts["clocks.rpt"]).group(1)) == 20.0, "Clock period mismatch")
    copied_info = (directory / "synthesis_run_info.txt").read_bytes()
    original_info = (ROOT / "output/fpga" / variant / "run_info.txt").read_bytes()
    require(copied_info == original_info, "Input synthesis provenance mismatch")
    require((directory / "synthesis_vivado.log").read_bytes() == (ROOT / "output/fpga" / variant / "vivado.log").read_bytes(),
            "Copied synthesis log differs from the reviewed synthesis archive")
    git_driver = subprocess.check_output(["git", "show", info["driver_revision"] + ":fpga/implement.tcl"], cwd=ROOT)
    require(git_driver == (directory / "implementation_driver.tcl").read_bytes(), "Driver differs from recorded Git revision")
    route = {key.replace(" ", "_"): int(value) for key, value in re.findall(
        r"# of ([a-z ]+)\.+\s*:\s*(\d+)\s*:", texts["route_status.rpt"])}
    require(route["fully_routed_nets"] <= route["routable_nets"], "Invalid routing count")
    require(route["logical_nets"] == route["nets_not_needing_routing"] + route["routable_nets"], "Inconsistent logical net total")
    overall, internal, hold = (paths(texts[name]) for name in ("setup_paths.rpt", "register_setup_paths.rpt", "hold_paths.rpt"))
    times = timing(texts["timing_summary.rpt"])
    require(overall[0]["slack_ns"] == times["wns_ns"] and hold[0]["slack_ns"] == times["whs_ns"], "Path and timing summaries disagree")
    log_status = {}
    for path in sorted(directory.glob("vivado*.log")):
        text = path.read_text()
        complete = re.search(r"^Implementation reports written to .*?/implementation/" + variant + r"\s*$", text, re.MULTILINE)
        log_status[path.name] = ("completed_implementation" if complete else
                                 "refused_retry" if "Implementation already attempted in " in text else "no_completion_record")
    return {"identity": info, "resources": resources(texts["utilization.rpt"]), "timing": times,
            "routing": route, "setup_paths": overall, "register_setup_paths": internal, "hold_paths": hold,
            "check_timing": {key: int(count) for key, count in re.findall(r"^\d+\. checking (\w+) \((\d+)\)", texts["check_timing.rpt"], re.MULTILINE)},
            "drc": rules(texts["drc.rpt"]), "methodology": rules(texts["methodology.rpt"]),
            "launch_logs": log_status,
            "completed_implementation_log_available": "completed_implementation" in log_status.values(),
            "input_checkpoint_hash_independently_verified": False}


def load_reports(directory):
    runs = {variant: read_run(directory / variant, variant) for variant in VARIANTS}
    commands = [constraint_commands((directory / variant / "implemented_constraints.xdc").read_text()) for variant in VARIANTS]
    require(commands[0] == commands[1], "Implemented constraints differ between variants")
    require(commands[0].count("set_false_path -from [get_ports rst_ni]") == 1 and
            sum(line.startswith("set_false_path") for line in commands[0]) == 1,
            "Review unexpected timing exceptions")
    drivers = [(directory / variant / "implementation_driver.tcl").read_text().split("set result [catch {", 1)[1]
               for variant in VARIANTS]
    require(drivers[0] == drivers[1], "Physical implementation commands differ")
    source_manifest = json.loads((directory / "baseline/synthesis_source_manifest.json").read_text())
    require(source_manifest == json.loads((ROOT / "output/fpga/baseline/source_manifest.json").read_text()), "Baseline manifest mismatch")
    replacements = set(source_manifest["replaced_files"])
    expected = {"cve2/rtl/cve2_pkg.sv", "cve2/rtl/cve2_decoder.sv", "cve2/rtl/cve2_alu.sv"}
    require(replacements == expected, "Unexpected baseline replacement files")
    extended_sources = fields((directory / "extended/synthesis_run_info.txt").read_text())
    require(source_manifest["flow_reference_revision"] == extended_sources["revision"], "Baseline and extended source reference mismatch")
    changed = subprocess.check_output(["git", "diff", "--name-only", source_manifest["rtl_revision"],
                                       source_manifest["flow_reference_revision"], "--", "cve2"], cwd=ROOT)
    require(set(changed.decode().splitlines()) == expected, "Core changes exceed the three extension files")
    for name, expected in source_manifest["file_sha256"].items():
        revision = source_manifest["rtl_revision"] if name in replacements else source_manifest["flow_reference_revision"]
        original = subprocess.check_output(["git", "show", revision + ":" + name], cwd=ROOT)
        require(sha256(original) == expected, "Source hash mismatch: " + name)
    gaps = [variant + " completed-run launch log is absent from this archive" for variant in VARIANTS
            if not runs[variant]["completed_implementation_log_available"]]
    return {"schema_version": 1, "scope": "routed OOC module analysis; incomplete interface and external clock context",
            "runs": runs, "physical_flow_body_sha256": sha256(drivers[0].encode()),
            "normalized_constraints_sha256": sha256("\n".join(commands[0]).encode()),
            "baseline_source_files_verified": len(source_manifest["file_sha256"]),
            "limitations": ["No complete clock or interface timing closure", *gaps,
                            "Recorded input DCP hashes cannot be independently checked without the DCP files",
                            "Constraints 18-8777 cause and effect remain unresolved",
                            "No implemented Fmax, power or board-operation result"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reports", type=Path, default=ROOT / "output/fpga/implementation")
    args = parser.parse_args()
    result = load_reports(args.reports)
    result_path = args.reports / "implementation_results.json"
    result_path.write_text(json.dumps(result, indent=2) + "\n")
    csv_path = args.reports / "implementation_metrics.csv"
    with csv_path.open("w", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["variant", "metric", "value", "unit"])
        for variant, run in result["runs"].items():
            for section in ("resources", "timing", "routing"):
                for key, value in run[section].items():
                    writer.writerow([variant, section + "." + key, value, "ns" if key.endswith("_ns") else "count"])
            for key, value in run["register_setup_paths"][0].items():
                if type(value) in (int, float):
                    writer.writerow([variant, "worst_register_setup." + key, value, "ns" if key.endswith("_ns") else "count"])
    manifest = {"schema_version": 1, "generator": str(Path(__file__).relative_to(ROOT)),
                "generator_sha256": sha256(Path(__file__).read_bytes()),
                "source_file_sha256": {str(path.relative_to(args.reports)): sha256(path.read_bytes())
                                       for variant in VARIANTS for path in sorted((args.reports / variant).iterdir()) if path.is_file()},
                "synthesis_reference_sha256": {str(path.relative_to(ROOT)): sha256(path.read_bytes())
                                                for variant in VARIANTS for path in (
                                                    ROOT / "output/fpga" / variant / "run_info.txt",
                                                    ROOT / "output/fpga" / variant / "vivado.log")},
                "artifact_sha256": {path.name: sha256(path.read_bytes()) for path in (result_path, csv_path)}}
    (args.reports / "review_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    for variant, run in result["runs"].items():
        print(f"{variant}: {run['resources']['total_luts']} LUTs, setup {run['timing']['wns_ns']:+.3f} ns, "
              f"register setup {run['register_setup_paths'][0]['slack_ns']:+.3f} ns; "
              f"completed launch log available: {run['completed_implementation_log_available']}")
    print("Wrote implementation_results.json, implementation_metrics.csv and review_manifest.json")


if __name__ == "__main__":
    main()
