#!/usr/bin/env python3
"""Generate paper figures from checked simulation results and reviewed RTL structure."""
import argparse
import csv
import json
import os
from pathlib import Path
from collect_simulation_results import digest, parse_test_log, require, source_hashes

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / "tmp/matplotlib"))
os.environ.setdefault("XDG_CACHE_HOME", str(ROOT / "tmp/figure_cache"))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyArrowPatch

INK = "#222222"
GRAY = "#eeeeee"
WIDTH = 7.16
CAPTIONS = {
    "fig01_pipeline": (
        "Integration of the unsigned integer square-root instruction in the two-stage "
        "CVE2 pipeline. The shaded block denotes the added datapath within the existing ALU. "
        "The existing register-file write port captures the selected result at the "
        "closing clock edge. Dashed arrows denote control; solid arrows denote data. "
        "Only the relevant instruction and data paths are shown."
    ),
    "fig02_recurrence": (
        "Unrolled restoring square-root recurrence. Each stage consumes two input "
        "bits and produces one root bit. All 16 stages are combinational; there are "
        "no registers between stages. The worked example shows the final three "
        "stages for an input of 20; the preceding stages process zero pairs. "
        "The 16-bit root is zero-extended onto the 32-bit ALU result bus."
    ),
    "fig04_benchmark": (
        "Benchmark workload averages printed by the simulated software and hardware tests. "
        "Both workloads use the same seeded input sequence and produce matching checksums. "
        "The reported integer-rounded averages include loop and random-number-generation "
        "overhead; they are not individual instruction latencies or physical execution times."
    ),
}


def canvas(height, ymax):
    fig = plt.figure(figsize=(WIDTH, height))
    ax = fig.add_axes([0.025, 0.035, 0.95, 0.93])
    ax.set(xlim=(0, 10), ylim=(0, ymax))
    ax.axis("off")
    return fig, ax


def label(ax, x, y, text, **kwargs):
    return ax.text(x, y, text, ha="center", va="center", color=INK, **kwargs)


def box(ax, x, y, w, h, text, shaded=False):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=GRAY if shaded else "white",
                           edgecolor=INK, linewidth=0.9))
    label(ax, x + w / 2, y + h / 2, text, linespacing=1.4)


def arrow(ax, points, control=False):
    style = "--" if control else "-"
    if len(points) > 2:
        ax.plot(*zip(*points[:-1]), color=INK, lw=0.85, ls=style)
    ax.add_patch(FancyArrowPatch(points[-2], points[-1], arrowstyle="-|>",
                                mutation_scale=9, lw=0.85, color=INK,
                                linestyle=style, shrinkA=0, shrinkB=0))


def pipeline():
    fig, ax = canvas(3.7, 5)
    label(ax, 1.35, 4.75, "Stage 1: IF", fontweight="bold")
    label(ax, 6.5, 4.75, "Stage 2: ID / EX", fontweight="bold")
    ax.plot([2.8, 2.8], [0.8, 4.5], color="#777777", lw=0.7, ls=":")
    box(ax, 0.1, 2.05, 1.2, 1.25, "PC / fetch\nbuffer")
    box(ax, 1.7, 2.05, 1.0, 1.25, "IF/ID\nregisters")
    arrow(ax, [(1.3, 2.675), (1.7, 2.675)])
    box(ax, 3.35, 3.3, 2.15, 0.95, "Decoder\nreserved-field checks")
    box(ax, 7.7, 3.3, 2.15, 0.95, "Controller\nillegal-instruction trap")
    arrow(ax, [(2.7, 2.675), (3.0, 2.675), (3.0, 3.775), (3.35, 3.775)])
    label(ax, 2.95, 4.35, "instruction", fontsize=9)
    arrow(ax, [(5.5, 3.775), (7.7, 3.775)], control=True)
    label(ax, 6.6, 4.08, "illegal encoding", fontsize=9)
    box(ax, 3.35, 1.15, 2.15, 1.15, "Register file\nread rs1; write rd")
    box(ax, 6.0, 1.15, 1.65, 1.15, "ALU: isqrt path\n16 stages", shaded=True)
    box(ax, 8.15, 1.15, 1.7, 1.15, "Result /\nwriteback muxes")
    arrow(ax, [(4.1, 3.3), (4.1, 2.3)], control=True)
    label(ax, 3.55, 2.8, "register\ncontrol", fontsize=9)
    arrow(ax, [(5.1, 3.3), (5.1, 2.8), (6.825, 2.8), (6.825, 2.3)], control=True)
    label(ax, 6.6, 3.08, "ALU_ISQRT", fontsize=9)
    arrow(ax, [(5.5, 1.725), (6.0, 1.725)])
    label(ax, 5.75, 2.0, "A", fontsize=9)
    arrow(ax, [(7.65, 1.725), (8.15, 1.725)])
    arrow(ax, [(9.0, 1.15), (9.0, 0.6), (4.425, 0.6), (4.425, 1.15)])
    label(ax, 6.7, 0.25, "32-bit result; register update at the clock edge", fontsize=9)
    return fig


def recurrence(measured):
    operand = measured["input"]
    root, remainder, rounds = 0, 0, []
    for shift in range(30, -1, -2):
        pair = (operand >> shift) & 3
        candidate, trial = 4 * remainder + pair, 4 * root + 1
        bit = int(candidate >= trial)
        root, remainder = 2 * root + bit, candidate - trial if bit else candidate
        rounds.append([f"{pair:02b}", candidate, trial, root, remainder])
    require(root == measured["result"], "Recurrence example differs from the measured result")
    fig, ax = canvas(3.9, 5.4)
    label(ax, 5, 5.15, "32-bit radicand: 16 input pairs, processed most significant first",
          fontweight="bold")
    for x, title, pair in [(0.7, "Stage 0", "x[31:30]"),
                           (3.1, "Stage 1", "x[29:28]"),
                           (7.4, "Stage 15", "x[1:0]")]:
        box(ax, x, 3.65, 1.8, 0.75, title, shaded=True)
        label(ax, x + 0.9, 4.75, pair)
        arrow(ax, [(x + 0.9, 4.55), (x + 0.9, 4.4)])
    arrow(ax, [(0.1, 4.025), (0.7, 4.025)])
    label(ax, 0.5, 3.35, r"$Q_0=R_0=0$", fontsize=9)
    arrow(ax, [(2.5, 4.025), (3.1, 4.025)])
    arrow(ax, [(4.9, 4.025), (5.5, 4.025)])
    label(ax, 6.1, 4.025, r"$\cdots$", fontsize=16)
    arrow(ax, [(6.7, 4.025), (7.4, 4.025)])
    arrow(ax, [(9.2, 4.025), (9.8, 4.025)])
    label(ax, 9.35, 3.35, r"$Q_{16}=\lfloor\sqrt{x}\rfloor$", fontsize=9)
    ax.plot([0.2, 9.8], [3.0, 3.0], color="#888888", lw=0.7)
    label(ax, 2.55, 2.72, "One combinational stage", fontweight="bold")
    label(ax, 2.55, 2.22, r"$T=4R_k+b_k,\quad D=4Q_k+1$", fontsize=11)
    label(ax, 2.55, 1.62, r"If $T\geq D$:  $(Q_{k+1},R_{k+1})=(2Q_k+1,T-D)$")
    label(ax, 2.55, 1.06, r"If $T<D$:  $(Q_{k+1},R_{k+1})=(2Q_k,T)$")
    label(ax, 2.55, 0.42, r"Invariant: prefix $=Q_k^2+R_k$", fontsize=10)
    ax.plot([5.5, 5.5], [0.15, 2.8], color="#888888", lw=0.7)
    label(ax, 7.75, 2.72, f"Example: x = {operand}", fontweight="bold")
    columns = [6.05, 6.95, 7.85, 8.65, 9.45]
    for x, text in zip(columns, ["Pair", "T", "D", "Q next", "R next"]):
        label(ax, x, 2.2, text, fontsize=9)
    ax.plot([5.75, 9.85], [1.98, 1.98], color=INK, lw=0.6)
    for y, values in zip([1.72, 1.25, 0.78], rounds[-3:]):
        for x, text in zip(columns, values):
            label(ax, x, y, str(text))
    label(ax, 7.75, 0.25, rf"${root}^2+{remainder}={operand}$")
    return fig


def load_evidence(path):
    evidence = json.loads(path.read_text())
    require(evidence.get("schema") == 1 and evidence.get("status") == "passed",
            "Simulation collection has not passed; run collect_simulation_results.py")
    require(evidence["source_sha256"] == source_hashes(),
            "RTL/test sources changed since collection; rerun collect_simulation_results.py")
    artifacts = {}
    for name, item in evidence["artifacts"].items():
        artifact = path.parent / item["path"]
        require(artifact.is_file() and digest(artifact) == item["sha256"],
                f"Missing or changed simulation evidence: {artifact}")
        artifacts[name] = artifact
    for name, result in evidence["tests"].items():
        require(parse_test_log(artifacts[name + "_log"], name) == result,
                f"Results do not match simulator log: {name}")
    m = evidence["timing"]
    with artifacts["timing_csv"].open(newline="") as stream:
        rows = [{k: int(v) for k, v in row.items()} for row in csv.DictReader(stream)]
    start = next(i for i, r in enumerate(rows)
                 if r["time_ps"] == m["entry_ps"])
    end = next(i for i in range(start + 1, len(rows))
               if rows[i]["clk"] == 1 and rows[i - 1]["clk"] == 0)
    require(start > 0 and rows[start]["clk"] == 1 and rows[start - 1]["clk"] == 0,
            "Entry edge missing")
    for r in rows[start:end]:
        for key, value in {"valid": 1, "instruction": m["instruction"],
                           "operand_a": m["input"], "result": m["result"], "write_enable": 1,
                           "write_register": m["rd"], "write_data": m["result"], "ex_valid": 1,
                           "illegal": 0, "stall": 0}.items():
            require(r[key] == value, f"Timing CSV mismatch: {key}")
    require(rows[end]["destination_value"] == m["result"], "Writeback mismatch")
    t0, t1 = rows[start]["time_ps"], rows[end]["time_ps"]
    require(t1 == m["writeback_ps"] and t1 - t0 == m["clock_period_ps"] > 0,
            "Timing metadata mismatch")
    return evidence, (rows, start, end, t0, t1)


def timing(data, measured):
    rows, start, end, t0, t1 = data
    period = t1 - t0
    times = [(r["time_ps"] - t0) / period for r in rows]
    fig, ax = plt.subplots(figsize=(WIDTH, 3.7))
    fig.subplots_adjust(left=0.23, right=0.97, top=0.84, bottom=0.17)
    ax.set(xlim=(-0.5, 1.5), ylim=(-0.4, 6.9))
    ax.axvspan(0, 1, color="#eeeeee", zorder=0)
    for x in [0, 1]:
        ax.axvline(x, color=INK, lw=0.8, ls="--")
    for name, y in [("clk", 6), ("write_enable", 3), ("stall", 1)]:
        values = [y + (0.45 if r[name] else 0.05) for r in rows]
        ax.step(times, values, where="post", color=INK, lw=1)
        if name != "clk":
            ax.text(0.5, y + 0.7, str(rows[start][name]), ha="center", va="center")
    for name, y, active_only in [("operand_a", 5, True), ("result", 4, True),
                                 ("write_register", 2, True), ("destination_value", 0, False)]:
        ranges = [(0, 1, rows[start][name])]
        if not active_only:
            ranges.append((1, 1.5, rows[end][name]))
        for left, right, value in ranges:
            ax.add_patch(Rectangle((left, y - 0.05), right - left, 0.6,
                                   facecolor="white", edgecolor=INK, lw=0.8))
            ax.text((left + right) / 2, y + 0.25, str(value), ha="center", va="center")
    ax.set_yticks([6.25, 5.25, 4.25, 3.25, 2.25, 1.25, 0.25],
                 ["Clock", "Operand A", "ALU result", "Write enable", "Destination", "ID stall",
                  f"Stored x{measured['rd']}"])
    ax.set_xticks([-0.5, 0, 0.5, 1, 1.5])
    ax.set_xlabel("Clock periods relative to entry into ID/EX")
    ax.tick_params(axis="y", length=0, pad=9)
    for side in ["left", "top", "right"]:
        ax.spines[side].set_visible(False)
    ax.text(0, 7.15, f"A: {t0} ps", ha="center", fontsize=9)
    ax.text(1, 7.15, f"B: {t1} ps", ha="center", fontsize=9)
    fig.text(0.5, 0.965, f"Measured RTL: isqrt x{measured['rd']}, x{measured['rs1']} "
             f"({measured['input']} → {measured['result']})",
             ha="center", va="top", fontsize=10, fontweight="bold")
    return fig


def benchmark(evidence):
    results = evidence["tests"]
    values = [results[name]["average_cycles_per_root"] for name in ["sw_isqrt", "hw_isqrt"]]
    fig, ax = plt.subplots(figsize=(WIDTH, 3.2))
    fig.subplots_adjust(left=0.15, right=0.96, top=0.86, bottom=0.25)
    bars = ax.bar([0, 1], values, width=0.5, color=["#dddddd", "#888888"], edgecolor=INK, linewidth=0.8)
    ax.bar_label(bars, padding=5)
    ax.set(xticks=[0, 1], xticklabels=["Software workload", "Hardware workload"],
           ylabel="Reported cycles per root", ylim=(0, max(values) * 1.2))
    for side in ["top", "right"]:
        ax.spines[side].set_visible(False)
    fig.text(0.5, 0.96, "Measured benchmark averages", ha="center", va="top", fontweight="bold", fontsize=10)
    fig.text(0.5, 0.08, f"Matching checksum: {results['sw_isqrt']['checksum']}  |  "
             "Includes loop and input-generation overhead", ha="center", fontsize=9)
    return fig


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", type=Path, default=ROOT / "output/pdf")
    parser.add_argument("--results", type=Path, default=ROOT / "build/figure_data/results.json")
    parser.add_argument("--render-pdfs", action="store_true", help="Use PyMuPDF for visual-review PNGs")
    args = parser.parse_args()
    try:
        evidence, data = load_evidence(args.results)
    except (OSError, ValueError, KeyError, StopIteration) as error:
        parser.error(f"Cannot generate measured figures: {error}. Run scripts/collect_simulation_results.py first.")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.family": "sans-serif", "font.sans-serif": ["Arial", "DejaVu Sans"],
                         "font.size": 9, "mathtext.fontset": "dejavusans",
                         "pdf.fonttype": 42, "ps.fonttype": 42, "svg.fonttype": "path",
                         "axes.unicode_minus": False})
    measured = evidence["timing"]
    CAPTIONS["fig02_recurrence"] = (
        "Unrolled restoring square-root recurrence with no registers between its 16 stages. "
        f"The arithmetic example is computed from the captured input {measured['input']}; "
        f"its final root matches the measured result {measured['result']}. "
        "The table shows the last three recurrence rounds, not measured internal stage delays. "
        "The 16-bit root is zero-extended onto the 32-bit result bus.")
    CAPTIONS["fig03_writeback"] = (
        f"Sampled RTL waveform for isqrt x{measured['rd']}, x{measured['rs1']} at PC "
        f"0x{measured['pc']:08x}, with input {measured['input']} and result {measured['result']}. "
        f"ID/EX entry is at {measured['entry_ps']} ps; register writeback occurs at "
        f"{measured['writeback_ps']} ps. The selected instruction has no execution stall "
        "or illegal-instruction indication. The horizontal axis is normalized to the "
        "observed simulation clock period; timestamps are not physical FPGA delays. "
        "Operand, result and destination buses are shown only for the selected instruction.")
    figures = {"fig01_pipeline": pipeline(), "fig02_recurrence": recurrence(measured),
               "fig03_writeback": timing(data, measured), "fig04_benchmark": benchmark(evidence)}
    for name, fig in figures.items():
        fig.savefig(args.out_dir / f"{name}.pdf", metadata={"Title": CAPTIONS[name]})
        svg_path = args.out_dir / f"{name}.svg"
        fig.savefig(svg_path)
        svg_path.write_text("\n".join(line.rstrip() for line in svg_path.read_text().splitlines()) + "\n")
        fig.savefig(args.out_dir / f"{name}.png", dpi=600)
        plt.close(fig)
        if args.render_pdfs:
            import pymupdf
            with pymupdf.open(args.out_dir / f"{name}.pdf") as doc:
                doc[0].get_pixmap(dpi=160).save(args.out_dir / f"{name}_pdf_preview.png")
        print(f"Generated {name}: PDF, SVG, PNG")
    tex = ["% Add \\usepackage{graphicx} in your preamble.",
           "% Paths assume the manuscript is built from the repository root.",
           "% These figures are designed at 7.16 inches; retain readable labels.",
           "% For a two-column IEEE template, use figure* instead of figure."]
    for name in figures:
        caption = CAPTIONS[name]
        pdf_path = Path(os.path.relpath(args.out_dir / f"{name}.pdf", ROOT)).as_posix()
        tex.extend([r"\begin{figure}[t]", r"  \centering",
                    rf"  \includegraphics[width=\linewidth]{{{pdf_path}}}",
                    rf"  \caption{{{caption}}}", rf"  \label{{fig:{name}}}", r"\end{figure}", ""])
    (args.out_dir / "include_figures.tex").write_text("\n".join(tex) + "\n")
    manifest = {"matplotlib": matplotlib.__version__, "width_inches": WIDTH,
                "results_file": str(args.results), "results_sha256": digest(args.results),
                "generator_sha256": digest(Path(__file__)),
                "simulation_evidence": evidence, "captions": CAPTIONS,
                "figure_kinds": {"fig01_pipeline": "Reviewed structural schematic",
                                 "fig02_recurrence": "Reviewed recurrence; example computed from captured input",
                                 "fig03_writeback": "Measured VCD signals", "fig04_benchmark": "Parsed simulator output"}}
    (args.out_dir / "figure_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
