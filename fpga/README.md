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

The [reviewed synthesis reports](../output/fpga/extended/review.md) show 4,178 LUTs,
1,962 FFs, one DSP and no BRAM. Estimated setup slack is -30.800 ns at a
20 ns clock target. The critical path traverses the combinational isqrt unit.
These results establish neither 50 MHz timing closure nor implemented Fmax.

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
vivado -mode batch -source fpga/synth.tcl -tclargs xc7a35tcsg324-1
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
Timing here uses estimated routing. Placement and routing, a matching baseline
run, and a power estimate with stated activity are later steps. This flow does
not generate a board bitstream or establish FPGA frequency or power results.

Vivado may warn that `HD.CLK_SRC` is unset for `clk_i`. There is no enclosing
board design defining the external clock-buffer location yet. Clock delay/skew
estimation is limited until that integration context is defined; do not silence
the warning with an arbitrary site or interpret this run as timing sign-off.

References: AMD's [BUFGCE primitive](https://docs.amd.com/r/en-US/ug953-vivado-7series-libraries/BUFGCE),
[OOC synthesis command](https://docs.amd.com/r/2023.1-English/ug835-vivado-tcl-commands/synth_design),
and [timing summary](https://docs.amd.com/r/en-US/ug906-vivado-design-analysis/Report-Timing-Summary).
