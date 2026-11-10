# Installation and reproduction

Start with the simulator to run the instruction tests. The FPGA flow also requires Vivado 2024.2 and Artix-7 device support.
{ .project-lead }

## Install the simulation tools

### 1. Install the toolchain
{ .project-step }

**macOS with Homebrew.** Install Apple’s command-line tools if needed, then install Verilator and the RISC-V compiler.

```sh
xcode-select --install
brew install verilator riscv64-elf-gcc
export RISCV=riscv64-elf-
```

[Homebrew installation](https://docs.brew.sh/Installation.html) · [RISC-V ELF compiler](https://formulae.brew.sh/formula/riscv64-elf-gcc)

**Ubuntu 24.04.** Install the native C++ build tools, Verilator and the RISC-V cross-toolchain.

```sh
sudo apt update
sudo apt install build-essential git verilator gcc-riscv64-unknown-elf binutils-riscv64-unknown-elf
export RISCV=riscv64-unknown-elf-
```

In GitHub Codespaces, the repository’s dev container installs the Ubuntu tools. Set `RISCV=riscv64-unknown-elf-` in the terminal.

### 2. Check the tool versions
{ .project-step }

```sh
verilator --version
make --version
"${RISCV}gcc" --version
"${RISCV}objcopy" --version
```

The compiler builds the RV32IMC test programs. Verilator builds the host simulator, which runs those programs against the CVE2 RTL.

### 3. Clone the repository
{ .project-step }

Keep the Git history. The FPGA baseline script reads recorded source revisions from it.

```sh
git clone https://github.com/ahmedez-zouine/cve2-custom-isa-extension.git
cd cve2-custom-isa-extension
```

## Run the simulation checks

### 1. Run the supplied tests
{ .project-step }

```sh
make test RISCV="$RISCV"
```

Look for `sw_isqrt: PASS` and `hw_isqrt: PASS (2007 checks)`.

### 2. Run the corner and integration checks
{ .project-step }

```sh
make run TEST=isqrt_corners RISCV="$RISCV"
make run TEST=isqrt_integration RISCV="$RISCV"
```

The expected summaries are `isqrt_corners: PASS (43 checks)` and `isqrt_integration: PASS (200705 checks)`. The corner test deliberately triggers four illegal-instruction exceptions and checks recovery. See [verification](verification.md) for the test sequence and the expected writeback.

### 3. Inspect the generated files
{ .project-step }

| File under `build/` | What to inspect |
| --- | --- |
| `hw_isqrt.dis` | Assembled instruction words |
| `hw_isqrt_00000000.log` | CVE2’s executed instruction trace |
| `hw_isqrt.vcd` | Signals and register writeback in a waveform viewer |
| `sim.log` | Verilator and host compiler messages |

## FPGA

### 1. Synthesize both variants
{ .project-step }

Load Vivado 2024.2 in your shell. Replace the example installation directory with your own. The two runs use `xc7a35tcsg324-1` and the project’s 20 ns constraint.

```sh
source ~/tools/Xilinx/Vivado/2024.2/settings64.sh
vivado -version
python3 scripts/prepare_fpga_baseline.py
for variant in baseline extended; do
  mkdir -p "build/fpga/$variant"
  vivado -mode batch -source fpga/synth.tcl \
    -log "build/fpga/$variant/vivado.log" \
    -journal "build/fpga/$variant/vivado.jou" \
    -tclargs xc7a35tcsg324-1 "$variant"
done
```

### 2. Route the checkpoints and review the reports
{ .project-step }

Run placement and routing on the two synthesis checkpoints. Check the route status, then compare setup and hold slack. The recorded power flow uses the routed checkpoints and the matching checkpoint audit. [FPGA build guide](https://github.com/ahmedez-zouine/cve2-custom-isa-extension/blob/10f4bd0/fpga/README.md#place-and-route-the-saved-synthesis-checkpoints) · [Archived results and review commands](https://github.com/ahmedez-zouine/cve2-custom-isa-extension/blob/10f4bd0/output/fpga/verified_results.md#3-reproduce-the-checks)
