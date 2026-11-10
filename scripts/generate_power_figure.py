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
    fig = plt.figure(figsize=(WIDTH, 3.4))
    fig.text(.5, .958, "Estimated on-chip power", ha="center", va="top",
             fontsize=13, fontweight="bold", color=INK)
    fig.text(.5, .857, "Vivado 2024.2 | xc7a35tcsg324-1 | 50 MHz assumed | 25 °C junction",
             ha="center", color=MUTED)

    ax = fig.add_axes([.115, .25, .84, .48])
    metrics = ("total_w", "dynamic_w", "device_static_w")
    max_power = max(run["estimated_power"]["total_w"] * 1000 for run in data["runs"].values())
    for offset, key, label, color in ((-.18, "baseline", "Original core", DATA),
                                       (.18, "extended", "With isqrt", CUSTOM)):
        power = data["runs"][key]["estimated_power"]
        values = [power[metric] * 1000 for metric in metrics]
        bars = ax.bar([index + offset for index in range(len(metrics))], values,
                      width=.31, color=color, label=label, zorder=3)
        ax.bar_label(bars, fmt="%.0f", padding=4, color=color, fontweight="bold")
    ax.set(xticks=range(len(metrics)), xticklabels=["Total", "Dynamic", "Device static"],
           ylim=(0, max_power * 1.18), ylabel="Estimated power (mW)")
    ax.tick_params(length=0, pad=6, colors=MUTED)
    ax.grid(axis="y", color=GRID, linewidth=.8)
    ax.set_axisbelow(True)
    for side in ("top", "left", "right"):
        ax.spines[side].set_visible(False)
    handles, labels = ax.get_legend_handles_labels()
    fig.legend(handles, labels, loc="center", bbox_to_anchor=(.5, .784),
               ncols=2, frameon=False)
    fig.text(.5, .111, "Vectorless estimates with Medium confidence. Values round independently to 1 mW.",
             ha="center", color=MUTED, fontsize=7.5)
    fig.text(.5, .051, "Both routed designs miss timing at the assumed clock frequency.",
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
