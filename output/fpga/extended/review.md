# Extended-core synthesis review

The extended core synthesizes successfully, but its post-synthesis timing
estimate fails the 50 MHz target. The longest reported setup path traverses
the combinational square-root datapath. The subsequent baseline result is
recorded in the [synthesis comparison](../comparison.md). No placed-and-routed
result is available yet.

## Run identity

| Item | Recorded value |
|---|---|
| Tool | Vivado 2024.2, SW Build 5239630 |
| Host | Ubuntu 24.04.5 LTS, Azure VM Goodman |
| FPGA part | `xc7a35tcsg324-1` |
| Top | `cve2_fpga_top` |
| Design state | Synthesized, out of context |
| Target clock | 20.000 ns / 50 MHz |
| Source revision | `81c378c5fe8ebbb9856cf47f808fde3b12b7eaab` |
| Working tree reported | Only untracked `.Xil/` |
| Report date | 10 November 2026, approximately 01:13, as recorded by Vivado |

The evidence is [run_info.txt](run_info.txt) and the report headers. The complete
run is retained in [vivado.log](vivado.log). Its final synthesis summary reports
zero errors and zero critical warnings. This does not mean timing constraints
were met; synthesis completion and timing closure are separate checks.

## Resource use

Values below describe the entire FPGA wrapper and extended processor, not
the incremental cost of isqrt. Source: [utilization.rpt](utilization.rpt).

| Resource | Reported count |
|---|---:|
| Total LUTs | 4,178 |
| Logic LUTs | 4,178 |
| Flip-flops | 1,962 |
| LUTRAM / SRL | 0 / 0 |
| RAMB36 / RAMB18 | 0 / 0 |
| DSP blocks | 1 |

The DSP is attributed to `cve2_multdiv_fast`. The raw LUT1-LUT6 primitive
counts in the log sum to 4,722; that sum is not the utilization report's
Total LUTs metric. Use 4,178 for the reported total and compare the identical
metric in the baseline run.

Vivado performs cross-boundary optimization and rebuilds hierarchy. The
reported concentration of LUTs under `if_stage_i`, and absence of a separate
ALU hierarchy row, must not be interpreted as the input RTL's module area
breakdown. The timing path retains recognizable `isqrt_comb` net names.

## Timing result

Source: [timing_summary.rpt](timing_summary.rpt). The report explicitly states
`Timing constraints are not met`.

| Metric | Reported value |
|---|---:|
| Worst setup slack (WNS) | -30.800 ns |
| Total negative setup slack (TNS) | -5,259.459 ns |
| Failing setup endpoints | 341 |
| Worst hold slack (WHS) | -0.956 ns |
| Total negative hold slack (THS) | -171.927 ns |
| Failing hold endpoints | 368 |
| Worst pulse-width slack | +9.500 ns |
| Failing pulse-width endpoints | 0 |

The longest detailed setup path runs from register-file x23 bit 30 to
register-file x10 bit 0. These are static timing endpoints, not evidence that
a particular program executed this register combination. The path includes
`ex_block_i/alu_i/isqrt_comb` root and remainder nets.

| Worst setup path property | Reported value |
|---|---:|
| Requirement | 20.000 ns |
| Data-path delay | 50.649 ns |
| Logic portion | 16.828 ns |
| Estimated route portion | 33.821 ns |
| Logic levels | 86 |
| CARRY4 elements on path | 51 |

The unrolled root stages create a long dependency chain. The report supports
that architectural concern. Its net delays are estimates for an unplaced
design; they are not measured or routed delays. Do not derive and publish a
final Fmax from this report or describe the design as meeting 50 MHz.

The worst hold path starts at `instr_err_i` and ends at an instruction FIFO
error-register D pin. It has zero logic levels, a 0 ns minimum input-delay
assumption and estimated clock skew. Hold closure needs separate review of
the external interface assumptions and implemented clock/data routing. A
longer clock period alone is not a remedy for this hold failure.

## Constraint coverage and warnings

Source: [check_timing.rpt](check_timing.rpt) and [clocks.rpt](clocks.rpt).

- No clockless or constant-clock register pins were reported.
- No unconstrained internal maximum-delay endpoints were reported.
- No missing synchronous input delays, output delays or partial I/O delays
  were reported.
- `rst_ni` is the one input without an input delay and is explicitly false-pathed.
  The timing report's ignored recovery/removal paths end at reset synchronizer
  clear pins. They are intentional exceptions, not missing synchronous bus
  constraints.
- No combinational or latch loops were reported. This resolves the specific
  structural concern raised by earlier Verilator UNOPTFLAT warnings for this
  synthesized configuration.
- One propagated clock, `core_clk`, is reported at a 20 ns period.
- No disconnected generated clocks or multiple-clock register pins were reported.
- `Timing 38-242` remains: `HD.CLK_SRC` is unset on `clk_i`, limiting OOC clock
  delay/skew estimation. The enclosing clock integration context must be
  defined for implementation; an arbitrary site assignment is not a substitute.
- `report_methodology` was not run. The timing report says no methodology
  report is available; this review therefore cannot claim methodology checks passed.
- Only the first 100 `Synth 8-7129` messages were printed. The supplied unused
  ports were reviewed against the configuration, but unseen occurrences cannot
  be classified from this log.

## Next step

The original core has since been synthesized with matching sources, wrapper,
configuration, tool, part, constraints and synthesis options. See the
[comparison](../comparison.md) for incremental resource cost and baseline timing.

Then define the clock integration context and perform placement and routing
to assess implemented timing and hold closure. If the target still fails,
evaluate combinational datapath optimizations against the single-cycle task
requirements. Multicycle or pipelined alternatives change the integration
contract and should be discussed explicitly rather than inserted silently.

Power, implemented Fmax, full-core regression coverage and the final report
remain pending. No additional RTL simulation or Vivado run was performed as
part of this review; the conclusions above are from the saved reports.
