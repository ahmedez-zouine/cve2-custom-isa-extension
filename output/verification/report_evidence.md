# Evidence selected for the submission report

Prepared on 11 November 2026. This packet supports the required A4,
single-column report of at most six pages; it is not the completed report.
The final report must also contain reproduction steps, references and an
accurate acknowledgment of AI assistance.

## Checks before writing

- All 1,287 files recorded in the clean simulation export still match the
  current checkout. The [integration review](submission_review/README.md)
  records passing totals of 5, 2,007, 43 and 200,705 checks.
- All 46 routed archive source hashes and all 40 corrected power archive
  source hashes match their respective review manifests. This checks archive
  integrity; Vivado was not rerun on this Mac.
- The simulation figure collector was rebuilt and rerun against current
  sources. Its freshness checks pass. The figures were regenerated through
  the normal generator, including the redesigned writeback figure and its
  corrected caption. Values match the preceding clean-export review.
- The selected figure files and evidence records are fingerprinted in
  [report_evidence_manifest.json](report_evidence_manifest.json).

## Simulation values

| Quantity | Software | Custom instruction |
| --- | ---: | ---: |
| Printed workload average, cycles per root | 247 | 23 |
| Workload inputs | 256 | 256 |
| Checksum | 10,996,072 | 10,996,072 |

The cycle ratio is `247 / 23 = 10.739…`, approximately 10.7×. Use this only
as a ratio of the printed workload averages, which include loop and input
generation overhead. It does not measure FPGA elapsed-time speedup. The
selected RTL waveform shows one execution interval for `isqrt x11, x11`,
input 20 and result 4, with writeback at the next rising edge. Its 10 ps
simulation period is not a physical FPGA clock capability.

Sources: [fresh figure manifest](../pdf/figure_manifest.json),
[supplied-program log](submission_review/supplied.log), and
[fresh integration log](submission_review/integration.log).

## FPGA table for the report

Both variants use Vivado 2024.2, Artix-7 `xc7a35tcsg324-1`, and a 20 ns
target. Resource counts cover the whole OOC design, including the wrapper.

| Metric and stage | Original core | With ISQRT |
| --- | ---: | ---: |
| Synthesis LUTs | 3,034 | 4,178 |
| Routed LUTs | 2,987 | 4,205 |
| Routed flip-flops | 1,961 | 1,965 |
| Routed DSPs | 1 | 1 |
| Routed RAMB36 / RAMB18 | 0 / 0 | 0 / 0 |
| Routed overall setup WNS, ns | −0.884 | −29.556 |
| Routed filtered register setup slack, ns | +0.058 | −29.556 |
| Routed hold WHS, ns | −2.232 | −2.168 |
| Vectorless total on-chip estimate, mW | 86 | 101 |
| Vectorless dynamic estimate, mW | 17 | 32 |
| Vectorless device-static estimate, mW | 68 | 68 |

Routed LUT overhead is `(4205 − 2987) / 2987 = 40.8%`. The displayed total
power difference is 15 mW, approximately 17.4%. Power components and totals
are independently rounded. Use the corrected `power_attempt4` archive,
with Medium confidence, 25 °C junction temperature and assumed 50 MHz
activity. These are estimates, not board measurements or energy per root.

Sources: [synthesis comparison](../fpga/comparison.md),
[routed reports and review](../fpga/implementation/comparison.md),
[corrected power review](../fpga/power_attempt4/archive_review.json), and
[technical handoff](../fpga/verified_results.md).

Both designs fail overall setup and hold. The extended internal register
path through ISQRT has 49.387 ns data-path delay, including logic selection
and routing. The baseline's positive filtered register setup slack does not
establish full timing closure. External clock and interface context remain
incomplete; the `Constraints 18-8777` warning and missing successful extended
implementation launch log remain unresolved. Report worst slack and these
limitations; no implemented Fmax is established.

## Figure selection

Use the vector PDFs at close to full text width. The standalone previews were
reviewed, but readability must be checked again after placing them in the
actual report.

| Figure | Report purpose | File |
| --- | --- | --- |
| Pipeline integration | Explain decoder, ALU and writeback | [Figure 1](../pdf/fig01_pipeline.pdf) |
| Restoring recurrence | Explain the algorithm and worked example | [Figure 2](../pdf/fig02_recurrence.pdf) |
| Measured writeback | Fulfill the required simulation waveform | [Figure 3](../pdf/fig03_writeback.pdf) |

Use the FPGA table above for the primary before/after comparison. Add the
[routed path-delay figure](../pdf/fig11_routed_path_delay.pdf) only if it fits
without making labels too small. The website's full-core reference diagram
is optional context; Figure 1 focuses on the implemented extension.

## Suggested six-page allocation

1. Objective, instruction semantics and encoding; pipeline integration figure.
2. Restoring recurrence, widths and legality handling; arithmetic figure.
3. Tests, scope of coverage and matching benchmark run; measured waveform.
4. FPGA setup and before/after table; explain setup and hold findings.
5. [Alternative architecture](../../docs/alternatives.md), expected trade-offs
   and why the implemented path is long. Distinguish proposals from measurements.
6. Reproduction steps, tool versions, evidence limitations, references and
   AI-use acknowledgment. Explain what the tools assisted with and which
   engineering checks were actually performed.

The allocation is a writing guide, not a requirement to fill all six pages.
Do not replace the required report with the website. The remaining submission
work is writing `report.pdf`, checking every rendered page and auditing the
final folder and reproduction instructions.

## Regenerate the simulation figures

```sh
python3 -B scripts/collect_simulation_results.py \
  --riscv riscv64-elf- --out-dir build/figure_data_submission
tmp/figures_venv/bin/python -B scripts/generate_paper_figures.py \
  --results build/figure_data_submission/results.json --render-pdfs
```

Create the figure environment using [the figure guide](../../scripts/README-figures.md)
on a new machine. Use `riscv64-unknown-elf-` on Ubuntu. Full FPGA commands
and the required Vivado environment are in [the FPGA guide](../../fpga/README.md).
