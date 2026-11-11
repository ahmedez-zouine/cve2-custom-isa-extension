#!/usr/bin/env python3
"""Plot the reviewed routed vectorless power comparison."""

import argparse
import os
from pathlib import Path

from figure_style import CUSTOM, DATA, GRID, INK, MUTED, WIDTH, configure
from review_fpga_power import ROOT, review


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report-dir", type=Path, default=ROOT / "output/fpga/power_attempt4")
    parser.add_argument("--out-dir", type=Path, default=ROOT / "output/pdf")
    args = parser.parse_args()
    data, _ = review(args.report_dir.resolve())
    if not data["accepted_for_controlled_power_comparison"]:
        parser.error("Both variants require verified input activity")

    os.environ.setdefault("MPLCONFIGDIR", str(ROOT / "tmp/matplotlib"))
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    configure()
    fig = plt.figure(figsize=(WIDTH, 3.5))
    fig.text(.5, .958, "Estimated on-chip power", ha="center", va="top",
             fontsize=13, fontweight="bold", color=INK)
    fig.text(.5, .86, "Vivado 2024.2  ·  xc7a35tcsg324-1  ·  50 MHz assumed  ·  25 °C junction",
             ha="center", color=MUTED, fontsize=8)

    ax = fig.add_axes([.20, .25, .71, .53])
    metrics = (
        ("Total on-chip", "total_w"),
        ("Dynamic", "dynamic_w"),
        ("Device static", "device_static_w"),
    )
    row_positions = [2, 1, 0]
    baseline = data["runs"]["baseline"]["estimated_power"]
    extended = data["runs"]["extended"]["estimated_power"]
    for (label, metric), row in zip(metrics, row_positions):
        original_mw = baseline[metric] * 1000
        isqrt_mw = extended[metric] * 1000
        ax.hlines(row, original_mw, isqrt_mw, color=GRID, linewidth=2, zorder=1)
        same_value = original_mw == isqrt_mw
        baseline_row = row + (0.09 if same_value else 0)
        extended_row = row - (0.09 if same_value else 0)
        ax.scatter(original_mw, baseline_row, s=54, marker="o", color=DATA, zorder=3)
        ax.scatter(isqrt_mw, extended_row, s=56, marker="D", color=CUSTOM, zorder=4)
        ax.annotate(f"{original_mw:.0f}", (original_mw, baseline_row),
                    xytext=(0, 9), textcoords="offset points", ha="center",
                    color=DATA, fontsize=8, fontweight="bold")
        ax.annotate(f"{isqrt_mw:.0f}", (isqrt_mw, extended_row),
                    xytext=(0, -15 if same_value else 9), textcoords="offset points",
                    ha="center", color=CUSTOM, fontsize=8, fontweight="bold")
    ax.set(yticks=row_positions, yticklabels=[label for label, _ in metrics],
           xticks=range(0, 121, 20), xlim=(0, 120), ylim=(-.55, 2.55),
           xlabel="Estimated power (mW)")
    ax.tick_params(length=0, pad=7, colors=MUTED)
    ax.grid(axis="x", color=GRID, linewidth=.8)
    ax.set_axisbelow(True)
    for side in ("top", "left", "right"):
        ax.spines[side].set_visible(False)
    from matplotlib.lines import Line2D

    handles = (
        Line2D([], [], marker="o", linestyle="none", color=DATA, label="Original core"),
        Line2D([], [], marker="D", linestyle="none", color=CUSTOM, label="With isqrt"),
    )
    fig.legend(handles=handles, loc="upper center", bbox_to_anchor=(.5, .81),
               ncols=2, frameon=False)
    fig.text(.5, .115, "Vectorless estimates · Medium confidence · independently rounded to 1 mW",
             ha="center", color=MUTED, fontsize=7.5)
    fig.text(.5, .061, "Both routed designs miss timing at the assumed clock frequency.",
             ha="center", color=MUTED, fontsize=7.5)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    name = "fig13_fpga_power"
    fig.savefig(args.out_dir / f"{name}.pdf",
                metadata={"Title": "Estimated on-chip power", "CreationDate": None, "ModDate": None})
    fig.savefig(args.out_dir / f"{name}.png", dpi=400)
    fig.savefig(args.out_dir / f"{name}.svg", metadata={"Title": "Estimated on-chip power", "Date": None})
    plt.close(fig)


if __name__ == "__main__":
    main()
