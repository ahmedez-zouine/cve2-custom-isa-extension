# Generate the paper figures

The generator creates three figures from the implemented design and saved RTL
simulation evidence:

1. `fig01_pipeline`: instruction decoding, ALU integration and register writeback.
2. `fig02_recurrence`: the 16 combinational stages, equations and input-20 example.
3. `fig03_writeback`: the measured input-20/result-4 register update.

The drawings use a white background, grayscale fills, 9-point or larger labels,
embedded PDF fonts, vector lines and a 7.16-inch canvas. They are intended for
full-width placement. The dimensions and typography follow the guidance from
the [IEEE Author Center](https://conferences.ieeeauthorcenter.ieee.org/write-your-paper/improve-your-graphics/).
The [IEEE size guidance](https://journals.ieeeauthorcenter.ieee.org/create-your-ieee-journal-article/resolution-and-size/)
also explains vector output and column widths. Check the final venue's rules.

## Setup and run

From the repository root, with Python 3.11 or newer:

```sh
python3 -m venv tmp/figures_venv
tmp/figures_venv/bin/python -m pip install -r scripts/requirements-figures.txt
tmp/figures_venv/bin/python scripts/generate_paper_figures.py --render-pdfs
```

The private environment is already installed on the current Mac. On Ubuntu,
create a new environment; do not copy the Mac virtual environment.

Outputs go to `output/pdf/`:

- PDF: use in the paper; lines and text remain sharp when resized.
- SVG: vector copy with text outlined for reliable display across machines.
- PNG: 600 dpi convenience copy.
- `*_pdf_preview.png`: rendered directly from the PDF for visual inspection.
- `include_figures.tex`: figure environments, captions and labels.
- `figure_manifest.json`: plotting version, input checksum and captured times.

PyMuPDF is needed only for `--render-pdfs`. Matplotlib generates the figures.
The script uses Arial when available and an embedded DejaVu Sans fallback
otherwise; check layout when regenerating on a machine with different fonts.

## Use in LaTeX

Add `\usepackage{graphicx}` to the preamble. Copy the desired environment from
`output/pdf/include_figures.tex` into the manuscript, or input that file if the
document is compiled from the repository root. Adjust paths when moving figures.

The default environments use `figure`, suitable for a single-column report.
For a two-column IEEE template, change them to `figure*` so the figures span
both columns. Do not shrink these detailed figures to one 3.5-inch column:
their labels would become too small. Confirm label readability at the final
printed size. The assignment's own page/layout requirements take precedence
over a publication template.

## Edit or regenerate

Edit `pipeline()`, `recurrence()` or `timing()` in the Python script. Captions
are collected in `CAPTIONS`. Rerun the script after changing labels or positions.

To plot a fresh Step 10 CSV instead of the bundled snapshot:

```sh
tmp/figures_venv/bin/python scripts/generate_paper_figures.py \
  --timing-csv build/step_10_waveform.csv --render-pdfs
```

The checker expects the currently documented encoding and register allocation.
If a new compiler changes those, update the extraction/checking logic before
using the new trace. Do not edit CSV numbers to make a failing check pass.

These are original diagrams of the current implementation. The timing plot is
a redraw of sampled VCD data, not a GTKWave screenshot. No FPGA resource,
power, frequency or physical timing result is represented. Retain the project's
required AI-use acknowledgement when describing assistance with this script
and its figures in the eventual report.
