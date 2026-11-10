#!/usr/bin/env python3
"""Create routed FPGA figures from the reviewed implementation archive."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / "tmp/matplotlib"))
os.environ.setdefault("XDG_CACHE_HOME", str(ROOT / "tmp/figure_cache"))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap, TwoSlopeNorm
from matplotlib.patches import Patch
from matplotlib.ticker import MaxNLocator, StrMethodFormatter

from figure_style import (WIDTH, INK, MUTED, DATA, DATA_LIGHT, CUSTOM, CUSTOM_LIGHT,
                          SUCCESS, GRID, configure)
from generate_fpga_figures import load_reports as load_synthesis
from summarize_fpga_implementation import load_reports as load_implementation

VARIANTS = ("baseline", "extended")
LABELS = ("Original core", "With isqrt")
COLORS = (DATA, CUSTOM)
MARKERS = ("o", "D")
CAPTIONS = {
    "fig09_routed_resources": (
        "Whole-design resource utilization after out-of-context placement and routing. "
        "Counts and the relative LUT increase come from the top-level utilization rows and include "
        "the wrapper. Panel scales differ. The mapped FF difference includes implementation "
        "effects and does not imply an added RTL pipeline stage. Both designs use the existing "
        "multiplier DSP and no BRAM. These runs do not establish complete physical timing closure."),
    "fig10_routed_timing": (
        "Routed OOC slack heatmap at a 20 ns clock target. Overall setup, hold and pulse-width "
        "cells use the complete design timing summaries and show failing/total endpoints. "
        "The register-setup column shows the worst path from a separate register-to-register "
        "query; endpoint failure counts are not available for that filtered query. All cells "
        "share one signed nanosecond scale centered on zero. A nonnegative filtered register "
        "setup slack does not establish complete timing closure. External clock context and "
        "interface routing remain incomplete."),
    "fig11_routed_path_delay": (
        "Logic and routed interconnect contributions to each design's worst reported internal "
        "register setup path. Delay segments and totals are read from the reports. The "
        "extended path traverses isqrt_comb. The 20 ns reference is the clock period, not "
        "the exact available datapath budget; slack also includes register setup and clock "
        "terms. The paths have different endpoints. These delays cover complete selected paths "
        "and do not isolate the square-root block. External clock context remains incomplete."),
    "fig12_fpga_stage_comparison": (
        "Recorded synthesis and routed OOC results for the original and extended cores. "
        "Each line connects two saved flow stages, with direct numerical labels. The left "
        "panel shows whole-design Total LUTs; the right shows complete-design setup WNS. "
        "Connections indicate flow order, not a fitted trend, frequency sweep or repeated-run "
        "distribution. Critical endpoints can change between stages. Interface and external "
        "clock context remain incomplete. "
        "No implemented Fmax or power is claimed."),
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_inputs(directory):
    manifest_path = directory / "review_manifest.json"
    manifest = json.loads(manifest_path.read_text())
    generator = ROOT / manifest["generator"]
    if digest(generator) != manifest["generator_sha256"]:
        raise ValueError("Review parser changed; regenerate the implementation review data first")
    for field, base in (("source_file_sha256", directory), ("artifact_sha256", directory),
                        ("synthesis_reference_sha256", ROOT)):
        for name, expected in manifest[field].items():
            if digest(base / name) != expected:
                raise ValueError("Review evidence changed: " + name)
    saved = json.loads((directory / "implementation_results.json").read_text())
    if saved != load_implementation(directory):
        raise ValueError("Saved implementation data differs from the archived reports")
    synthesis, _ = load_synthesis(ROOT / "output/fpga")
    for variant in VARIANTS:
        routed = saved["runs"][variant]["identity"]
        original = synthesis["runs"][variant]["identity"]
        for key in ("tool", "part"):
            if routed[key] != original[key]:
                raise ValueError("Synthesis/routing target mismatch: " + key)
        if float(routed["clock_period_ns"]) != original["clock_period_ns"]:
            raise ValueError("Synthesis/routing clock mismatch")
    return saved, synthesis


def heading(fig, text, subtitle="Routed OOC | Vivado 2024.2 | xc7a35tcsg324-1 | 20 ns target"):
    fig.text(.5, .965, text, ha="center", va="top", fontsize=12, fontweight="bold", color=INK)
    fig.text(.5, .89, subtitle, ha="center", fontsize=8, color=MUTED)


def axis_style(ax, direction="x"):
    ax.set_axisbelow(True)
    ax.grid(axis=direction, color=GRID, lw=.8)
    ax.tick_params(length=0, colors=MUTED, labelsize=8, pad=6)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)


def status_text(data):
    states = {check: ["fail" if data["runs"][key]["timing"][check + "_failing_endpoints"] else "pass"
                      for key in VARIANTS] for check in ("setup", "hold")}
    return ("Original / with isqrt: setup " + " / ".join(states["setup"]) +
            "; hold " + " / ".join(states["hold"]) + ".")


def resource_figure(data):
    runs = data["runs"]
    fig = plt.figure(figsize=(WIDTH, 3.9))
    heading(fig, "Routed hardware cost of the ISQRT extension")
    for bounds, field, label in (([.18, .32, .30, .39], "total_luts", "(a) Total LUTs"),
                                 ([.68, .32, .28, .39], "ffs", "(b) Flip-flops")):
        ax = fig.add_axes(bounds)
        values = [runs[key]["resources"][field] for key in VARIANTS]
        for y, value, color, marker in zip((1, 0), values, COLORS, MARKERS):
            ax.hlines(y, 0, value, color=color, alpha=.25, lw=2.5)
            ax.scatter(value, y, color=color, marker=marker, s=65, zorder=3)
            ax.text(value + max(values) * .055, y, f"{value:,}", va="center", fontsize=8.5, fontweight="bold")
        ax.set(yticks=[1, 0], yticklabels=LABELS, ylim=(-.65, 1.65),
               xlim=(0, max(values) * 1.35), xlabel="Count")
        ax.set_title(label, loc="left", fontsize=9, pad=30, fontweight="bold")
        delta = values[1] - values[0]
        annotation = f"{delta:+,} " + (f"LUTs ({100 * delta / values[0]:+.1f}%)" if field == "total_luts" else "FF")
        ax.text(.5, 1.12, annotation, transform=ax.transAxes, ha="center", color=CUSTOM, fontsize=9)
        ax.xaxis.set_major_locator(MaxNLocator(nbins=3, integer=True))
        ax.xaxis.set_major_formatter(StrMethodFormatter("{x:,.0f}"))
        axis_style(ax)
    first, second = [runs[key]["resources"] for key in VARIANTS]
    fig.text(.5, .19, f"Original / with isqrt:  DSP {first['dsps']} / {second['dsps']}"
             f"     BRAM36 {first['ramb36']} / {second['ramb36']}"
             f"     BRAM18 {first['ramb18']} / {second['ramb18']}", ha="center", fontsize=8)
    fig.text(.5, .105, "Whole processor and wrapper. FF difference includes implementation effects. Panel scales differ.",
             ha="center", fontsize=7, color=MUTED)
    fig.text(.5, .04, "Source: routed utilization reports. Timing closure and board operation are not established.",
             ha="center", fontsize=7, color=MUTED)
    return fig


def timing_matrix(data):
    return [[run["timing"]["wns_ns"], run["register_setup_paths"][0]["slack_ns"],
             run["timing"]["whs_ns"], run["timing"]["wpws_ns"]]
            for run in (data["runs"][key] for key in VARIANTS)]


def timing_figure(data):
    fig = plt.figure(figsize=(WIDTH, 4.4))
    heading(fig, "Routed timing: internal paths and complete design")
    fig.text(.5, .81, "One signed nanosecond scale; zero marks the corresponding check boundary.",
             ha="center", fontsize=8, color=MUTED)
    ax = fig.add_axes([.18, .425, .78, .285])
    matrix = timing_matrix(data)
    extent = max(abs(value) for row in matrix for value in row) or 1
    cmap = LinearSegmentedColormap.from_list("routed_slack", [CUSTOM, "#FCFCFA", SUCCESS])
    picture = ax.imshow(matrix, cmap=cmap, norm=TwoSlopeNorm(vmin=-extent, vcenter=0, vmax=extent),
                        aspect="auto", interpolation="nearest")
    for row, key in enumerate(VARIANTS):
        run = data["runs"][key]
        for col, value in enumerate(matrix[row]):
            color = "white" if abs(value) > .7 * extent else INK
            ax.text(col, row - .10, f"{value:+.3f}", ha="center", va="center", fontsize=10, fontweight="bold", color=color)
            if col == 1:
                detail = "filtered worst path"
            else:
                kind = {0: "setup", 2: "hold", 3: "pulse"}[col]
                detail = f"{run['timing'][kind + '_failing_endpoints']:,} / {run['timing'][kind + '_total_endpoints']:,} fail"
            ax.text(col, row + .21, detail, ha="center", va="center", fontsize=6.8, color=color)
    ax.set(xticks=range(4), xticklabels=["Overall setup\nWNS", "Register setup\nslack", "Hold\nWHS", "Pulse width\nWPWS"],
           yticks=[0, 1], yticklabels=LABELS)
    ax.xaxis.tick_top()
    ax.tick_params(length=0, pad=9, labelsize=8, colors=INK)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.set_xticks([.5, 1.5, 2.5], minor=True)
    ax.set_yticks([.5], minor=True)
    ax.grid(which="minor", color="white", lw=3)
    ax.tick_params(which="minor", length=0)
    cax = fig.add_axes([.29, .30, .59, .025])
    colorbar = fig.colorbar(picture, cax=cax, orientation="horizontal", ticks=[-extent, 0, extent])
    colorbar.outline.set_visible(False)
    colorbar.ax.tick_params(length=0, labelsize=7, colors=MUTED)
    colorbar.set_label("Slack (ns): negative = violation; nonnegative = check met", fontsize=7.5, color=INK)
    fig.text(.5, .15, status_text(data),
             ha="center", fontsize=7.3)
    fig.text(.5, .085, "Register setup uses a separate path filter; it does not supply endpoint failure counts.",
             ha="center", fontsize=7, color=MUTED)
    fig.text(.5, .035, "External clock context and interface routing are incomplete. No implemented Fmax is claimed.",
             ha="center", fontsize=7, color=MUTED)
    return fig


def path_figure(data):
    fig = plt.figure(figsize=(WIDTH, 4.25))
    heading(fig, "Internal critical paths: logic and routing")
    ax = fig.add_axes([.18, .37, .77, .37])
    period = float(data["runs"]["baseline"]["identity"]["clock_period_ns"])
    maximum = max(data["runs"][key]["register_setup_paths"][0]["data_delay_ns"] for key in VARIANTS)
    for y, key, color, fill in zip((1, 0), VARIANTS, COLORS, (DATA_LIGHT, CUSTOM_LIGHT)):
        path = data["runs"][key]["register_setup_paths"][0]
        logic, routing = path["logic_delay_ns"], path["route_delay_ns"]
        ax.barh(y, logic, height=.43, color=color, edgecolor=color, zorder=3)
        ax.barh(y, routing, left=logic, height=.43, color=fill, edgecolor=color, hatch="///", lw=.8, zorder=3)
        ax.text(logic / 2, y, f"{logic:.3f}", ha="center", va="center", color="white", fontsize=7.5, fontweight="bold")
        ax.text(logic + routing / 2, y, f"{routing:.3f}", ha="center", va="center", fontsize=8, fontweight="bold")
        ax.text(path["data_delay_ns"] + .9, y + .085, f"{path['data_delay_ns']:.3f} ns", fontsize=8.5, fontweight="bold")
        ax.text(path["data_delay_ns"] + .9, y - .15, f"slack {path['slack_ns']:+.3f} ns", fontsize=7.2, color=color)
    ax.axvline(period, color=SUCCESS, ls=(0, (3, 3)), lw=1.1, zorder=1)
    ax.text(period + .6, 1.48, f"{period:g} ns clock period", color=SUCCESS, fontsize=7.5)
    ax.set(yticks=[1, 0], yticklabels=LABELS, xlim=(0, max(maximum, period) * 1.32),
           ylim=(-.5, 1.75), xlabel="Reported data-path delay (ns)")
    axis_style(ax)
    fig.legend(handles=[Patch(facecolor=INK, label="Logic"),
                        Patch(facecolor="white", edgecolor=INK, hatch="///", label="Routed interconnect")],
               loc="center", bbox_to_anchor=(.55, .255), frameon=False, ncol=2, fontsize=8)
    original, extended = [data["runs"][key]["register_setup_paths"][0] for key in VARIANTS]
    fig.text(.5, .165, f"Original: {original['logic_levels']} levels / {original['carry4_on_path']} CARRY4"
             f"     With isqrt: {extended['logic_levels']} levels / {extended['carry4_on_path']} CARRY4", ha="center", fontsize=8)
    fig.text(.5, .095, "Clock period is not the exact data budget; setup and clock terms also affect slack.",
             ha="center", fontsize=7, color=MUTED)
    fig.text(.5, .04, "Different path endpoints; extended path traverses isqrt_comb. External clock context is incomplete.",
             ha="center", fontsize=7, color=MUTED)
    return fig


def stage_figure(data, synthesis):
    fig = plt.figure(figsize=(WIDTH, 4.25))
    heading(fig, "Synthesis to routing: recorded flow-stage comparison",
            "Vivado 2024.2 | xc7a35tcsg324-1 | same 20 ns target and processor configuration")
    legend = []
    for bounds, section, field, label in (([.10, .32, .34, .39], "resources", "total_luts", "(a) Whole-design Total LUTs"),
                                         ([.62, .32, .33, .39], "timing", "wns_ns", "(b) Overall setup WNS (ns)")):
        ax = fig.add_axes(bounds)
        all_values = []
        for key, color, marker, name in zip(VARIANTS, COLORS, MARKERS, LABELS):
            values = [synthesis["runs"][key][section][field], data["runs"][key][section][field]]
            all_values.extend(values)
            line, = ax.plot([0, 1], values, color=color, marker=marker, ms=6, lw=1.3, label=name)
            if field == "total_luts":
                legend.append(line)
            for x, value in enumerate(values):
                text = f"{value:,}" if field == "total_luts" else f"{value:+.3f}"
                dy = -17 if field == "wns_ns" and key == "baseline" and x == 1 else 10
                ax.annotate(text, (x, value), xytext=(0, dy), textcoords="offset points", ha="center",
                            fontsize=7.8, color=color, fontweight="bold")
        ax.set(xticks=[0, 1], xticklabels=["Synthesis", "Routed"], xlim=(-.25, 1.25))
        ax.set_title(label, loc="left", fontsize=8.5, fontweight="bold", pad=13)
        span = max(all_values) - min(all_values) or 1
        if field == "total_luts":
            ax.set_ylim(min(all_values) - .30 * span, max(all_values) + .35 * span)
            ax.yaxis.set_major_formatter(StrMethodFormatter("{x:,.0f}"))
        else:
            ax.set_ylim(min(min(all_values), 0) - .16 * span, max(max(all_values), 0) + .18 * span)
            ax.axhline(0, color=SUCCESS, ls=(0, (3, 3)), lw=1)
        axis_style(ax, direction="y")
    fig.legend(handles=legend, loc="center", bbox_to_anchor=(.5, .80), ncol=2, frameon=False, fontsize=8)
    fig.text(.5, .17, "Lines connect recorded flow stages; critical endpoints can change between stages.", ha="center", fontsize=7.5)
    fig.text(.5, .105, "One saved result per variant and stage; no fit, frequency sweep or repeated-run statistics.",
             ha="center", fontsize=7, color=MUTED)
    fig.text(.5, .04, "Routed interfaces and external clock context are incomplete. No implemented Fmax is claimed.",
             ha="center", fontsize=7, color=MUTED)
    return fig


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report-dir", type=Path, default=ROOT / "output/fpga/implementation")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "output/pdf")
    parser.add_argument("--render-pdfs", action="store_true")
    args = parser.parse_args()
    try:
        data, synthesis = checked_inputs(args.report_dir)
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        parser.error("Cannot plot reviewed data: " + str(error))
    configure()
    figures = {"fig09_routed_resources": resource_figure(data), "fig10_routed_timing": timing_figure(data),
               "fig11_routed_path_delay": path_figure(data), "fig12_fpga_stage_comparison": stage_figure(data, synthesis)}
    args.out_dir.mkdir(parents=True, exist_ok=True)
    artifacts = {}
    for name, fig in figures.items():
        for suffix in ("pdf", "svg", "png"):
            path = args.out_dir / f"{name}.{suffix}"
            metadata = {"Title": CAPTIONS[name], "CreationDate": None, "ModDate": None} if suffix == "pdf" else None
            if suffix == "svg":
                metadata = {"Date": None, "Description": CAPTIONS[name]}
            fig.savefig(path, dpi=600, metadata=metadata)
            if suffix == "svg":
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
    tex = ["% Paths assume compilation from the repository root. Use figure* for IEEE two-column layout."]
    for name, caption in CAPTIONS.items():
        path = Path(os.path.relpath(args.out_dir / f"{name}.pdf", ROOT)).as_posix()
        tex.extend([r"\begin{figure}[t]", r"  \centering", rf"  \includegraphics[width=\linewidth]{{{path}}}",
                    "  \\caption{" + caption.replace("_", r"\_").replace("%", r"\%") + "}",
                    rf"  \label{{fig:{name}}}", r"\end{figure}", ""])
    tex_path = args.out_dir / "include_routed_figures.tex"
    tex_path.write_text("\n".join(tex).rstrip() + "\n")
    artifacts[tex_path.name] = digest(tex_path)
    manifest = {"schema_version": 1, "generator_sha256": digest(Path(__file__)),
                "style_sha256": digest(Path(__file__).with_name("figure_style.py")),
                "matplotlib": matplotlib.__version__, "width_inches": WIDTH,
                "implementation_review_manifest_sha256": digest(args.report_dir / "review_manifest.json"),
                "implementation_data_sha256": digest(args.report_dir / "implementation_results.json"),
                "synthesis_parser_sha256": digest(Path(__file__).with_name("generate_fpga_figures.py")),
                "synthesis_sources": synthesis["sources"], "artifact_sha256": artifacts,
                "captions": CAPTIONS, "limitations": data["limitations"],
                "figure_kinds": {"fig09_routed_resources": "Routed resource point plots",
                                 "fig10_routed_timing": "Routed overall and filtered-path slack heatmap",
                                 "fig11_routed_path_delay": "Worst internal path delay decomposition",
                                 "fig12_fpga_stage_comparison": "Lines between recorded flow stages"}}
    (args.out_dir / "routed_figure_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
