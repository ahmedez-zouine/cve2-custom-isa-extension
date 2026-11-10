# Routed OOC evidence for review

This directory is the destination for the original and isqrt implementation
reports from the Ubuntu Vivado host. Report files must be copied from the
completed runs; terminal excerpts alone are insufficient for the final analysis.

Both report sets are now archived. The [comparison review](comparison.md)
distinguishes internal paths, interface paths and physical-context limitations.
The [JSON](implementation_results.json), [CSV](implementation_metrics.csv) and
[review manifest](review_manifest.json) retain the parsed numerical evidence
and raw-file hashes. Reproduce them with:

```sh
python3 -B scripts/summarize_fpga_implementation.py
```

From the repository root on Ubuntu:

```sh
for variant in baseline extended; do
  src="build/fpga/implementation/$variant"
  dst="output/fpga/implementation/$variant"
  mkdir -p "$dst"
  cp "$src"/*.rpt "$src"/*.txt "$src"/*.tcl "$src"/*.xdc \
    "$src"/*.log "$src"/*.jou "$dst/"
  if [ -f "$src/synthesis_source_manifest.json" ]; then
    cp "$src/synthesis_source_manifest.json" "$dst/"
  fi
done
```

Check that both variants have `implementation_info.txt`, `route_status.rpt`,
`timing_summary.rpt`, `register_setup_paths.rpt`, `check_timing.rpt`,
`methodology.rpt`, `drc.rpt` and `utilization.rpt` before committing the export.
Keep the DCP files and Vivado cache on the Vivado host under ignored `build/`.

The metadata records the input checkpoint hash, synthesis provenance, driver
revision and flow settings. The copied Tcl and XDC files describe the actual
run and implemented constraints. Review setup, hold and pulse-width checks,
path endpoints, unconstrained paths, DRC and methodology findings. A completed
flow with negative slack remains a timing failure under its reported model.

## Known limitations and log history

- Both runs analyze an OOC core without a defined external `HD.CLK_SRC`.
- `Route 35-198` warns that exposed module ports lack `HD.PARTPIN_LOCS`.
  Interface routing and timing are incomplete. A zero routing-error count
  applies to the routable nets and does not establish physical interface closure.
- Review internal register paths separately from whole-design summaries.
  A data-path delay includes all logic on that path and its interconnect;
  it is not necessarily the delay of the isqrt block alone.
- `Constraints 18-8777` appeared during router design construction. Its root
  cause and significance remain unresolved; retain the complete log context.
- The extended implementation completed before a subsequent retry was refused.
  That retry replaced its main `vivado.log` with the overwrite-protection
  message. No successful extended implementation launch-log backup is present
  in the imported archive. The review records that gap; the retry log retains
  its original contents and filename.
- The baseline synthesis build log was stale. Its implementation driver can
  recover the archived successful synthesis log after matching the saved run
  metadata, and preserves the stale log as `synthesis_rejected_build.log`.

Exporting these files preserves evidence for review. It does not establish
timing closure, an implemented Fmax, power, or board operation. Current FPGA
figures still describe synthesis; routed figures require a separate review of
these reports and their limitations.

See the [FPGA guide](../../../fpga/README.md) for the complete flow and
[AMD context-constraint documentation](https://docs.amd.com/r/en-US/ug905-vivado-hierarchical-design/Context-Constraints)
for the OOC interface-routing requirements.
