"""Shared typography and colors for CVE2 paper figures."""

WIDTH = 7.16
INK = "#18313F"
MUTED = "#627582"
DATA = "#285F7D"
DATA_LIGHT = "#EAF1F5"
CUSTOM = "#7A263A"
CUSTOM_LIGHT = "#F3E8EA"
SUCCESS = "#287963"
SUCCESS_LIGHT = "#EAF4EE"
PANEL = "#F4F5F3"
GRID = "#DCE3E6"


def configure():
    import matplotlib.pyplot as plt

    plt.rcParams.update({
        "font.family": "DejaVu Sans", "font.size": 8.5,
        "text.color": INK, "axes.labelcolor": INK, "axes.edgecolor": GRID,
        "mathtext.fontset": "dejavusans", "pdf.fonttype": 42, "ps.fonttype": 42,
        "svg.fonttype": "path", "svg.hashsalt": "cve2-paper-figures",
        "axes.unicode_minus": False, "figure.facecolor": "white",
        "axes.facecolor": "white", "savefig.facecolor": "white",
    })
