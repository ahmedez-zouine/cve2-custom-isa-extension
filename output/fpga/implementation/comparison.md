# Original and isqrt core: routed OOC comparison

The extended core uses 1,218 more whole-design LUTs (+40.8%) after routing.
Its worst reported register setup path traverses `isqrt_comb` and has
-29.556 ns slack at the 20 ns target. The original core's worst reported
register setup path has +0.058 ns slack. Both complete design reports fail
timing, and the OOC interface and external clock context remain incomplete.
These runs do not establish an implemented Fmax or board timing closure.

## Conditions and evidence

The raw reports were imported in commit `921fe3a`. Both runs use Vivado 2024.2,
build 5239630, on Ubuntu 24.04.5 LTS, with `cve2_fpga_top` targeting
`xc7a35tcsg324-1`. Both use a 20 ns clock, maximum I/O delays of 4 ns,
minimum delays of 0 ns, and a false path from the external reset.

The extended driver is recorded at `91bf174`; the baseline driver at
`8683f7c`. The archived copies match those Git objects. Their physical-flow
bodies are identical: `opt_design`, `place_design`, `phys_opt_design` and
`route_design`, all with Default directives and four threads. Their differences
handle synthesis-log recovery and metadata. The exported XDC command lists
also match after removing comments and blank lines; neither adds an isqrt
timing exception.

The copied synthesis metadata and logs match the previously reviewed synthesis
archives. The baseline source manifest matches that archive, and all 180 file
hashes were checked against the recorded Git objects. The baseline and extended
core source revisions differ only in the three extension RTL files.

The [parsed JSON](implementation_results.json) includes all ten paths from
each setup, register-setup and hold report. The [CSV](implementation_metrics.csv)
exports numerical metrics. The [review manifest](review_manifest.json) records
the generator hash, hashes of all 46 raw archive files, synthesis-reference
hashes and the generated data hashes. It preserves the input evidence without
modifying the raw reports.

## Resources after routing

Sources: [original utilization](baseline/utilization.rpt) and
[extended utilization](extended/utilization.rpt). These are top-level Total
LUTs and FFs, including the wrapper.

| Resource | Original | With isqrt | Change |
|---|---:|---:|---:|
| Total LUTs | 2,987 | 4,205 | +1,218 (+40.8%) |
| Flip-flops | 1,961 | 1,965 | +4 |
| DSP blocks | 1 | 1 | 0 |
| RAMB36 / RAMB18 | 0 / 0 | 0 / 0 | 0 |
| LUTRAM / SRL | 0 / 0 | 0 / 0 | 0 |

The existing multiplier accounts for the DSP in both runs. The mapped FF
difference includes implementation effects; the flow did not add an RTL
pipeline stage to isqrt. Module rows cannot isolate isqrt area because
optimization combines and moves logic across the rebuilt hierarchy.

The [synthesis comparison](../comparison.md) measured 3,034 versus 4,178 LUTs
(+37.7%). The routed comparison uses a later physical stage. Keep both stage
labels: comparing original synthesis against extended routing would mix metrics
from different implementation stages.

## Complete design timing summaries

Sources: [original timing](baseline/timing_summary.rpt) and
[extended timing](extended/timing_summary.rpt).

| Metric | Original | With isqrt |
|---|---:|---:|
| Setup WNS | -0.884 ns | -29.556 ns |
| Setup TNS | -0.884 ns | -10,297.101 ns |
| Failing / total setup endpoints | 1 / 5,944 | 2,970 / 5,954 |
| Hold WHS | -2.232 ns | -2.168 ns |
| Hold THS | -257.150 ns | -247.826 ns |
| Failing / total hold endpoints | 131 / 5,944 | 128 / 5,954 |
| Worst pulse-width slack | +9.500 ns | +9.500 ns |
| Failing / total pulse-width endpoints | 0 / 1,962 | 0 / 1,966 |

Both summaries state that timing constraints are not met. The extended WNS is
28.672 ns lower than the original WNS, but these summaries have different
critical endpoints and do not isolate the square-root unit's delay.

The original worst setup path is input-to-output:
`irq_fast_i[7]` to `instr_addr_o[2]`. Its reported datapath delay is 12.849 ns,
with 4 ns input and 4 ns output delay assumptions. That path is affected by
the incomplete OOC boundary model. The original worst register setup path is
a different path and has positive reported slack.

## Internal register setup paths

Sources: [original register paths](baseline/register_setup_paths.rpt) and
[extended register paths](extended/register_setup_paths.rpt).

| Worst reported register setup path | Original | With isqrt |
|---|---:|---:|
| Slack | +0.058 ns | -29.556 ns |
| Data-path delay | 19.672 ns | 49.387 ns |
| Logic delay | 4.599 ns | 15.399 ns |
| Routing delay | 15.073 ns | 33.988 ns |
| Logic levels | 27 | 83 |
| CARRY4 elements on this path | 8 | 50 |

The original path starts at IF instruction register bit 6 and ends at a
prefetch FIFO register's clock-enable pin. The extended path starts at the LSU
`handle_misaligned_q_reg_replica` and ends at register-file x8 bit 0. Its
trace explicitly contains `isqrt_comb.sq_root1` and `isqrt_comb.sq_rem26_out`.
The reported setup failure therefore includes an internal path through the
square-root logic; it is not explained solely by the exposed bus boundaries.

The 49.387 ns delay covers the complete path, including selection logic and
routing. It is not an isolated delay of the isqrt block. Static timing gives
this path a single-cycle requirement. A false-path or multicycle exception
would require a demonstrated functional justification. None is applied here.
The external clock-source limitation still applies to these timing results.

## Hold paths, routing and constraint checks

All ten reported worst hold paths in each [original](baseline/hold_paths.rpt)
and [extended](extended/hold_paths.rpt) report begin at input ports and have
zero logic levels. The worst starts at `instr_rdata_i[11]` in the original
and `instr_rdata_i[20]` in the extended core, ending at FIFO data-register D
pins. These are interface paths and remain affected by missing boundary routes
and external clock context. This observation does not establish that every
internal hold check passes.

| Route status | Original | With isqrt |
|---|---:|---:|
| Fully routed / routable nets | 4,806 / 4,806 | 5,883 / 5,883 |
| Nets with routing errors | 0 | 0 |
| Implicitly routed ports | 132 | 132 |

Sources: [original routing](baseline/route_status.rpt) and
[extended routing](extended/route_status.rpt). The routable-net totals exclude
the unmodeled boundary connections. `Route 35-198` warns that ports have no
`HD.PARTPIN_LOCS`, preventing accurate interface routing and timing. Zero
routing errors therefore does not establish complete interface closure.

Both [original](baseline/check_timing.rpt) and
[extended](extended/check_timing.rpt) constraint checks report zero missing
register clocks, unconstrained internal maximum-delay endpoints, partial I/O
delays, combinational loops or latch loops. `rst_ni` is the single input with
no delay and an intentional false path. The clock reports identify one
propagated 20 ns clock. These logical checks do not validate the missing
physical boundary or external clock context.

## DRC and methodology findings

The [original DRC](baseline/drc.rpt) and [extended DRC](extended/drc.rpt)
have identical detail sections: six warning entries and no error-level entries
in the archived default-ruledeck reports.

| DRC rule | Count in each run | Meaning in this design |
|---|---:|---|
| CFGBVS-1 | 1 | Configuration-bank voltage properties are undefined; no board voltage context is specified |
| DPIP-1 | 3 | Existing multiplier DSP input stages are not pipelined |
| DPOP-1 | 1 | Existing multiplier DSP output PREG stage is unused |
| DPOP-2 | 1 | Existing multiplier DSP MREG stage is unused |

The DSP warnings name `cve2_multdiv_fast/mac_res_signed`. Changing its pipeline
register settings requires a separate latency and protocol review. Its presence
does not imply that isqrt uses a DSP. Board configuration voltage values must
come from the intended hardware configuration.

The methodology summaries contain 129 TIMING-15 large-hold entries in the
[original run](baseline/methodology.rpt), and 127 TIMING-15 plus 1,000
TIMING-16 large-setup entries in the [extended run](extended/methodology.rpt).
These are methodology entries, not the failing endpoint counts in the timing
summary. They must not be substituted for the endpoint counts above.

`Constraints 18-8777` appears during router design construction in the
baseline log. The router continued, but the warning's root cause and effect
remain unresolved. The extended successful launch log is missing, so its full
warning history cannot be independently checked from this archive.

## Provenance limits and next use

The baseline [launch log](baseline/vivado.log) records completion at 17:51:28
UTC, matching its [metadata](baseline/implementation_info.txt). Its successful
synthesis log was recovered from the matching reviewed archive; the stale build
log is preserved separately.

The extended [metadata](extended/implementation_info.txt) records completion
at 17:41:49 UTC and agrees with the routed report times. Its current
[launch log](extended/vivado.log) instead records a refused retry at 17:42:06.
No successful extended implementation launch-log backup is present in the
export. The archived reports support the numerical analysis, with that log
gap stated explicitly. The original log has not been reconstructed or relabelled.

Both metadata files record input checkpoint SHA-256 hashes. The DCP files
remain on Ubuntu and were not exported, so those hashes cannot be independently
recomputed from this checkout.

These results support a discussion of the combinational unit's area and timing
cost. They do not establish a realized FPGA benchmark speedup, implemented
Fmax, power or board operation. The RTL benchmark cycle ratio remains a separate
simulation result. Complete clock/interface context, hold review and resolution
of the tile warning remain necessary for a stronger physical timing claim.

Regenerate the reviewed data and run its checks from the repository root:

```sh
python3 -B scripts/summarize_fpga_implementation.py
python3 -B -m unittest discover -s scripts -p test_summarize_fpga_implementation.py -v
```

The existing figures retain their synthesis scope. New routed figures should
read the reviewed data above and carry the same OOC limitations.
