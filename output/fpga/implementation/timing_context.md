# Timing context and supported conclusions

## Evaluation decision

Retain the recorded standalone OOC comparison as an exploratory area and
worst-slack study. The 20 ns target is an experimental condition; passing
50 MHz is not a separate task requirement. Report negative slack directly,
with the interface and external-clock limitations below. A maximum-frequency
claim is not supported by these runs.

The baseline and extended core use the same recorded configuration, part,
constraint commands and physical implementation flow. Any later change to
the harness, clock period or physical constraints requires a new matching
pair of runs, separately archived from these results.

## Recorded model

| Item | Both recorded runs |
|---|---|
| Tool | Vivado 2024.2, build 5239630 |
| Device | Artix-7 xc7a35tcsg324-1 |
| Top | cve2_fpga_top, out of context |
| Clock | core_clk, 20 ns, defined on clk_i |
| Input delay assumption | 4 ns maximum, 0 ns minimum, excluding clock and reset |
| Output delay assumption | 4 ns maximum, 0 ns minimum |
| Reset exception | False path from external rst_ni |
| External HD.CLK_SRC | Unset |
| Physical partition-pin locations | Not specified |
| Board pin/voltage model | Not defined |

The I/O delays describe an assumed synchronous environment. They are not
measurements of a particular memory, board trace or peripheral. The local
clock-buffer placement does not supply the missing enclosing clock context.

`HD.PARTPIN_LOCS` and `HD.PARTPIN_RANGE` describe physical module-interface
locations in an OOC flow. They are not package-pin assignments. Meaningful
locations must follow the intended enclosing design; a nominal location
added only to remove a warning would change the experiment without supplying
that design context.

## What can be reported

- Whole-design utilization at the specified synthesis and routed stages.
- Overall setup/hold/pulse slack and endpoint counts under the recorded model.
- The separately filtered register setup paths, with their endpoints stated.
- The extended internal critical path through `isqrt_comb`, with reported
  49.387 ns data-path delay and -29.556 ns setup slack.
- The original worst register setup path's +0.058 ns slack, alongside its
  failing overall setup and hold results.
- The distinction between simulated instruction cycles and physical timing.

These observations do not establish complete clock/interface timing closure,
implemented Fmax, a functioning board or a realized FPGA benchmark speedup.
The [comparison](comparison.md) and raw reports retain the failed checks.

## Remaining evidence and warning questions

`Route 35-198` identifies unlocated OOC ports whose boundary segments are not
accurately routed. The ten worst reported hold paths in each design are
input-to-register paths and remain affected by this interface model.
Internal register setup paths must still be read with the external-clock
limitation in mind; positive filtered slack does not establish full closure.

`Constraints 18-8777` appears during router design construction before router
initialization. The router subsequently completed, but the warning's exact
cause and effect remain unresolved. Keep this uncertainty in the analysis.
The current evidence does not justify suppressing it or asserting that it is
harmless.

The successful extended implementation launch log is absent from the imported
archive. Its metadata and routed reports agree on completion times, while the
current launch log describes a later refused retry. The new audit searches
the repository-root and build-directory Vivado logs as well as the archive.
A matching original log is copied into a separate audit bundle, preserving
the raw report directories and their existing manifests.

## Checkpoints before further analysis

The implementation metadata records the SHA-256 hash of each input synthesis
checkpoint. The audit recomputes it where the checkpoint exists. A mismatch
blocks further use of that working checkpoint until its provenance is reviewed.
An unavailable file is reported as unavailable, never as a verified match.

The audit also fingerprints each current routed checkpoint. There is no archived
routed-checkpoint hash to compare against, so that fingerprint does not by
itself prove correspondence to the archived reports. The next Vivado analysis
must check its part, clock, design state and source association before use.

Power remains a required missing result. A subsequent power estimate needs
explicit activity and operating assumptions applied consistently to both
designs. It must retain the timing-context limits and distinguish a tool
estimate from measured operating board power.

Audit commands and export steps are in the [FPGA guide](../../../fpga/README.md).
The context-property definitions are described in
[AMD UG905](https://docs.amd.com/r/en-US/ug905-vivado-hierarchical-design/Context-Constraints).
