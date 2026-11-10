# CVE2 isqrt technical handoff

## 1. Instruction and integration checks

A clean source export of `14dfdbb` built with Verilator 5.054 and RISC-V GCC
16.2.0. The supplied software and hardware tests passed 5 and 2,007 checks.
The existing corner test passed 43 checks, including zero-register behavior,
illegal encodings and recovery. The benchmark reproduced 247 and 23 cycles
per root for the software and hardware workloads, with checksum 10,996,072
in both runs. Their ratio is about 10.7× based on the rounded cycle averages.

The additional `isqrt_integration` program ran on that clean build and passed
200,705 checks. It tests the values immediately below, at and above each of
the 65,535 positive square boundaries, plus zero and the maximum unsigned
input. It also checks 4,096 full-width inputs against the independent
inequalities `root² ≤ input < (root + 1)²` using 64-bit products. A directed
sequence checks the value transferred from a load through isqrt to a store
and checks dependent multiply, unsigned divide and compressed addition.

The new waveform for input 20 confirms result 4 at the next simulated clock
edge, with `rd = rs1 = x11`. The 16 restoring steps are combinational. After
each input pair the processed prefix equals `root² + remainder`, where the
remainder is at most `2 × root`. The next trial subtracts `4 × root + 1`
when the shifted remainder permits it. The intermediate values fit in the
32-bit variables, and the final root fits in 16 bits.

The diff against `af1e7b4` shows only the decoder, ALU and package changes in
`cve2/rtl/` and an empty `tb/` diff. The integration test covers selected
standard instructions alongside isqrt. Broader ISA coverage is unverified.
The selected writeback waveform is available in [Figure 3](../pdf/fig03_writeback.pdf).

## 2. FPGA comparison

Both runs use Vivado 2024.2 on `xc7a35tcsg324-1` with the 20 ns clock target.
The resource counts below are for the whole routed design, including the wrapper.

| Metric | Original core | With isqrt |
|---|---:|---:|
| Synthesized LUTs | 3,034 | 4,178 |
| Routed LUTs | 2,987 | 4,205 |
| Routed flip-flops | 1,961 | 1,965 |
| Routed DSP blocks | 1 | 1 |
| Routed RAMB36 / RAMB18 | 0 / 0 | 0 / 0 |
| Routed overall setup WNS | −0.884 ns | −29.556 ns |
| Routed worst register setup slack | +0.058 ns | −29.556 ns |
| Routed hold WHS | −2.232 ns | −2.168 ns |
| Estimated total on-chip power | 86 mW | 101 mW |
| Estimated dynamic power | 17 mW | 32 mW |
| Estimated device static power | 68 mW | 68 mW |
| Vivado power confidence | Medium | Medium |

The extended design uses 1,218 more routed LUTs (+40.8%). Its worst register
setup path traverses the isqrt logic. The 20 ns target fails overall setup and
hold in both designs. External clock and interface timing are incomplete in
the out-of-context runs. See the [synthesis review](comparison.md) and the
[routed comparison](implementation/comparison.md).

The corrected power run reopened the archived routed checkpoints and verified
all 93 non-clock input bits in both designs before and after propagation.
Vivado used a 50 MHz assumption, typical process, commercial grade, 25 °C
junction temperature, 1.000 V Vccint and 1.800 V Vccaux. The activity model
assigns 6.25 million transitions per second and 0.5 static probability to
68 data and handshake bits, holds two controls high and holds 23 interrupt,
debug and error bits low. The estimated total rises by 15 mW, about 17.4% based
on the displayed totals. Vivado rounds totals and components independently.
These are vectorless on-chip estimates at the assumed clock frequency.
See the [reviewed power data](power_attempt4/archive_review.json),
[source hash manifest](power_attempt4/archive_review_manifest.json) and
[power figure](../pdf/fig13_fpga_power.pdf).

## 3. Reproduce the checks

On Mac, run the three Make commands from a clean checkout with Verilator
and the RISC-V compiler on `PATH`.

```sh
make test RISCV=riscv64-elf-
make run TEST=isqrt_corners RISCV=riscv64-elf-
make run TEST=isqrt_integration RISCV=riscv64-elf-
```

On Ubuntu use `RISCV=riscv64-unknown-elf-`. The FPGA synthesis and implementation
commands are in the [FPGA build guide](../../fpga/README.md). With those routed
checkpoints and the recorded audit inputs available, reproduce power in a
fresh output directory on the Vivado host.

```sh
source ~/tools/Xilinx/Vivado/2024.2/settings64.sh
python3 -B scripts/run_fpga_power.py --out-dir build/fpga/power_reproduction
```

Review the archived power reports and regenerate the power figure with the
Python environment used for the other Matplotlib figures.

```sh
python3 -B scripts/review_fpga_power.py --report-dir output/fpga/power_attempt4
python3 -B scripts/generate_power_figure.py
```
