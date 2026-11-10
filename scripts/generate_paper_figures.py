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
from matplotlib.patches import Rectangle, FancyArrowPatch, FancyBboxPatch
from figure_style import (INK, MUTED, DATA, DATA_LIGHT, CUSTOM, CUSTOM_LIGHT,
                          SUCCESS, SUCCESS_LIGHT, PANEL, GRID, WIDTH, configure)
CAPTIONS = {
    "fig01_pipeline": (
        "Integration of the unsigned integer square-root instruction in the two-stage "
        "CVE2 pipeline. The burgundy ISQRT block denotes the added datapath within the existing ALU. "
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
    kwargs.setdefault("color", INK)
    return ax.text(x, y, text, ha="center", va="center", **kwargs)


def box(ax, x, y, w, h, text, shaded=False, facecolor=None, edgecolor=INK):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.07",
                              facecolor=facecolor or (PANEL if shaded else "white"),
                              edgecolor=edgecolor, linewidth=1.05, zorder=2))
    label(ax, x + w / 2, y + h / 2, text, linespacing=1.4, zorder=3)


def arrow(ax, points, control=False, color=None):
    style = "--" if control else "-"
    color = color or (CUSTOM if control else DATA)
    if len(points) > 2:
        ax.plot(*zip(*points[:-1]), color=color, lw=1.25, ls=style, zorder=1)
    ax.add_patch(FancyArrowPatch(points[-2], points[-1], arrowstyle="-|>",
                                mutation_scale=10, lw=1.25, color=color,
                                linestyle=style, shrinkA=0, shrinkB=0, zorder=1))


def pipeline():
    fig, ax = canvas(4.15, 7.0)
    label(ax, 5, 6.70, "CVE2 architecture with the ISQRT extension",
          fontsize=12, fontweight="bold")
    label(ax, 5, 6.27, "Two pipeline stages | modular datapath and control view",
          fontsize=8, color=MUTED)
    for x, w, heading in [(0.18, 2.15, "IF / FETCH"), (2.68, 7.10, "ID / EX / DECODE + EXECUTE")]:
        ax.add_patch(FancyBboxPatch((x, 1.45), w, 4.25,
                     boxstyle="round,pad=0.03,rounding_size=0.10",
                     facecolor=PANEL, edgecolor=GRID, lw=0.9, zorder=0))
        label(ax, x + w / 2, 5.92, heading, fontsize=8, color=DATA, fontweight="bold")
    box(ax, 0.42, 4.35, 1.67, 0.80, "PC + prefetch\nbuffer", facecolor=DATA_LIGHT, edgecolor=DATA)
    box(ax, 0.42, 2.95, 1.67, 0.80, "IF / ID\ninstruction", facecolor="white", edgecolor=DATA)
    arrow(ax, [(1.25, 4.35), (1.25, 3.75)])
    box(ax, 3.00, 4.35, 2.35, 0.80, "Instruction decoder\ncustom-0 + legality", facecolor="white")
    box(ax, 7.38, 4.35, 2.10, 0.80, "Controller\nillegal-instruction trap",
        facecolor=CUSTOM_LIGHT, edgecolor=CUSTOM)
    arrow(ax, [(2.09, 3.35), (2.47, 3.35), (2.47, 4.75), (3.00, 4.75)])
    arrow(ax, [(5.35, 4.75), (7.38, 4.75)], control=True)
    label(ax, 6.38, 5.00, "illegal encoding", fontsize=7, color=CUSTOM)
    box(ax, 3.00, 2.65, 2.35, 0.85, "Register file\nread rs1 / write rd", facecolor="white")
    box(ax, 6.00, 2.65, 1.40, 0.85, "ISQRT ALU\n16 stages", facecolor=CUSTOM_LIGHT, edgecolor=CUSTOM)
    box(ax, 8.00, 2.65, 1.48, 0.85, "Result /\nwriteback mux", facecolor=SUCCESS_LIGHT, edgecolor=SUCCESS)
    arrow(ax, [(4.17, 4.35), (4.17, 3.50)], control=True)
    label(ax, 3.60, 3.92, "RF control", fontsize=7, color=CUSTOM)
    arrow(ax, [(4.85, 4.35), (4.85, 3.95), (6.70, 3.95), (6.70, 3.50)], control=True)
    label(ax, 5.85, 4.15, "ALU_ISQRT", fontsize=7, color=CUSTOM)
    arrow(ax, [(5.35, 3.07), (6.00, 3.07)])
    arrow(ax, [(7.40, 3.07), (8.00, 3.07)])
    arrow(ax, [(8.74, 2.65), (8.74, 1.96), (4.17, 1.96), (4.17, 2.65)], color=SUCCESS)
    label(ax, 6.50, 2.18, "32-bit result / capture at the closing edge", fontsize=7.2, color=SUCCESS)
    for x, color, name, control in [(0.7, DATA, "Data", False),
                                   (3.5, CUSTOM, "Control", True),
                                   (6.7, SUCCESS, "Writeback", False)]:
        ax.plot([x, x + .45], [.90, .90], color=color, lw=1.4, ls="--" if control else "-")
        label(ax, x + 1.12, .90, name, fontsize=7.5, color=MUTED)
    label(ax, 5, .35, "Structural schematic: only paths relevant to ISQRT are shown.", fontsize=7.2, color=MUTED)
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
    fig, ax = canvas(4.0, 6.3)
    label(ax, 5, 6.02, "Restoring square-root datapath",
          fontsize=12, fontweight="bold")
    label(ax, 5, 5.65, "16 combinational stages  ·  each consumes one 2-bit input pair",
          fontsize=8.5, color=MUTED)
    for x, title, pair in [(0.75, "STAGE 0", "x[31:30]"),
                           (3.25, "STAGE 1", "x[29:28]"),
                           (7.45, "STAGE 15", "x[1:0]")]:
        is_last = title == "STAGE 15"
        box(ax, x, 4.35, 1.8, 0.78, title, facecolor=CUSTOM_LIGHT if is_last else DATA_LIGHT,
            edgecolor=CUSTOM if is_last else DATA)
        label(ax, x + 0.9, 5.32, pair, color=CUSTOM if is_last else DATA, fontsize=8)
    for y in [4.74]:
        arrow(ax, [(0.2, y), (0.75, y)])
        arrow(ax, [(2.55, y), (3.25, y)])
        arrow(ax, [(5.05, y), (5.65, y)])
        label(ax, 6.25, y, r"$\cdots$", fontsize=16, color=MUTED)
        arrow(ax, [(6.85, y), (7.45, y)])
        arrow(ax, [(9.25, y), (9.8, y)])
    label(ax, 0.55, 4.08, r"$Q_0=R_0=0$", fontsize=8, color=MUTED)
    label(ax, 9.45, 4.08, r"$Q_{16}=\lfloor\sqrt{x}\rfloor$", fontsize=8,
          color=CUSTOM)
    ax.plot([0.3, 9.7], [3.65, 3.65], color=GRID, lw=0.9)
    ax.plot([5.25, 5.25], [0.32, 3.4], color=GRID, lw=0.9)

    label(ax, 2.75, 3.32, "STAGE k  /  UPDATE RULE", fontsize=8,
          color=DATA, fontweight="bold")
    label(ax, 2.75, 2.72, r"$T=4R_k+b_k,\qquad D=4Q_k+1$", fontsize=10)
    label(ax, 2.75, 2.12, r"$T\geq D:\quad Q_{k+1}=2Q_k+1,\quad R_{k+1}=T-D$",
          fontsize=8)
    label(ax, 2.75, 1.55, r"$T<D:\quad Q_{k+1}=2Q_k,\quad R_{k+1}=T$",
          fontsize=8)
    label(ax, 2.75, 0.85, r"Invariant: processed prefix $=Q_k^2+R_k$",
          fontsize=8, color=MUTED)

    label(ax, 7.55, 3.32, f"MEASURED INPUT  /  x = {operand}", fontsize=8,
          color=CUSTOM, fontweight="bold")
    columns = [5.75, 6.6, 7.42, 8.32, 9.25]
    headers = ["Pair", "T", "D", "Q next", "R next"]
    for x, text in zip(columns, headers):
        label(ax, x, 2.77, text, fontsize=7.5, color=MUTED, fontweight="bold")
    ax.plot([5.55, 9.65], [2.52, 2.52], color=GRID, lw=0.9)
    for index, (y, values) in enumerate(zip([2.14, 1.68, 1.22], rounds[-3:])):
        if index == 2:
            ax.add_patch(Rectangle((5.55, y - 0.19), 4.1, 0.38, facecolor=CUSTOM_LIGHT,
                                   edgecolor="none", zorder=0))
        for x, text in zip(columns, values):
            label(ax, x, y, str(text), fontsize=7.5, color=CUSTOM if index == 2 else INK)
    label(ax, 7.55, 0.56, rf"Final check: ${root}^2+{remainder}={operand}$",
          color=CUSTOM, fontsize=8.5, fontweight="bold")
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
    fig = plt.figure(figsize=(WIDTH, 4.4))
    fig.text(0.5, 0.965, "One-cycle ISQRT execution and writeback",
             ha="center", va="top", fontsize=11, fontweight="bold")
    fig.text(0.5, 0.916,
             f"Measured RTL trace  ·  PC 0x{measured['pc']:08x}  ·  "
             f"isqrt x{measured['rd']}, x{measured['rs1']}",
             ha="center", va="top", fontsize=8.5, color=MUTED)

    modules = fig.add_axes([0.04, 0.65, 0.92, 0.22])
    modules.set(xlim=(0, 10), ylim=(0, 3))
    modules.axis("off")
    cards = [
        (0.15, DATA, DATA_LIGHT, "01  EXECUTE",
         f"isqrt x{measured['rd']}, x{measured['rs1']}",
         f"Input  {measured['input']}   →   Result  {measured['result']}"),
        (3.58, CUSTOM, CUSTOM_LIGHT, "02  CONTROL",
         f"Destination  x{measured['rd']}",
         "Write 1  ·  Stall 0  ·  Illegal 0"),
        (7.01, SUCCESS, SUCCESS_LIGHT, "03  REGISTER FILE",
         f"Stored register  x{measured['rd']}",
         f"{rows[start]['destination_value']}   →   {rows[end]['destination_value']}  at edge"),
    ]
    for x, accent, fill, heading, detail, value in cards:
        modules.add_patch(FancyBboxPatch(
            (x, 0.15), 2.84, 2.68,
            boxstyle="round,pad=0.04,rounding_size=0.12",
            facecolor=fill, edgecolor=GRID, linewidth=0.9))
        modules.add_patch(Rectangle((x, 0.15), 0.075, 2.68,
                                    facecolor=accent, edgecolor="none"))
        modules.text(x + 0.24, 2.42, heading, color=accent, fontsize=8,
                     fontweight="bold", va="center")
        modules.text(x + 0.24, 1.65, detail, color=INK, fontsize=8.5,
                     fontweight="bold", va="center")
        modules.text(x + 0.24, 0.82, value, color=INK,
                     fontsize=7.2 if heading == "02  CONTROL" else 8,
                     va="center")
    for x in [3.28, 6.71]:
        modules.add_patch(FancyArrowPatch(
            (x, 1.5), (x + 0.22, 1.5), arrowstyle="-|>",
            mutation_scale=10, linewidth=1.1, color=MUTED))

    ax = fig.add_axes([0.22, 0.16, 0.74, 0.36])
    ax.set(xlim=(-0.5, 1.5), ylim=(0.15, 5.55))
    ax.axvspan(0, 1, color=CUSTOM_LIGHT, alpha=0.62, zorder=0)
    for y in [3.9, 2.95, 2.0, 1.05]:
        ax.axhline(y, color=GRID, lw=0.65, zorder=0)
    for x in [0, 1]:
        ax.axvline(x, color=CUSTOM, lw=1.0, ls=(0, (3, 2)), zorder=1)
    for name, y, color in [("clk", 4.42, INK), ("write_enable", 1.57, SUCCESS)]:
        signal = [y + (0.3 if r[name] else 0.05) for r in rows]
        ax.step(times, signal, where="post", color=color, lw=1.35, zorder=3)
    for name, y, color, fill, value in [
        ("operand_a", 3.35, DATA, DATA_LIGHT, rows[start]["operand_a"]),
        ("result", 2.4, CUSTOM, CUSTOM_LIGHT, rows[start]["result"]),
    ]:
        ax.add_patch(Rectangle((0, y), 1, 0.55, facecolor=fill,
                               edgecolor=color, lw=0.95, zorder=2))
        ax.text(0.5, y + 0.275, str(value), ha="center", va="center",
                color=INK, fontweight="bold", fontsize=8.5, zorder=3)
    ax.add_patch(Rectangle((-0.5, 0.45), 1.5, 0.55, facecolor=DATA_LIGHT,
                           edgecolor=DATA, lw=0.95, zorder=2))
    ax.add_patch(Rectangle((1, 0.45), 0.5, 0.55, facecolor=SUCCESS_LIGHT,
                           edgecolor=SUCCESS, lw=0.95, zorder=2))
    ax.text(0.25, 0.725, str(rows[start]["destination_value"]), ha="center",
            va="center", color=INK, fontweight="bold", fontsize=8.5, zorder=3)
    ax.text(1.25, 0.725, str(rows[end]["destination_value"]), ha="center",
            va="center", color=INK, fontweight="bold", fontsize=8.5, zorder=3)
    ax.set_yticks([4.47, 3.625, 2.675, 1.72, 0.725],
                  ["Clock", "Operand A", "ALU result", "RegWrite", f"Stored x{measured['rd']}"])
    ax.set_xticks([-0.5, 0, 0.5, 1, 1.5])
    ax.set_xlabel("Clock cycles relative to ID/EX entry", labelpad=5)
    ax.tick_params(axis="y", length=0, pad=8, colors=INK, labelsize=8)
    ax.tick_params(axis="x", colors=MUTED, labelsize=8, pad=3)
    ax.spines["bottom"].set_color(GRID)
    ax.spines["bottom"].set_linewidth(1.0)
    for side in ["left", "top", "right"]:
        ax.spines[side].set_visible(False)
    ax.text(-0.03, 5.18, f"ENTRY  ·  {t0} ps", ha="right", va="center", fontsize=7.5,
            color=CUSTOM, fontweight="bold")
    ax.text(1.03, 5.18, f"WRITEBACK  ·  {t1} ps", ha="left", va="center", fontsize=7.5,
            color=SUCCESS, fontweight="bold")
    fig.text(0.96, 0.035, "Simulation trace; not physical FPGA timing",
             ha="right", va="center", color=MUTED, fontsize=7)
    return fig


def benchmark(evidence):
    results = evidence["tests"]
    values = [results[name]["average_cycles_per_root"] for name in ["sw_isqrt", "hw_isqrt"]]
    fig, ax = plt.subplots(figsize=(WIDTH, 3.5))
    fig.subplots_adjust(left=0.31, right=0.96, top=0.66, bottom=0.27)
    y = [1, 0]
    for row, value, color, marker in zip(y, values, [DATA, CUSTOM], ["o", "D"]):
        ax.hlines(row, 0, value, color=color, alpha=0.25, lw=2.5)
        ax.scatter(value, row, color=color, marker=marker, s=70, zorder=3)
        ax.text(value + max(values) * .045, row, f"{value} cycles", va="center",
                color=INK, fontweight="bold", fontsize=9)
    ratio = values[0] / values[1]
    ax.set(yticks=y, yticklabels=["Software implementation", "Custom instruction"],
           xlabel="Reported average cycles per root", xlim=(0, max(values) * 1.22), ylim=(-0.65, 1.65))
    ax.xaxis.grid(True, color=GRID, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    ax.tick_params(axis="y", length=0, pad=10, colors=INK)
    ax.tick_params(axis="x", colors=MUTED, labelsize=8)
    for side in ["top", "right", "left"]:
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    fig.text(0.5, 0.96, "Benchmark workload comparison", ha="center", va="top",
             color=INK, fontweight="bold", fontsize=11)
    gcc_version = evidence["versions"]["gcc"].split()[-1]
    fig.text(0.5, 0.87, f"Integer-rounded RTL workload average | GCC {gcc_version} | cycles per root",
             ha="center", va="top", color=MUTED, fontsize=8)
    fig.text(0.5, 0.77, f"Software / hardware cycle ratio: {ratio:.1f}×",
             ha="center", va="center", color=CUSTOM, fontsize=9, fontweight="bold")
    fig.text(0.5, 0.075, f"Matching checksum: {results['sw_isqrt']['checksum']}",
             ha="center", color=INK, fontsize=8, fontweight="bold")
    fig.text(0.5, 0.035, "Averages include loop and input-generation overhead",
             ha="center", color=MUTED, fontsize=7)
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
    configure()
    measured = evidence["timing"]
    CAPTIONS["fig02_recurrence"] = (
        "Unrolled restoring square-root recurrence with no registers between its 16 stages. "
        f"The arithmetic example is computed from the captured input {measured['input']}; "
        f"its final root matches the measured result {measured['result']}. "
        "The table shows the last three recurrence rounds, not measured internal stage delays. "
        "The 16-bit root is zero-extended onto the 32-bit result bus.")
    CAPTIONS["fig03_writeback"] = (
        f"Modular summary of the measured RTL trace for isqrt x{measured['rd']}, "
        f"x{measured['rs1']} at PC 0x{measured['pc']:08x}. The execution, control, and "
        f"register-file panels show input {measured['input']}, result {measured['result']}, "
        f"and the measured destination update. ID/EX entry is at {measured['entry_ps']} ps; "
        f"writeback occurs at {measured['writeback_ps']} ps. The timeline is normalized "
        "to the observed clock period; simulation timestamps are not physical FPGA delays.")
    figures = {"fig01_pipeline": pipeline(), "fig02_recurrence": recurrence(measured),
               "fig03_writeback": timing(data, measured), "fig04_benchmark": benchmark(evidence)}
    for name, fig in figures.items():
        fig.savefig(args.out_dir / f"{name}.pdf", metadata={"Title": CAPTIONS[name],
                    "CreationDate": None, "ModDate": None})
        svg_path = args.out_dir / f"{name}.svg"
        fig.savefig(svg_path, metadata={"Date": None, "Description": CAPTIONS[name]})
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
    (args.out_dir / "include_figures.tex").write_text("\n".join(tex).rstrip() + "\n")
    manifest = {"matplotlib": matplotlib.__version__, "width_inches": WIDTH,
                "results_file": str(args.results), "results_sha256": digest(args.results),
                "generator_sha256": digest(Path(__file__)),
                "style_sha256": digest(Path(__file__).with_name("figure_style.py")),
                "simulation_evidence": evidence, "captions": CAPTIONS,
                "figure_kinds": {"fig01_pipeline": "Reviewed structural schematic",
                                 "fig02_recurrence": "Reviewed recurrence; example computed from captured input",
                                 "fig03_writeback": "Modular timing summary of measured VCD signals",
                                 "fig04_benchmark": "Parsed simulator output"}}
    (args.out_dir / "figure_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
