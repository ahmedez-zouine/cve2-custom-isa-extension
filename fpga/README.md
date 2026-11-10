# CVE2 FPGA synthesis preparation

This directory prepares an out-of-context (OOC) synthesis of the extended core
using Vivado and a Xilinx 7-series part. Select the actual part supported by your
installation. The first extended-core synthesis used `xc7a35tcsg324-1`;
this is the selected comparison target, not a prescribed physical board.

The wrapper uses the simulation's RV32IMC configuration: fast multiplier,
FF register file, zero optional HPM counters, and CV-X-IF disabled. Its live
instruction/data ports keep the processor connected to an external system.
Interrupt and debug inputs remain exposed. It has no memory or board peripherals.
Reset asserts asynchronously and releases through two flops on the input clock.

The FPGA source list replaces the simulation clock gate with `BUFGCE`. Vivado
provides this primitive. The testbench and tracing modules are excluded.
The simulation source list and core RTL are unchanged.

The script reclassifies `Synth 8-11067` as INFO: package parameters act as local
constants. The messages remain in the log. This changes reporting only; it
does not edit the upstream package RTL or suppress other warning IDs.

The [synthesis comparison](../output/fpga/comparison.md) shows 3,034 LUTs before
the extension and 4,178 after it (+37.7%). FFs change from 1,961 to 1,962;
both runs use one DSP and no BRAM. Estimated setup slack changes from +2.994 ns
to -30.800 ns at a 20 ns clock target. The extended critical path traverses the
combinational isqrt unit. Both runs have hold violations. These results establish
neither full timing closure nor implemented Fmax.

## Run on a machine with Vivado

Vivado is a separately licensed AMD tool and is not included in this repository,
the Python virtual environment, or a standard GitHub Codespace image. Run this
flow on a Linux host where Vivado has been installed and licensed. If the
`vivado` command is not found, source the settings script from the installation
before running the flow:

```sh
# Replace 2024.2 with the installed version, or use the installation's actual path.
source /tools/Xilinx/Vivado/2024.2/settings64.sh
vivado -version
```

If Vivado was installed elsewhere, locate `settings64.sh` under its install
directory and source that file instead. Run `source` in each new terminal, or
add the exact settings-script path to your shell startup file if Vivado should
be available in every interactive shell. Verify the setup with `command -v
vivado` and `vivado -version`.

Then, from the repository root:

```sh
# Example part only; replace it with your selected 7-series part.
mkdir -p build/fpga/extended
vivado -mode batch -source fpga/synth.tcl \
  -log build/fpga/extended/vivado.log \
  -journal build/fpga/extended/vivado.jou \
  -tclargs xc7a35tcsg324-1
```

The target period in `core.xdc` is 20 ns, corresponding to 50 MHz. The XDC assumes
synchronous external bus logic with maximum input/output delays of 20% of
the period and minimum delays of zero. These are comparison assumptions,
not board timing specifications. Check the clock and unconstrained-path reports.
The `get_ports -filter` query excludes clock and asynchronous reset from bus
input delays; `remove_from_collection` is not supported in Vivado XDC.

Reports appear in `build/fpga/extended/`:

| File | Purpose |
|---|---|
| `utilization.rpt` | LUT, FF, DSP and memory usage, including hierarchy |
| `timing_summary.rpt` | Estimated setup/hold timing and unconstrained paths |
| `check_timing.rpt` | Missing or incomplete timing constraints |
| `clocks.rpt` | Clock recognition and propagation |
| `post_synth.dcp` | Synthesized design checkpoint |
| `run_info.txt` | Tool, part, period, Git revision and working tree state |

Each run replaces these reports. Archive a run before starting another.
The first reported Vivado run completed synthesis but rejected the input-delay
selection in an earlier XDC revision. Its timing reports are incomplete and
must be regenerated with the corrected constraints.
Timing here uses estimated routing. Placement and routing and a power estimate
with stated activity are later steps. This flow does not generate a board
bitstream or establish FPGA frequency or power results.

Vivado may warn that `HD.CLK_SRC` is unset for `clk_i`. There is no enclosing
board design defining the external clock-buffer location yet. Clock delay/skew
estimation is limited until that integration context is defined; do not silence
the warning with an arbitrary site or interpret this run as timing sign-off.

## Prepare and synthesize the original-core baseline

From the main checkout, using Python 3:

```sh
python3 scripts/prepare_fpga_baseline.py
mkdir -p build/fpga/baseline
vivado -mode batch -source fpga/synth.tcl \
  -log build/fpga/baseline/vivado.log \
  -journal build/fpga/baseline/vivado.jou \
  -tclargs xc7a35tcsg324-1 baseline
```

The helper reads the reference revision from the saved extended-run
[`run_info.txt`](../output/fpga/extended/run_info.txt). It exports that revision's
FPGA sources and headers into `build/fpga/baseline_src/`, then restores only
`cve2_pkg.sv`, `cve2_decoder.sv` and `cve2_alu.sv` from the original import
`af1e7b4fcab772e1976f41f36b38ced25cb9f377`. Git history confirms those are the
only changes under `cve2/` between the original and measured revisions. The
wrapper, clock gate, source list, headers and constraints match the measured run.

This is an isolated source snapshot; it has no separate Git branch or `.git`
directory. The main checkout's RTL is unchanged. The helper records file
SHA-256 hashes in `source_manifest.json`, reuses an identical existing snapshot,
and refuses to replace one with changed or missing files. Keep the full Git
history available: both recorded revisions must exist locally.

The optional second Tcl argument is `extended` (default) or `baseline`.
Baseline mode verifies the prepared sources before synthesis and writes only
to `build/fpga/baseline/`. It also copies the source manifest, source identity
and synthesis driver into that report directory. In the baseline metadata,
`revision` identifies the controlling checkout; `rtl_revision` and
`flow_reference_revision` identify the prepared sources and matching flow.

Use Vivado **2024.2** and the **same part and 20 ns target** as the existing
extended result. Both runs retain the same OOC clock-context limitation until
implementation. The [saved comparison](../output/fpga/comparison.md) records
the completed baseline run. Do not change the clock period or enable optional
counters to improve just one side of the comparison.

After reviewing the new run, export its text evidence for GitHub:

```sh
mkdir -p output/fpga/baseline
cp build/fpga/baseline/*.rpt build/fpga/baseline/run_info.txt \
  build/fpga/baseline/source_info.txt build/fpga/baseline/source_manifest.json \
  build/fpga/baseline/synth_driver.tcl build/fpga/baseline/vivado.log \
  output/fpga/baseline/
```

Keep the checkpoint and prepared RTL under the ignored `build/` directory.
The report export is for a successful run; retain the log and inspect errors
first if synthesis or report generation fails.

Check the log's command, date and completion message before exporting it.
If a run omitted `-log`, its log is `vivado.log` in the working directory;
the file under `build/fpga/baseline/` may still belong to an earlier run.
Vivado's `.Xil/` cache and root logs are ignored. The selected evidence in
`output/fpga/` remains tracked.

References: AMD's [BUFGCE primitive](https://docs.amd.com/r/en-US/ug953-vivado-7series-libraries/BUFGCE),
[OOC synthesis command](https://docs.amd.com/r/2023.1-English/ug835-vivado-tcl-commands/synth_design),
and [timing summary](https://docs.amd.com/r/en-US/ug906-vivado-design-analysis/Report-Timing-Summary).
