# CVE2 FPGA synthesis preparation

This directory prepares an out-of-context (OOC) synthesis of the extended core
using Vivado and a Xilinx 7-series part. Select the actual part supported by your
installation. No FPGA part has been prescribed or measured for this project yet.

The wrapper uses the simulation's RV32IMC configuration: fast multiplier,
FF register file, zero optional HPM counters, and CV-X-IF disabled. Its live
instruction/data ports keep the processor connected to an external system.
Interrupt and debug inputs remain exposed. It has no memory or board peripherals.
Reset asserts asynchronously and releases through two flops on the input clock.

The FPGA source list replaces the simulation clock gate with `BUFGCE`. Vivado
provides this primitive. The testbench and tracing modules are excluded.
The simulation source list and core RTL are unchanged.

## Run on a machine with Vivado

From the repository root, after loading the installed Vivado environment:

```sh
vivado -version
# Example part only; replace it with your selected 7-series part.
vivado -mode batch -source fpga/synth.tcl -tclargs xc7a35tcsg324-1
```

The target period in `core.xdc` is 20 ns, corresponding to 50 MHz. The XDC assumes
synchronous external bus logic with maximum input/output delays of 20% of
the period and minimum delays of zero. These are comparison assumptions,
not board timing specifications. Check the clock and unconstrained-path reports.

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
Timing here uses estimated routing. Placement and routing, a matching baseline
run, and a power estimate with stated activity are later steps. This flow does
not generate a board bitstream or establish FPGA frequency or power results.

References: AMD's [BUFGCE primitive](https://docs.amd.com/r/en-US/ug953-vivado-7series-libraries/BUFGCE),
[OOC synthesis command](https://docs.amd.com/r/2023.1-English/ug835-vivado-tcl-commands/synth_design),
and [timing summary](https://docs.amd.com/r/en-US/ug906-vivado-design-analysis/Report-Timing-Summary).
