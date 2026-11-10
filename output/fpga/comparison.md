# Original and isqrt core: synthesis comparison

Adding isqrt increases reported whole-design LUT utilization by 1,144 (+37.7%)
and changes estimated setup slack from +2.994 ns to -30.800 ns at a 20 ns clock
target. The original core passes the reported setup checks, but both designs
have hold violations. Neither result establishes complete timing closure.

The later [routed OOC review](implementation/comparison.md) now records
placement/routing results. The tables below retain their post-synthesis scope.

Figures generated directly from these reports are available as
[resource point plots](../pdf/fig05_fpga_resources.pdf),
[timing heatmap](../pdf/fig06_fpga_timing.pdf) and
[area/slack scatter plot](../pdf/fig07_fpga_tradeoff.pdf). A separate
[experimental schematic](../pdf/fig08_experimental_setup.pdf) explains the workflow. The
[parsed data](../pdf/fpga_results.json) and
[figure manifest](../pdf/fpga_figure_manifest.json) retain their numerical
inputs and source hashes.

## Conditions and source identity

Both runs use Vivado 2024.2, build 5239630, on Ubuntu 24.04.5 LTS, targeting
`xc7a35tcsg324-1` with top `cve2_fpga_top` in out-of-context synthesis. Both use
the same 20 ns clock, maximum I/O delays of 4 ns, minimum I/O delays of 0 ns,
and an external-reset false path. The configuration retains the fast multiplier,
FF register file and zero optional HPM counters, with CV-X-IF disabled.

The extended run identifies source revision
`81c378c5fe8ebbb9856cf47f808fde3b12b7eaab`. The baseline snapshot uses that
revision's sources, replacing only `cve2_pkg.sv`, `cve2_decoder.sv` and
`cve2_alu.sv` with the original import
`af1e7b4fcab772e1976f41f36b38ced25cb9f377`. Git history confirms that only these
three files differ under `cve2/` between the two revisions.

All 180 SHA-256 entries in the baseline [source manifest](baseline/source_manifest.json)
were checked against the corresponding Git objects. The wrapper, clock gate,
constraints and source list match the measured extended revision. The baseline
[driver copy](baseline/synth_driver.tcl) matches the current driver; its synthesis
and report commands match the earlier flow, with added baseline source selection
and provenance capture. Metadata is retained for the [baseline](baseline/run_info.txt)
and [extended](extended/run_info.txt) runs.

## Resources

These are the top-level Total LUTs and FFs metrics from the matching
[baseline](baseline/utilization.rpt) and [extended](extended/utilization.rpt)
utilization reports, including the processor wrapper.

| Resource | Original | With isqrt | Change |
|---|---:|---:|---:|
| Total LUTs | 3,034 | 4,178 | +1,144 (+37.7%) |
| Flip-flops | 1,961 | 1,962 | +1 |
| DSP blocks | 1 | 1 | 0 |
| RAMB36 / RAMB18 | 0 / 0 | 0 / 0 | 0 |
| LUTRAM / SRL | 0 / 0 | 0 / 0 | 0 |
| CARRY4 primitives, from synthesis logs | 68 | 240 | +172 |

The existing multiplier accounts for the DSP in both designs. The +1 whole-design
FF difference results from synthesis of the complete design; it does not imply
that the combinational isqrt implementation adds a pipeline register.
Cross-boundary optimization moves logic in the rebuilt hierarchy, so individual
module rows do not reliably measure the extension's area. Raw LUT1-LUT6 sums
are also a different metric from the Total LUTs used here.

## Timing estimates

Sources: [baseline timing](baseline/timing_summary.rpt) and
[extended timing](extended/timing_summary.rpt).

| Metric | Original | With isqrt |
|---|---:|---:|
| Setup WNS | +2.994 ns | -30.800 ns |
| Setup TNS | 0.000 ns | -5,259.459 ns |
| Failing setup endpoints | 0 | 341 |
| Hold WHS | -0.956 ns | -0.956 ns |
| Hold THS | -171.701 ns | -171.927 ns |
| Failing hold endpoints | 368 | 368 |
| Pulse-width worst slack | +9.500 ns | +9.500 ns |
| Failing pulse-width endpoints | 0 | 0 |

Setup WNS degrades by 33.794 ns. The worst baseline setup path runs from
`irq_fast_i[13]` to `instr_addr_o[2]`, with 12 logic levels and an estimated
8.971 ns datapath delay, in addition to the external I/O delays. The worst
extended path runs between register-file bits through `isqrt_comb`, with
86 logic levels and an estimated 50.649 ns datapath delay. The two worst paths
have different endpoints; their delays are not an isolated measurement of the
square-root unit.

Both worst hold paths start at `instr_err_i` and end at a FIFO error-register
D pin, with zero logic levels. Their presence in the original design shows
that this hold failure is not introduced solely by isqrt. Lowering clock
frequency alone does not resolve hold timing.

Both constraint checks report no unconstrained internal maximum-delay endpoints,
missing synchronous I/O delays, or combinational/latch loops. `rst_ni` is the
only input without a delay and is intentionally false-pathed. Both clock reports
identify one propagated 20 ns clock. `report_methodology` was not run.

Routing is estimated. Both runs warn that `HD.CLK_SRC` is unset, limiting OOC
clock delay/skew estimation. These results do not establish implemented Fmax,
power, or board-level operation. Placement and routing with a defined clock
integration context and reviewed interface constraints is the next evaluation.

## Archived log correction

The first export placed the earlier failed Python preparation run at
`baseline/vivado.log`. The successful baseline run instead used Vivado's default
root log, dated 12:00:40–12:03:46 on 10 November 2026, with checksum `aa48635d`.
That successful log and journal are now archived as [vivado.log](baseline/vivado.log)
and [vivado.jou](baseline/vivado.jou), with their contents unchanged. The earlier
failure is preserved as [preparation_failed.log](baseline/preparation_failed.log).
The report headers, successful log and source metadata agree on the baseline run.

No RTL changes, new simulation or Vivado run were performed during this review.
