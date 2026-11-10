# CVE2 FPGA synthesis and implementation

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

## Place and route the saved synthesis checkpoints

`implement.tcl` continues each successful synthesis checkpoint through
`opt_design`, `place_design`, `phys_opt_design` and `route_design`, using the
Default directives and four threads for both variants. It opens the checkpoint
with its saved OOC mode and constraints. It checks the part, clock period,
variant metadata, synthesis completion log and Vivado version before running.
It records a SHA-256 hash of the input checkpoint and copies its synthesis
metadata and log into the new report directory.

Run this on the Vivado host where the synthesis checkpoints were generated.
GitHub contains the text reports; the DCP files remain under `build/` on that
host. The existing comparison uses Vivado 2024.2, `xc7a35tcsg324-1` and a 20 ns
clock. Load that Vivado installation, then run from the repository root:

```sh
ls -lh build/fpga/extended/post_synth.dcp build/fpga/baseline/post_synth.dcp
mkdir -p build/fpga/implementation/extended
vivado -mode batch -source fpga/implement.tcl \
  -log build/fpga/implementation/extended/vivado.log \
  -journal build/fpga/implementation/extended/vivado.jou \
  -tclargs extended
```

Inspect the extended run before starting the baseline:

```sh
tail -n 25 build/fpga/implementation/extended/vivado.log
cat build/fpga/implementation/extended/implementation_info.txt
cat build/fpga/implementation/extended/route_status.rpt
```

Then use the same flow for the baseline:

```sh
mkdir -p build/fpga/implementation/baseline
vivado -mode batch -source fpga/implement.tcl \
  -log build/fpga/implementation/baseline/vivado.log \
  -journal build/fpga/implementation/baseline/vivado.jou \
  -tclargs baseline
```

The earlier baseline run wrote its successful log to the repository root; its
`build/fpga/baseline/vivado.log` may still describe the failed preparation.
When the build log lacks a synthesis completion line, the script checks
`output/fpga/baseline/` for the archived successful log. It uses that log only
when the archived and build `run_info.txt` contents match (ignoring surrounding
whitespace) and the archived log has a standalone synthesis completion line.
Mismatched metadata or an unsuccessful archive stops the run. The selected log
path is recorded in `implementation_info.txt`; the stale build log is preserved
as `synthesis_rejected_build.log` in the implementation directory. The build
inputs remain intact. The same rule applies to either variant.

An existing `implementation_info.txt` causes the script to stop before changing
the design. Preserve and rename that variant's implementation directory before
another attempt, including after a failed run. The launch log can be rewritten
by Vivado before the Tcl script starts, so archive the directory before
relaunching the command.

The implementation reports live in `build/fpga/implementation/<variant>/`:

| File | What to review |
|---|---|
| `route_status.rpt` | Unrouted, partially routed or conflicting internal connections |
| `timing_summary.rpt` | Routed setup, hold and pulse-width slack, failing endpoints and unconstrained paths |
| `setup_paths.rpt`, `hold_paths.rpt` | Ten worst paths with clock details |
| `register_setup_paths.rpt` | Ten worst register-to-register setup paths |
| `utilization.rpt` | Resources after physical optimization and routing |
| `check_timing.rpt` | Missing constraints, clocks and timing loops |
| `methodology.rpt`, `drc.rpt` | Methodology issues and physical design rule violations |
| `clocks.rpt`, `clock_utilization.rpt` | Clock definitions and buffer placement |
| `implemented_constraints.xdc` | Constraints exported from the implemented design |
| `implementation_info.txt` | Start/end state, input DCP hash, tool, settings and limitations |
| `synthesis_run_info.txt`, `synthesis_vivado.log` | Provenance of the input synthesis run |
| `synthesis_rejected_build.log` | Stale build log, retained when archive recovery is used |
| `post_place.dcp`, `post_route.dcp` | Checkpoints for inspection in Vivado |

`status: reports_generated` means all script commands finished. Review routing
completeness, DRC and every timing check before accepting a result. Negative
WNS is a setup failure; negative WHS is a hold failure. A run that finishes can
still violate timing. Do not fill the comparison with expected numbers: the
routed LUT count, slack and critical path must come from these new reports.

This remains OOC module analysis. The external `HD.CLK_SRC` clock location and
board interfaces are undefined. Internal routed delays provide additional
evidence, while complete clock timing and board sign-off require an enclosing
design with reviewed constraints. Keep that limitation in any report, including
if the new slack is positive. These scripts do not calculate an implemented
Fmax, generate a board bitstream or estimate power. Power needs its own stated
activity and operating conditions.

### OOC boundary routing warnings

`Route 35-198` means a module port has no `HD.PARTPIN_LOCS` interconnect
location. In this module-analysis flow, its interface net is not partially
routed to a defined boundary. Timing paths starting or ending at that port
are therefore incomplete. The same warning can appear once for each bus bit.
The router's fully routed-net count excludes these unmodeled boundary routes;
zero routing errors does not establish complete interface routing.

Review `register_setup_paths.rpt` separately from the overall timing summary.
Register-to-register paths provide evidence about the internal datapath, while
the missing external clock context still limits their clock timing analysis.
Inspect path endpoints before attributing any worst slack to the isqrt unit.
Use a reviewed enclosing system, or physically defined OOC interface and clock
constraints, for complete timing evaluation. Boundary locations should follow
that integration context and match between the baseline and extended runs.

The separate `Constraints 18-8777` message says required files for tile splitting
are unavailable. Its cause has not been established from the reported warning
excerpt; preserve the surrounding log and identify the emitting command before
accepting or dismissing its effect.

Export both completed runs for review, keeping their text evidence separate
from synthesis. The [implementation archive guide](../output/fpga/implementation/README.md)
describes the known log history and review requirements.

```sh
for variant in extended baseline; do
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

This export preserves existing synthesis evidence and leaves the DCP files in
`build/`. The current figure generator reads the archived synthesis pair; routed
results must be reviewed and integrated explicitly before plotting them.
The extended run's later rejected retry replaced its main launch log. Preserve
any `vivado_*.backup.log` and `.jou` files alongside that retry log; identify the
successful original log before citing it as evidence of implementation completion.

## Audit timing context, checkpoints and missing logs

The [timing-context decision](../output/fpga/implementation/timing_context.md)
retains the measured OOC study with its explicit limits. Worst slack is the
reported timing metric. The 20 ns experiment does not establish complete
clock/interface closure or implemented Fmax.

Before further analysis, run this on the Ubuntu host with the checkpoints:

```sh
python3 -B scripts/audit_fpga_context.py --out-dir output/fpga/context_audit/ubuntu
cat output/fpga/context_audit/ubuntu/summary.txt
```

The standard-library script verifies the reviewed input hashes and reparses
the archived reports. It checks the current synthesis DCP hashes against the
recorded implementation metadata and fingerprints the routed DCPs. A missing
file remains unverified; a mismatch causes a nonzero exit status. A routed
fingerprint has no old routed hash to compare against, so its design identity
still needs checking in Vivado before power analysis.

The script also searches `vivado*.log` in the repository root, each variant's
implementation build directory, and its archived report directory. It copies
matching completed-run logs into `recovered_logs/` inside the audit output.
Matching requires a standalone completion line for the recorded output
directory, the tool and variant command, matching run times, and no error-level
message. The known Ubuntu log times are interpreted as UTC. Files that do not
match are listed with rejection reasons in `audit.json`.

The audit leaves existing raw reports, logs, constraints and checkpoints intact.
It does not launch Vivado, repair physical constraints or change a failing
timing result. Review recovered candidates before adopting them into the main
implementation archive or refreshing its manifests and figures.

After reviewing the Ubuntu output, transfer only the audit bundle:

```sh
git add -- output/fpga/context_audit/ubuntu
git commit -m "Archive Ubuntu timing context and checkpoint audit"
git push origin Master
```

On a machine without the checkpoints, the default command writes an incomplete
local audit under ignored `build/fpga/context_audit/`. Script checks can be run
without Vivado:

```sh
python3 -B -m unittest discover -s scripts -p test_audit_fpga_context.py -v
```

## Estimate power from the audited routed checkpoints

Power analysis is prepared in `fpga/power.tcl` and
`scripts/run_fpga_power.py`. Run it on the Ubuntu Vivado host after the context
audit has matched both synthesis checkpoints and fingerprinted both routed
checkpoints:

```sh
source ~/tools/Xilinx/Vivado/2024.2/settings64.sh
python3 -B scripts/run_fpga_power.py
```

The default command processes baseline, then extended. Use `--variant baseline`
or `--variant extended` to run just one. It reads
`output/fpga/context_audit/ubuntu/audit.json`, rechecks the input hashes, and
requires the same reviewed implementation evidence. It refuses to overwrite
an existing variant directory under `build/fpga/power/`. For a deliberate new
attempt, preserve the old directory and select a fresh parent, for example
`--out-dir build/fpga/power_attempt2`.

The Tcl flow opens each routed checkpoint without synthesis, placement,
routing or power optimization. It checks the tool, part, preserved core
hierarchy and clock, records the session design name, and saves
fresh resource, route and timing reports. The Python runner compares these
with the reviewed implementation pair; a mismatch marks the attempt failed
and preserves its files. Matching metrics strengthen the current checkpoint
identification, but cannot recover a missing original routed hash or launch log.

Both variants use this explicitly assumed vectorless scenario:

| Setting | Assumption |
|---|---|
| Clock | Original 20 ns constraint, assumed 50 MHz |
| Data and grant/valid inputs | 6.25 million transitions/s; probability of logic 1 = 0.5 |
| Reset / fetch enable | `rst_ni=1`, `fetch_enable_i=1`, no transitions |
| Interrupts, debug request, instruction/data errors | Logic 0, no transitions |
| Internal activity | Vivado propagation; no forced LUT/register activity or SAIF |
| Process / grade | Typical / commercial |
| Junction / ambient temperature | Fixed 25 °C / 25 °C |
| Voltages and remaining thermal settings | Reset to device/tool defaults; actual values saved in the operating-conditions report |

The input rate corresponds to the tool's usual 12.5% toggle assumption at
50 MHz. It is a generic comparison scenario, not activity measured from the
benchmark or a valid instruction stream. The clock follows timing constraints;
clock gating remains part of the design and the inferred power model. Check
its reported activity and advisories. Fixed junction temperature controls the
comparison; it does not predict the temperature of a particular board.

Both original routed timing summaries fail at 20 ns. Estimates at this assumed
frequency do not establish operation at 50 MHz. The OOC design lacks physical
I/O and external clock context, so a reported device total does not describe a
complete processor board. Device static power is not attributable solely to
the custom unit. No energy-per-instruction or workload power claim follows
from this model.

The session design name returned by `current_design` is not required to equal
the RTL module name. `checkpoint_identity.txt` records that name and the
checked `u_core` / `u_cve2_core` module references. Reopened report names may
use the original RTL top or the recorded session name; resource counts,
device, routing and timing comparisons still have to match.

Each new directory contains `power.rpt` (with confidence and advisories),
operating conditions, input/register/LUT activity, clocks, power constraints,
the reopened reports, driver/audit copies, Vivado log/journal and
`power_run.json` with settings and file hashes. A completed runner reports
`reports_generated_pending_power_review`: review operating voltages,
confidence, clock and control activity, annotation coverage and warnings
before accepting numerical values. No power result is supplied by this setup.

After both runs finish, inspect the reports:

```sh
sed -n '1,180p' build/fpga/power/baseline/power.rpt
sed -n '1,180p' build/fpga/power/extended/power.rpt
cat build/fpga/power/baseline/operating_conditions.rpt
cat build/fpga/power/extended/operating_conditions.rpt
```

Transfer the new text evidence and the Ubuntu audit for review, keeping DCP
files in `build/`:

```sh
for variant in baseline extended; do
  src="build/fpga/power/$variant"
  dst="output/fpga/power/$variant"
  mkdir -p "$dst"
  cp "$src"/*.rpt "$src"/*.txt "$src"/*.json "$src"/*.tcl "$src"/*.xdc \
    "$src"/*.log "$src"/*.jou "$dst/"
done
git add -- output/fpga/context_audit/ubuntu output/fpga/power
git diff --cached --stat
git commit -m "Archive vectorless FPGA power reports and Ubuntu checkpoint audit"
git push origin Master
```

References for power setup: AMD's [switching activity command](https://docs.amd.com/r/2024.2-English/ug835-vivado-tcl-commands/set_switching_activity),
[operating conditions](https://docs.amd.com/r/2024.2-English/ug835-vivado-tcl-commands/set_operating_conditions),
[power reporting](https://docs.amd.com/r/2024.2-English/ug835-vivado-tcl-commands/report_power),
and [activity reporting](https://docs.amd.com/r/2024.2-English/ug835-vivado-tcl-commands/report_switching_activity).

References for implementation: AMD's [implementation command sequence](https://docs.amd.com/r/2024.2-English/ug835-vivado-tcl-commands/place_design),
[opening a saved checkpoint](https://docs.amd.com/r/2024.2-English/ug835-vivado-tcl-commands/open_checkpoint),
[routing status](https://docs.amd.com/r/2024.2-English/ug835-vivado-tcl-commands/report_route_status),
[OOC context constraints](https://docs.amd.com/r/en-US/ug905-vivado-hierarchical-design/Out-of-Context-Design-Constraints),
[interface routing and partition-pin locations](https://docs.amd.com/r/en-US/ug905-vivado-hierarchical-design/Context-Constraints),
[BUFGCE primitive](https://docs.amd.com/r/en-US/ug953-vivado-7series-libraries/BUFGCE),
[OOC synthesis command](https://docs.amd.com/r/2023.1-English/ug835-vivado-tcl-commands/synth_design),
and [timing summary](https://docs.amd.com/r/en-US/ug906-vivado-design-analysis/Report-Timing-Summary).
