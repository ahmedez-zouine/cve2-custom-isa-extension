#!/usr/bin/env python3
"""Estimate OOC power on the audited Vivado host without changing the routed designs."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import platform
import re
import shutil
import subprocess

from audit_fpga_context import digest, reviewed_data
from summarize_fpga_implementation import ROOT, VARIANTS, header, require, resources, timing

REVIEW = ROOT / "output/fpga/implementation"
ASSUMPTIONS = {
    "model": "vectorless; generic activity, not an executed instruction workload",
    "clock_period_ns": 20.0, "assumed_clock_mhz": 50.0,
    "default_input_toggle_percent": 12.5, "default_static_probability": 0.5,
    "data_and_handshake_input_signal_rate_mtr_s": 6.25,
    "held_high": ["rst_ni", "fetch_enable_i"],
    "held_low": ["irq_*", "debug_req_i", "instr_err_i", "data_err_i"],
    "internal_activity": "Vivado vectorless propagation; no forced register/LUT toggle rates",
    "process": "typical", "temperature_grade": "commercial",
    "junction_temperature_c": 25, "ambient_temperature_c": 25,
    "voltage": "reset to device/tool nominal defaults; review operating_conditions.rpt",
    "thermal": "fixed junction temperature; remaining thermal settings reset to tool defaults",
    "scope": "OOC mapped module in the selected device; physical I/O and board context incomplete",
    "timing": "Both original routed timing summaries fail at the assumed 50 MHz; not an operating-frequency claim",
}


def validate_audit(audit, root, review, variants):
    require(audit["generator_sha256"] == digest(ROOT / "scripts/audit_fpga_context.py"),
            "Audit generator changed; rerun the context audit")
    require(audit["review_manifest_sha256"] == digest(review / "review_manifest.json"),
            "Audit refers to different reviewed evidence")
    require(audit["checkpoint_audit_status"] == "inputs_matched_routes_fingerprinted",
            "Run the checkpoint audit on the Vivado host first")
    checkpoints = {}
    for variant in variants:
        run = audit["runs"][variant]
        require(run["part"] == "xc7a35tcsg324-1" and run["clock_period_ns"] == 20.0,
                "Unexpected audited target: " + variant)
        for kind, relative, status in (
                ("synthesis_checkpoint", "build/fpga/" + variant + "/post_synth.dcp", "matched"),
                ("routed_checkpoint", "build/fpga/implementation/" + variant + "/post_route.dcp", "fingerprinted_only")):
            record = run[kind]
            path = root / relative
            require(record["status"] == status and Path(record["path"]).resolve() == path.resolve(),
                    "Checkpoint status/path differs from audit: " + variant + "/" + kind)
            require(path.is_file() and digest(path) == record["sha256"],
                    "Checkpoint changed or missing since audit: " + str(path))
            if kind == "synthesis_checkpoint":
                require(record["sha256"] == record["expected_sha256"], "Synthesis checkpoint mismatch")
            else:
                checkpoints[variant] = path
    return checkpoints


def routing(text):
    return {key.replace(" ", "_"): int(value) for key, value in re.findall(
        r"# of ([a-z ]+)\.+\s*:\s*(\d+)\s*:", text)}


def verify_reopened(directory, expected):
    texts = {name: (directory / ("reopened_" + name)).read_text()
             for name in ("utilization.rpt", "route_status.rpt", "timing_summary.rpt")}
    for name in ("utilization.rpt", "timing_summary.rpt"):
        require(header(texts[name], "Design") == "cve2_fpga_top", "Reopened top mismatch")
        require(header(texts[name], "Design State") in ("Routed", "Fully Routed"), "Checkpoint is not routed")
        require("v.2024.2 " in header(texts[name], "Tool Version") and
                "Build 5239630" in header(texts[name], "Tool Version"), "Vivado build differs from the recorded pair")
    require(resources(texts["utilization.rpt"]) == expected["resources"], "Reopened resource counts differ")
    require(routing(texts["route_status.rpt"]) == expected["routing"], "Reopened routing counts differ")
    observed = timing(texts["timing_summary.rpt"])
    for key, value in expected["timing"].items():
        tolerance = 0 if key.endswith("endpoints") else 0.002
        require(abs(observed[key] - value) <= tolerance, "Reopened timing differs: " + key)
    return {"resources": "matched", "routing": "matched", "timing": "matched within 0.002 ns rounding tolerance"}


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def run_variant(variant, checkpoint, audit_path, out, expected, vivado):
    out.mkdir(parents=True, exist_ok=False)
    driver = out / "power_driver.tcl"
    shutil.copyfile(ROOT / "fpga/power.tcl", driver)
    shutil.copyfile(audit_path, out / "context_audit.json")
    shutil.copyfile(REVIEW / "review_manifest.json", out / "implementation_review_manifest.json")
    command = [vivado, "-mode", "batch", "-source", str(driver), "-log", str(out / "vivado.log"),
               "-journal", str(out / "vivado.jou"), "-tclargs", str(checkpoint), str(out)]
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    receipt = {"schema_version": 1, "variant": variant, "status": "started",
               "started_utc": datetime.now(timezone.utc).isoformat(), "execution_host": platform.node(),
               "revision": revision, "command": command, "checkpoint": str(checkpoint),
               "checkpoint_sha256": digest(checkpoint), "audit_sha256": digest(audit_path),
               "runner_sha256": digest(Path(__file__)), "driver_sha256": digest(driver),
               "assumptions": ASSUMPTIONS,
               "limitations": ["Routed hash is a current fingerprint, not a comparison with an original routed hash",
                               "Missing extended original completion log remains an evidence gap",
                               "Incomplete external clock/interface context; Constraints 18-8777 unresolved",
                               "No measured power, validated workload activity, energy per instruction or timing closure claim"]}
    save_json(out / "power_run.json", receipt)
    try:
        print("Running " + variant + ": " + str(out), flush=True)
        subprocess.run(command, cwd=out, check=True)
        log = (out / "vivado.log").read_text(errors="replace")
        require(not re.search(r"^ERROR:", log, re.MULTILINE), "Vivado log contains an error")
        require("\nPower reports generated for review in " + str(out) in log, "Power completion line missing")
        receipt["reopened_report_crosscheck"] = verify_reopened(out, expected)
        require(digest(checkpoint) == receipt["checkpoint_sha256"], "Input checkpoint changed during analysis")
        for name in ("power.rpt", "operating_conditions.rpt", "input_activity.rpt", "register_activity.rpt",
                     "lut_activity.rpt", "clocks.rpt", "power_constraints.xdc"):
            require((out / name).is_file() and (out / name).stat().st_size > 0, "Missing power evidence: " + name)
        receipt["status"] = "reports_generated_pending_power_review"
    except Exception as error:
        receipt.update(status="failed", error=str(error))
        raise
    finally:
        receipt["finished_utc"] = datetime.now(timezone.utc).isoformat()
        receipt["artifact_sha256"] = {path.name: digest(path) for path in sorted(out.iterdir())
                                      if path.is_file() and path.name != "power_run.json"}
        save_json(out / "power_run.json", receipt)
    print(variant + ": reopened metrics match; review power, confidence, operating conditions and activity before acceptance.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", type=Path, default=ROOT / "output/fpga/context_audit/ubuntu/audit.json")
    parser.add_argument("--variant", choices=(*VARIANTS, "both"), default="both")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "build/fpga/power")
    parser.add_argument("--vivado", default="vivado")
    args = parser.parse_args()
    variants = VARIANTS if args.variant == "both" else (args.variant,)
    data = reviewed_data(REVIEW)
    audit_path = args.audit.resolve()
    audit = json.loads(audit_path.read_text())
    checkpoints = validate_audit(audit, ROOT, REVIEW, variants)
    for variant in variants:
        require(audit["runs"][variant]["synthesis_checkpoint"]["sha256"] ==
                data["runs"][variant]["identity"]["checkpoint_sha256"], "Synthesis hash differs from archive")
        require(not (args.out_dir / variant).exists(), "Output already exists; preserve it and choose --out-dir: " + str(args.out_dir / variant))
    executable = shutil.which(args.vivado)
    require(executable is not None, "Vivado not found; source its settings64.sh first")
    for variant in variants:
        run_variant(variant, checkpoints[variant], audit_path, (args.out_dir / variant).resolve(), data["runs"][variant], executable)
    print("Power reports generated. Values and confidence are pending review; no power figures have been accepted yet.")


if __name__ == "__main__":
    main()
