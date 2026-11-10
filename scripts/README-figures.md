# Generate the paper figures

The simulation collector runs the actual simulator, and its generator creates
four figures from checked outputs and the reviewed RTL structure. A separate
FPGA generator adds four synthesis figures, and a routed generator adds four
more from the reviewed implementation data:

1. `fig01_pipeline`: instruction decoding, ALU integration and register writeback.
2. `fig02_recurrence`: the 16 combinational stages and equations; its example is
   calculated from the input captured in the simulation.
3. `fig03_writeback`: modular execution, control and register-file view of measured
   writeback values and clock timestamps from the VCD.
4. `fig04_benchmark`: workload cycle averages as a point plot parsed from the
   simulator's output.
5. `fig05_fpga_resources`: paired resource point plots with distinct circle and
   diamond markers for original/extended counts.
6. `fig06_fpga_timing`: heatmap of setup, hold and pulse-width worst slack, with
   failing endpoint counts from the complete design timing summaries.
7. `fig07_fpga_tradeoff`: scatter plot of Total LUTs versus setup WNS for the two
   saved configurations. There is no fitted line or parameter sweep.
8. `fig08_experimental_setup`: modular schematic of matching synthesis inputs,
   separate runs, archived reports and checked figure generation.
9. `fig09_routed_resources`: original/extended Total LUT and FF point plots
   after routing, with the percentage change computed from the reported counts.
10. `fig10_routed_timing`: signed slack heatmap that distinguishes overall
    setup from a separate register setup-path query, plus hold and pulse width.
11. `fig11_routed_path_delay`: logic/interconnect decomposition of the worst
    reported register setup path in each design.
12. `fig12_fpga_stage_comparison`: line plots connecting the two saved flow
    stages for whole-design LUTs and overall setup WNS.

The shared `figure_style.py` uses navy for baseline/data paths, burgundy for the
custom instruction, and green for writeback or positive slack. Marker shapes,
direct numerical labels and line styles also distinguish the variants. The
heatmap uses a single diverging nanosecond scale centered on zero, with every
cell labelled. It does not combine LUT counts, endpoints and slack into a
single color scale. The white background, embedded PDF fonts, vector lines and 7.16-inch
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
Both scripts use embedded DejaVu Sans fonts to keep typography consistent across
macOS and Ubuntu.

## FPGA figures from saved reports

The FPGA plots use the existing Python environment and need no Vivado rerun:

```sh
tmp/figures_venv/bin/python scripts/generate_fpga_figures.py --render-pdfs
```

The default inputs are `output/fpga/baseline/` and `output/fpga/extended/`.
The script reads the top-level utilization row rather than adding primitive
LUT counts or hierarchy rows. It reads the complete design timing summary
rather than selecting a passing path. Point locations, heatmap cells, numerical annotations,
percentage changes and status text come from those parsed values.

Before plotting, it checks the tool, FPGA part and speed grade, design state,
clock period, successful synthesis logs, and baseline source provenance against
Git history. Missing reports, failed preparation logs, mismatched conditions or
inconsistent timing rows stop generation. Full Git history is needed to check
the original and measured revisions. These are archived results for those
revisions; changing the current RTL does not change the saved measurements.

The figures have the same 7.16-inch width, palette and PDF/SVG/600-dpi PNG
formats as the simulation figures. The output directory also contains:

| File | Contents |
|---|---|
| `fpga_results.json` | Parsed run identity, resource/timing values and source SHA-256 hashes |
| `fpga_metrics.csv` | Original, extended and difference columns, with units |
| `fpga_figure_manifest.json` | Generator/input/output hashes, captions and limitations |
| `include_fpga_figures.tex` | LaTeX environments for the four FPGA figures |

The quantitative FPGA figures are **out-of-context post-synthesis estimates**. Both runs have
hold violations and an unset `HD.CLK_SRC` clock context. Positive baseline
setup slack does not mean complete timing closure. There is no power or
implemented Fmax plot because those results have not been produced.

To use a different matching report pair, pass `--report-dir PATH`, containing
the `baseline/` and `extended/` subdirectories. Use `--out-dir PATH` to keep
another export separate. Existing simulation figures and their manifest are
not regenerated by this command.

The report parser checks can be run with:

```sh
tmp/figures_venv/bin/python -B -m unittest discover \
  -s scripts -p test_generate_fpga_figures.py -v
```

## Choosing the right figure type

The step-line waveform is based on captured VCD timestamps. It is a valid
time-series view. The scatter plot has only two reported configurations, so
the script draws no connecting trend line, interpolation, fit or uncertainty
band. A frequency sweep, per-input latency curve or repeated-run distribution
would require additional experiments first.

The architecture and experimental setup diagrams are explanatory schematics.
Their box dimensions and arrow lengths do not encode measured delay or area.
The recurrence illustration calculates its example from a captured operand;
it does not measure intermediate combinational propagation times.

The refreshed simulation figures use the current macOS collection (GCC 16.2.0,
247/23 workload cycles). The saved FPGA pair remains the Ubuntu Vivado run.
The two manifests identify these separate evidence sources. The simulation
generator still requires fresh source-matching evidence before redrawing.

## Use in LaTeX

Add `\usepackage{graphicx}` to the preamble. Copy the desired environments from
`output/pdf/include_figures.tex` (simulation) or `include_fpga_figures.tex`
(synthesis), or `include_routed_figures.tex` (routing) into the manuscript.
You can input these files if the document is
compiled from the repository root. Adjust paths when moving figures.

The default environments use `figure`, suitable for a single-column report.
For a two-column IEEE template, change them to `figure*` so the figures span
both columns. Do not shrink these detailed figures to one 3.5-inch column:
their labels would become too small. Confirm label readability at the final
printed size. The assignment's own page/layout requirements take precedence
over a publication template.

## Routed implementation figures

The [routed gallery](../output/pdf/routed_figures.md) shows the four new figures.
Reproduce them from the repository root:

```sh
tmp/figures_venv/bin/python -B scripts/generate_routed_figures.py --render-pdfs
```

The generator checks the implementation review manifest, all 46 raw-file
hashes, generated data hashes and parser identity. It reparses the raw reports
and requires the saved JSON to match. The synthesis inputs for the stage plot
are checked through the existing synthesis loader, including source identity.
Changed or stale evidence stops generation.

The heatmap's four columns have nanosecond units and share one zero-centered
scale. Only the overall timing checks have endpoint counts. The internal
register query supplies its worst path and does not supply a total number of
failing endpoints. The path decomposition uses whole selected paths with
different endpoints; the 20 ns line is a period reference rather than the
exact available datapath budget.

The line plots join two measured flow stages per variant. They are not a
frequency sweep or fitted trend. The routed input remains an exploratory OOC
study with incomplete external clock and interface context, an unresolved tile
warning, and a missing successful extended-run launch log. Those limitations
remain in the data/figure manifests and comparison review. There is no power
or implemented Fmax chart.

Outputs include PDF, SVG, 600-dpi PNG, rendered PDF previews,
`routed_figure_manifest.json` and `include_routed_figures.tex`. Font, palette,
canvas width and shape conventions match the earlier figures. Run the figure
checks with:

```sh
tmp/figures_venv/bin/python -B -m unittest discover \
  -s scripts -p test_generate_routed_figures.py -v
```

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

The first four figures describe the simulated implementation; the waveform is
a redraw of sampled VCD data, not a GTKWave screenshot. The four FPGA figures
describe the saved synthesis runs and their limitations. Retain the project's
required AI-use acknowledgement when describing assistance with these scripts
and figures in the eventual report.
