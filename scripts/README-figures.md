# Generate the paper figures

The collector runs the actual simulator, and the generator creates four figures
from its checked outputs and the reviewed RTL structure:

1. `fig01_pipeline`: instruction decoding, ALU integration and register writeback.
2. `fig02_recurrence`: the 16 combinational stages and equations; its example is
   calculated from the input captured in the simulation.
3. `fig03_writeback`: modular execution, control and register-file view of measured
   writeback values and clock timestamps from the VCD.
4. `fig04_benchmark`: workload cycle averages parsed from the simulator's output.

The drawings use a restrained, color-accessible palette: blue for data flow,
orange for the custom instruction and event markers, and green for successful
writeback. The white background, embedded PDF fonts, vector lines and 7.16-inch
canvas are intended for full-width placement. Labels and annotations are
hierarchically emphasized for quick scanning. The dimensions and typography follow the guidance from
the [IEEE Author Center](https://conferences.ieeeauthorcenter.ieee.org/write-your-paper/improve-your-graphics/).
The [IEEE size guidance](https://journals.ieeeauthorcenter.ieee.org/create-your-ieee-journal-article/resolution-and-size/)
also explains vector output and column widths. Check the final venue's rules.

## Setup and run

From the repository root, with Python 3.11 or newer:

```sh
python3 -m venv tmp/figures_venv
tmp/figures_venv/bin/python -m pip install -r scripts/requirements-figures.txt
python3 scripts/collect_simulation_results.py --riscv riscv64-elf-
tmp/figures_venv/bin/python scripts/generate_paper_figures.py --render-pdfs
```

The private environment is already installed on the current Mac. On Ubuntu,
create a new environment; do not copy the Mac virtual environment.

On Ubuntu, pass `--riscv riscv64-unknown-elf-` if that is the installed prefix.
Omitting `--riscv` detects an available supported compiler prefix, or uses the
`RISCV` environment variable. Older GCC releases that predate the separate
`zicsr` extension spelling can use `--riscv-arch rv32imc`; the default remains
`rv32imc_zicsr`. If an older linker does not recognize
`--no-warn-rwx-segments`, run the collector with `RISCV_LDFLAGS=` in its
environment to omit that warning-only linker option. The collector itself
needs only standard Python, Make, Verilator and the RISC-V toolchain; it does
not need Matplotlib.

## Simulation to figure data

```text
RTL + test programs → fresh build → simulator logs and VCD
                    → checked JSON and CSV → PDF / SVG / PNG
```

`collect_simulation_results.py` forces a rebuild, runs `sw_isqrt`, `hw_isqrt`
and `isqrt_corners`, and requires successful test summaries and matching
benchmark checksums. Expected illegal-instruction messages in the corner test
are accepted; a failed or unexpected exception stops collection.

The collector reads actual VCD signals and finds a legal square-root instruction
with input 20 and nonzero destination. Register numbers come from the captured
instruction fields, so a different compiler allocation is supported. It checks
the result against Python's independent `math.isqrt`, verifies the controls,
and reads the stored destination at the next rising edge. If this instruction
is missing, the VCD ends too early, or the observed execution fails these checks,
collection stops. It does not insert a synthetic example.

Each collection saves a new run directory under `build/figure_data/`, containing:

- `build.log` and the three program logs: exact build and test output.
- `isqrt_corners.vcd`: raw waveform.
- `writeback.csv`: selected signals around the measured register update.
- `benchmarks.csv`: reported workload averages, checksums and check counts.
- `results.json`: status, timestamps, tool versions, source hashes and file hashes.

`build/figure_data/results.json` identifies the latest collection. A failed run
marks it failed, so plotting cannot silently fall back to an earlier passing run.
The generator also checks artifact hashes, test summaries and the current source
hashes. Missing, changed or stale evidence stops generation. Existing exported
figures remain files from their previous successful run; a failed command does
not refresh them.

The architecture and recurrence diagrams are explanations of reviewed RTL, not
measurements inferred from a VCD. The recurrence example is calculated from the
captured input, while the timing and benchmark figures display measured data.
The recurrence table does not measure intermediate-stage propagation delays.

Outputs go to `output/pdf/`:

- PDF: use in the paper; lines and text remain sharp when resized.
- SVG: vector copy with text outlined for reliable display across machines.
- PNG: 600 dpi convenience copy.
- `*_pdf_preview.png`: rendered directly from the PDF for visual inspection.
- `include_figures.tex`: figure environments, captions and labels.
- `figure_manifest.json`: plotting version, generator hash and complete simulation
  metadata, including input hashes, times, versions and provenance for each figure.

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

To use a different evidence directory, collect and plot it explicitly:

```sh
python3 scripts/collect_simulation_results.py --out-dir build/another_run
tmp/figures_venv/bin/python scripts/generate_paper_figures.py \
  --results build/another_run/results.json --render-pdfs
```

Keep the results JSON with its referenced run directory when archiving or moving
evidence. Run the collector again after source changes. The old bundled Step 10
CSV is historical evidence only; the generator no longer reads it. Do not edit
CSV numbers to make a failing check pass.

These are original diagrams of the current implementation. The timing plot is
a redraw of sampled VCD data, not a GTKWave screenshot. No FPGA resource,
power, frequency or physical timing result is represented. Retain the project's
required AI-use acknowledgement when describing assistance with this script
and its figures in the eventual report.
