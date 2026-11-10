# Power archive review: input activity must be checked again

The archive imported in `7c9d575` contains two completed vectorless power
runs. File hashes, source revisions, checkpoint fingerprints and reopened
resource/routing/timing metrics agree with the saved evidence. The current
input activity evidence is insufficient for the intended controlled power
comparison. The values below remain provisional; do not use them as final
power results or as the source for a final power figure.

| Reported estimate | Baseline | With isqrt |
|---|---:|---:|
| Total on-chip | 83 mW | 100 mW |
| Dynamic | 15 mW | 32 mW |
| Device static | 68 mW | 68 mW |
| Overall confidence | Medium | Medium |

These are rounded tool outputs, not measurements. A 17 mW difference and
about 20.5% total increase can be calculated from the displayed values, but
the requested activity overrides have not been verified. Components shown
as `<0.001 W` in the raw reports must not be treated as zero.

## What prevented acceptance

Both full `vivado.log` files show 100 logged `Power 33-294` port-connectivity
warnings. The messages occur during `set_switching_activity`, including the
reset/fetch-enable and interrupt/error/debug overrides. The log then limits
further instances, so 100 is the displayed count, not necessarily the total
number of affected objects. Both `input_activity.rpt` files contain only a
newline. The saved XDC records requested commands but does not demonstrate
that the connected logic received those values.

The successful `report_power` command reports zero messages for its own
propagation step; that does not cancel the earlier setting warnings. The
confidence table says more than 95% of input activity is user specified,
but this does not replace a per-input readback of the intended overrides.
Internal activity is Medium confidence with less than 25% explicitly
specified; there is no simulation activity file.

Each advisory table contains 50 Low, 14 Medium and 2 High rows. These are
listed advisory rows, not endpoint or coverage counts. They include inferred
internal control activity that is not a measured execution workload. The
reported clock buffer enable is 99.80% in both designs, also a model result.

## Conditions and provenance

- Vivado 2024.2, build 5239630, xc7a35tcsg324-1; typical process, commercial grade.
- The reports retain the 20 ns clock assumption (50 MHz). Both original
  routed timing summaries still fail.
- Junction temperature is fixed at 25.0 C. Although the original command
  also requested ambient 25 C, `operating_conditions.rpt` shows 24.7 C;
  the power report shows 24.6 C baseline / 24.5 C extended. Report the actual
  values. The retry specifies junction temperature only and treats ambient
  as derived rather than an independently fixed condition.
- Both operating-condition reports use Vccint 1.000 V and Vccaux 1.800 V,
  airflow 250 LFM, medium heatsink and board, and 12-to-15 board layers.
  These are tool/device modeling settings, not a real board specification.
- The Ubuntu audit matches both synthesis hashes. Current routed fingerprints:
  baseline `5088f6addc8649a2c9f19e28d5cedb76244fd5611d67e76b918cb72179f9f804`;
  extended `b623ff4eaa564018dcb8b2db0792dbf90e3e96c06e8e3e281ece81c6987033a6`.
  The Mac has text evidence, not the DCP files themselves. Fingerprints are
  not comparisons with original archived routed hashes.
- The baseline recovered log matches the already archived completed log.
  No successful original extended implementation launch log was recovered.
- External clock and physical interface context remain incomplete;
  `Constraints 18-8777` remains unresolved.

## Reproduce this review

```sh
python3 -B scripts/review_fpga_power.py
```

`archive_review.json` contains the parsed values, issues and qualification;
`archive_review_manifest.json` fingerprints its sources and generator. The
review checks every file listed in each receipt, source code at the recorded
Git revision, the shared audit and implementation review, recovered logs and
reopened metrics. It intentionally leaves the raw archive and receipts intact.

## Follow-up

The corrected flow applies activity to each connected non-clock input net and
requires explicit numerical readback before and after propagation. It saves
`input_bindings.tsv` with a port-to-net mapping. A blank/default/mismatched
readback fails; a new `Power 33-294` warning also prevents acceptance. All
93 input bits must be covered: 68 data/handshake bits at 6.25 Mtr/s and
probability 0.5, two controls held high, and 23 IRQ/debug/error bits held low.

Reopen the same saved routed checkpoints for both variants using a new
`build/fpga/power_attempt3` directory. Preserve this archive. No synthesis or
implementation rerun is required. Review the new activity and power evidence
before generating the final comparison figure. The model remains generic
vectorless activity even after successful readback; it does not establish
workload power, energy per instruction, board power or operation at 50 MHz.
