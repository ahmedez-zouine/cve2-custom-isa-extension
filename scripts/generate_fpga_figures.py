#!/usr/bin/env python3
"""Plot original/isqrt FPGA synthesis reports and export the parsed evidence."""

import argparse
import csv
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / "tmp/matplotlib"))
os.environ.setdefault("XDG_CACHE_HOME", str(ROOT / "tmp/figure_cache"))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator, StrMethodFormatter

WIDTH = 7.16
INK = "#17324D"
MUTED = "#65788B"
BLUE = "#167D9A"
ORANGE = "#E87932"
GRID = "#DCE5EC"
COLORS = [BLUE, ORANGE]
LABELS = ["Original core", "With isqrt"]
RESOURCE_FIELDS = ("total_luts", "logic_luts", "lutrams", "srls", "ffs",
                   "ramb36", "ramb18", "dsps")
TIMING_FIELDS = ("wns_ns", "tns_ns", "setup_failing_endpoints", "setup_total_endpoints",
                 "whs_ns", "ths_ns", "hold_failing_endpoints", "hold_total_endpoints",
                 "wpws_ns", "tpws_ns", "pulse_failing_endpoints", "pulse_total_endpoints")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def header(text, field):
    match = re.search(rf"^\| {re.escape(field)}\s*:\s*(.*?)\s*$", text, re.MULTILINE)
    require(match is not None, f"Missing report header: {field}")
    return match.group(1)


def parse_resources(text):
    rows = re.findall(r"^\| cve2_fpga_top\s*\|\s*\(top\)\s*\|(.*)$", text, re.MULTILINE)
    require(len(rows) == 1, "Expected one cve2_fpga_top utilization row")
    cells = [cell.strip() for cell in rows[0].strip().strip("|").split("|")]
    require(len(cells) == len(RESOURCE_FIELDS) and all(cell.isdigit() for cell in cells),
            "Unexpected utilization columns or nonnumeric count")
    return dict(zip(RESOURCE_FIELDS, map(int, cells)))


def parse_timing(text):
    section = text.split("| Design Timing Summary", 1)
    require(len(section) == 2, "Missing Design Timing Summary")
    rows = []
    for line in section[1].split("| Clock Summary", 1)[0].splitlines():
        cells = line.split()
        if len(cells) == len(TIMING_FIELDS):
            try:
                values = [float(cell) for cell in cells]
            except ValueError:
                continue
            require(all(math.isfinite(value) for value in values), "Nonfinite timing value")
            rows.append(values)
    require(len(rows) == 1, "Expected one complete design timing row")
    result = dict(zip(TIMING_FIELDS, rows[0]))
    for name in TIMING_FIELDS:
        if name.endswith("endpoints"):
            require(result[name] >= 0 and result[name].is_integer(), "Invalid endpoint count")
            result[name] = int(result[name])
    for check, slack in [("setup", "wns_ns"), ("hold", "whs_ns"), ("pulse", "wpws_ns")]:
        count = result[f"{check}_failing_endpoints"]
        require(count <= result[f"{check}_total_endpoints"], "Failing count exceeds total")
        require((result[slack] < 0) == (count > 0), f"Inconsistent {check} slack and failures")
    failed = any(result[f"{check}_failing_endpoints"] for check in ("setup", "hold", "pulse"))
    status = "Timing constraints are not met." if failed else "All user specified timing constraints are met."
    require(status in text, "Timing summary status disagrees with its numeric results")
    return result


def read_run(directory, variant):
    required = ["run_info.txt", "utilization.rpt", "timing_summary.rpt", "clocks.rpt",
                "check_timing.rpt", "vivado.log"]
    files = {name: directory / name for name in required}
    texts = {name: path.read_text() for name, path in files.items()}
    info = dict(line.split(": ", 1) for line in texts["run_info.txt"].splitlines() if ": " in line)
    require(info["scope"] == f"{variant} core, out-of-context, post-synthesis estimates",
            f"Unexpected design scope in {directory}")
    log = texts["vivado.log"]
    require("synth_design completed successfully" in log, f"No successful synthesis log: {directory}")
    require("0 Critical Warnings and 0 Errors encountered." in log,
            f"Review synthesis errors or critical warnings first: {directory}")
    require(f"/build/fpga/{variant}" in log and f"-tclargs {info['part']}" in log,
            "Log target does not match metadata")
    period = float(info["clock_period_ns"])
    require(math.isfinite(period) and period > 0, "Invalid clock period")
    for name in ("utilization.rpt", "timing_summary.rpt", "clocks.rpt", "check_timing.rpt"):
        text = texts[name]
        require(header(text, "Design") == "cve2_fpga_top", f"Unexpected top: {name}")
        require(header(text, "Design State") == "Synthesized", f"Not post-synthesis: {name}")
        require(f"v.{info['tool']} " in header(text, "Tool Version"), "Tool version mismatch")
    require(header(texts["utilization.rpt"], "Device") == info["part"], "FPGA part mismatch")
    device, grade = info["part"].removeprefix("xc").rsplit("-", 1)
    for name in ("timing_summary.rpt", "clocks.rpt", "check_timing.rpt"):
        require(header(texts[name], "Device").replace("-", "") == device,
                f"FPGA device mismatch: {name}")
        require(header(texts[name], "Speed File").split()[0] == f"-{grade}",
                f"Speed grade mismatch: {name}")
    clock = re.search(r"^core_clk\s+([\d.]+)\s+\{", texts["clocks.rpt"], re.MULTILINE)
    timing_clock = re.search(r"^core_clk\s+\{[^}]+\}\s+([\d.]+)\s+", texts["timing_summary.rpt"], re.MULTILINE)
    require(clock and timing_clock and float(clock.group(1)) == float(timing_clock.group(1)) == period,
            "Clock report and metadata disagree")
    carry = re.search(r"^\|\d+\s*\|CARRY4\s*\|\s*(\d+)\s*\|", log, re.MULTILINE)
    require(carry is not None, "Missing CARRY4 primitive count")
    resources = parse_resources(texts["utilization.rpt"])
    multiplier = re.search(r"^\|[^|]+\|\s*cve2_multdiv_fast\s*\|(.*)$",
                           texts["utilization.rpt"], re.MULTILINE)
    require(multiplier and int(multiplier.group(1).strip().strip("|").split("|")[-1]) == resources["dsps"],
            "Review DSP attribution: total DSP use differs from the existing multiplier")
    resources["carry4"] = int(carry.group(1))
    identity = {key: info[key] for key in ("tool", "part", "scope", "revision")}
    if variant == "baseline":
        identity.update({key: info[key] for key in ("rtl_revision", "flow_reference_revision")})
    identity.update(clock_period_ns=period, report_date=header(texts["utilization.rpt"], "Date"))
    return {"identity": identity, "resources": resources,
            "timing": parse_timing(texts["timing_summary.rpt"]),
            "clock_context_warning": "HD.CLK_SRC" in log}, files


def load_reports(report_dir):
    runs, sources = {}, {}
    for variant in ("baseline", "extended"):
        runs[variant], files = read_run(report_dir / variant, variant)
        sources.update({f"{variant}/{name}": path for name, path in files.items()})
    baseline, extended = runs["baseline"], runs["extended"]
    for key in ("tool", "part", "clock_period_ns"):
        require(baseline["identity"][key] == extended["identity"][key], f"Run mismatch: {key}")
    manifest_path = report_dir / "baseline/source_manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for key in ("rtl_revision", "flow_reference_revision"):
        require(manifest[key] == baseline["identity"][key], f"Baseline provenance mismatch: {key}")
    require(manifest["flow_reference_revision"] == extended["identity"]["revision"],
            "Baseline flow reference differs from the extended source revision")
    expected_files = {"cve2/rtl/cve2_pkg.sv", "cve2/rtl/cve2_decoder.sv", "cve2/rtl/cve2_alu.sv"}
    require(set(manifest["replaced_files"]) == expected_files, "Unexpected baseline replacement files")
    changed = subprocess.check_output(["git", "diff", "--name-only", manifest["rtl_revision"],
                                      manifest["flow_reference_revision"], "--", "cve2"], cwd=ROOT)
    require(set(changed.decode().splitlines()) == expected_files, "Core differs outside the extension files")
    for name, expected in manifest["file_sha256"].items():
        revision = manifest["rtl_revision"] if name in expected_files else manifest["flow_reference_revision"]
        content = subprocess.check_output(["git", "show", f"{revision}:{name}"], cwd=ROOT)
        require(hashlib.sha256(content).hexdigest() == expected, f"Baseline source hash mismatch: {name}")
    sources["baseline/source_manifest.json"] = manifest_path
    sources["baseline/source_info.txt"] = report_dir / "baseline/source_info.txt"
    sources["baseline/synth_driver.tcl"] = report_dir / "baseline/synth_driver.tcl"
    return {"schema": 1, "scope": "Whole wrapper and core; OOC post-synthesis estimates",
            "runs": runs, "verified_source_files": len(manifest["file_sha256"]),
            "sources": {name: {"path": os.path.relpath(path, ROOT), "sha256": digest(path)}
                        for name, path in sources.items()}}, sources


def check_status(evidence, check):
    states = ["fails" if evidence["runs"][variant]["timing"][f"{check}_failing_endpoints"] else "passes"
              for variant in ("baseline", "extended")]
    return f"Original core {states[0]} {check}; with isqrt {states[1]} {check}."


def style_axis(ax, horizontal=False):
    ax.set_axisbelow(True)
    (ax.xaxis if horizontal else ax.yaxis).grid(True, color=GRID, linewidth=0.8)
    ax.tick_params(axis="both", colors=MUTED, labelsize=8, length=0, pad=5)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)


def title(fig, text, identity):
    fig.text(0.5, 0.965, text, ha="center", va="top", fontsize=12, fontweight="bold", color=INK)
    fig.text(0.5, 0.89, f"Vivado {identity['tool']}  |  {identity['part']}  |  OOC post-synthesis",
             ha="center", fontsize=8, color=MUTED)


def resource_figure(evidence):
    runs = evidence["runs"]
    original, extended = [runs[name]["resources"] for name in ("baseline", "extended")]
    fig = plt.figure(figsize=(WIDTH, 3.85))
    title(fig, "Hardware cost of the ISQRT extension", runs["baseline"]["identity"])
    for bounds, field, name in [([0.095, 0.31, 0.37, 0.40], "total_luts", "(a) Total LUTs"),
                                 ([0.585, 0.31, 0.37, 0.40], "ffs", "(b) Flip-flops")]:
        ax = fig.add_axes(bounds)
        values = [original[field], extended[field]]
        bars = ax.bar([0, 1], values, color=COLORS, width=0.55, zorder=3)
        ax.bar_label(bars, labels=[f"{value:,}" for value in values], padding=5,
                     fontsize=9, color=INK, fontweight="bold")
        ax.set(xticks=[0, 1], xticklabels=LABELS, ylim=(0, max(values) * 1.24), ylabel="Count")
        ax.yaxis.set_major_locator(MaxNLocator(nbins=4, integer=True))
        ax.yaxis.set_major_formatter(StrMethodFormatter("{x:,.0f}"))
        ax.set_title(name, fontsize=9, color=INK, pad=30, loc="left", fontweight="bold")
        delta = values[1] - values[0]
        change = f"{delta:+,}" + (f" LUTs ({100 * delta / values[0]:+.1f}%)" if field == "total_luts" else " FF")
        ax.text(0.5, 1.12, change, transform=ax.transAxes, ha="center", fontsize=9, color=ORANGE)
        style_axis(ax)
    fig.text(0.5, 0.17,
             f"Original / with isqrt:  DSP {original['dsps']} / {extended['dsps']}"
             f"     BRAM36 {original['ramb36']} / {extended['ramb36']}"
             f"     BRAM18 {original['ramb18']} / {extended['ramb18']}"
             f"     CARRY4 {original['carry4']} / {extended['carry4']}",
             ha="center", fontsize=8, color=INK)
    fig.text(0.5, 0.085, "Whole processor and wrapper; DSP use belongs to the existing multiplier.",
             ha="center", fontsize=7.5, color=MUTED)
    fig.text(0.5, 0.035, "Source: saved utilization reports and synthesis primitive tables. Panel scales differ.",
             ha="center", fontsize=7, color=MUTED)
    return fig


def timing_figure(evidence):
    runs = evidence["runs"]
    original, extended = [runs[name]["timing"] for name in ("baseline", "extended")]
    period = runs["baseline"]["identity"]["clock_period_ns"]
    fig = plt.figure(figsize=(WIDTH, 4.05))
    title(fig, f"Timing estimates at {1000 / period:g} MHz ({period:g} ns)", runs["baseline"]["identity"])
    panels = [([0.17, 0.39, 0.37, 0.32], "wns_ns", "setup", "(a) Worst setup slack"),
              ([0.70, 0.39, 0.26, 0.32], "whs_ns", "hold", "(b) Worst hold slack")]
    for bounds, field, kind, name in panels:
        ax = fig.add_axes(bounds)
        values = [original[field], extended[field]]
        extent = max(abs(value) for value in values) or 1.0
        left, right = min(0, *values) - extent * 0.16, max(0, *values) + extent * 0.31
        ax.barh([1, 0], values, color=COLORS, height=0.42, zorder=3)
        ax.axvline(0, color=INK, linewidth=1, linestyle=(0, (3, 3)), zorder=4)
        for y, value in zip([1, 0], values):
            x = value + extent * 0.04 if value >= 0 else extent * 0.04
            ax.text(x, y, f"{value:+.3f}", ha="left", va="center", color=INK, fontsize=8.5,
                    fontweight="bold")
        ax.set(xlim=(left, right), ylim=(-0.55, 1.55), yticks=[1, 0], yticklabels=LABELS,
               xlabel="Slack (ns)")
        ax.xaxis.set_major_locator(MaxNLocator(nbins=4))
        ax.set_title(name, fontsize=9, color=INK, pad=15, loc="left", fontweight="bold")
        style_axis(ax, horizontal=True)
        failures = [item[f"{kind}_failing_endpoints"] for item in (original, extended)]
        ax.text(0.5, -0.55, f"Failing endpoints: {failures[0]} / {failures[1]}",
                transform=ax.transAxes, ha="center", fontsize=7.5, color=INK)
    fig.text(0.5, 0.17, "Slack >= 0 meets that check; negative slack is a violation.",
             ha="center", fontsize=8, color=INK)
    fig.text(0.5, 0.10, check_status(evidence, "hold"),
             ha="center", fontsize=8, color=INK, fontweight="bold")
    warning = any(run["clock_context_warning"] for run in runs.values())
    limitation = "HD.CLK_SRC unset; routing and clock delays are estimates." if warning else "Routing delays are estimates."
    fig.text(0.5, 0.035, limitation + " No implemented Fmax is claimed.",
             ha="center", fontsize=7, color=MUTED)
    return fig


def export_data(evidence, out_dir):
    data_path = out_dir / "fpga_results.json"
    data_path.write_text(json.dumps(evidence, indent=2) + "\n")
    with (out_dir / "fpga_metrics.csv").open("w", newline="") as stream:
        writer = csv.writer(stream, lineterminator="\n")
        writer.writerow(["metric", "unit", "baseline", "extended", "difference"])
        for section in ("resources", "timing"):
            values = evidence["runs"]["baseline"][section]
            for key, original in values.items():
                extended = evidence["runs"]["extended"][section][key]
                difference = extended - original
                writer.writerow([key, "ns" if key.endswith("_ns") else "count", original, extended,
                                 round(difference, 6) if isinstance(difference, float) else difference])
    return data_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report-dir", type=Path, default=ROOT / "output/fpga")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "output/pdf")
    parser.add_argument("--render-pdfs", action="store_true")
    args = parser.parse_args()
    try:
        evidence, _ = load_reports(args.report_dir)
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        parser.error(f"Cannot plot FPGA evidence: {error}. Restore matching successful reports and Git history.")
    plt.rcParams.update({"font.family": "sans-serif", "font.sans-serif": ["Arial", "DejaVu Sans"],
                         "font.size": 8.5, "text.color": INK, "axes.labelcolor": INK,
                         "pdf.fonttype": 42, "ps.fonttype": 42, "svg.fonttype": "path",
                         "svg.hashsalt": "cve2-fpga", "axes.unicode_minus": False})
    captions = {
        "fig05_fpga_resources": (
            "Whole-design FPGA resource utilization for the original CVE2 and the isqrt extension, "
            "parsed from Vivado out-of-context post-synthesis reports. Total LUTs and FFs use the "
            "top-level utilization row; CARRY4 counts come from the synthesis primitive table. "
            "Both designs include the same wrapper and processor configuration. Panel scales differ. "
            "The DSP belongs to the existing multiplier; no implemented area is claimed."),
        "fig06_fpga_timing": (
            "Worst setup and hold slack parsed from the complete design timing summaries for both "
            "cores at the same clock target. Nonnegative slack meets the corresponding check. "
            + check_status(evidence, "setup") + " " + check_status(evidence, "hold") + " " +
            "These are out-of-context post-synthesis estimates with an unset HD.CLK_SRC clock "
            "context. They do not establish routed timing closure or implemented Fmax.")}
    figures = {"fig05_fpga_resources": resource_figure(evidence),
               "fig06_fpga_timing": timing_figure(evidence)}
    args.out_dir.mkdir(parents=True, exist_ok=True)
    data_path = export_data(evidence, args.out_dir)
    artifacts = {}
    for name, fig in figures.items():
        for extension in ("pdf", "svg", "png"):
            path = args.out_dir / f"{name}.{extension}"
            metadata = {"Title": captions[name], "CreationDate": None, "ModDate": None} if extension == "pdf" else None
            if extension == "svg":
                metadata = {"Date": None, "Description": captions[name]}
            fig.savefig(path, dpi=600, metadata=metadata)
            if extension == "svg":
                path.write_text("\n".join(line.rstrip() for line in path.read_text().splitlines()) + "\n")
            artifacts[path.name] = digest(path)
        plt.close(fig)
        if args.render_pdfs:
            import pymupdf
            path = args.out_dir / f"{name}_pdf_preview.png"
            with pymupdf.open(args.out_dir / f"{name}.pdf") as document:
                document[0].get_pixmap(dpi=160).save(path)
            artifacts[path.name] = digest(path)
        print(f"Generated {name}: PDF, SVG, PNG")
    tex = ["% Add \\usepackage{graphicx}. Paths assume compilation from the repository root.",
           "% Full-width 7.16-inch figures. For an IEEE two-column template use figure*."]
    for name, caption in captions.items():
        path = Path(os.path.relpath(args.out_dir / f"{name}.pdf", ROOT)).as_posix()
        escaped_caption = caption.replace("_", r"\_")
        tex.extend([r"\begin{figure}[t]", r"  \centering",
                    rf"  \includegraphics[width=\linewidth]{{{path}}}",
                    rf"  \caption{{{escaped_caption}}}",
                    rf"  \label{{fig:{name}}}", r"\end{figure}", ""])
    (args.out_dir / "include_fpga_figures.tex").write_text("\n".join(tex).rstrip() + "\n")
    for name in ("fpga_results.json", "fpga_metrics.csv", "include_fpga_figures.tex"):
        artifacts[name] = digest(args.out_dir / name)
    manifest = {"schema": 1, "generator_sha256": digest(Path(__file__)),
                "matplotlib": matplotlib.__version__, "width_inches": WIDTH,
                "data_file": data_path.name, "data_sha256": digest(data_path),
                "sources": evidence["sources"], "artifact_sha256": artifacts,
                "captions": captions, "limitations": ["OOC post-synthesis estimates",
                    check_status(evidence, "hold"), "No routed Fmax or power result"]}
    (args.out_dir / "fpga_figure_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
