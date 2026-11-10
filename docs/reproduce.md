# Reproduce

Clone the repository with its history. The baseline helper uses the recorded RTL and FPGA source revisions.

```sh
git clone https://github.com/ahmedez-zouine/cve2-custom-isa-extension.git
cd cve2-custom-isa-extension
```

## Simulation

Install Verilator, Make, a C++ compiler and a RISC-V GCC toolchain with RV32IMC support. On Mac, use the `riscv64-elf-` prefix.

```sh
make test RISCV=riscv64-elf-
make run TEST=isqrt_corners RISCV=riscv64-elf-
make run TEST=isqrt_integration RISCV=riscv64-elf-
```

On Ubuntu, use `RISCV=riscv64-unknown-elf-`. The simulation writes the instruction trace and waveform under `build/`. The integration program should print `isqrt_integration: PASS (200705 checks)`.

## FPGA

Use Vivado 2024.2 with the `xc7a35tcsg324-1` part and the project's 20 ns clock constraint. Prepare the original-core snapshot before synthesizing the two variants.

```sh
python3 scripts/prepare_fpga_baseline.py
for variant in baseline extended; do
  mkdir -p "build/fpga/$variant"
  vivado -mode batch -source fpga/synth.tcl \
    -log "build/fpga/$variant/vivado.log" \
    -journal "build/fpga/$variant/vivado.jou" \
    -tclargs xc7a35tcsg324-1 "$variant"
done
```

Follow the [FPGA guide](https://github.com/ahmedez-zouine/cve2-custom-isa-extension/blob/10f4bd0/fpga/README.md#place-and-route-the-saved-synthesis-checkpoints) to run placement and routing. The recorded power flow uses the routed checkpoints and the matching checkpoint audit. The [technical handoff](https://github.com/ahmedez-zouine/cve2-custom-isa-extension/blob/10f4bd0/output/fpga/verified_results.md#3-reproduce-the-checks) links the archived results and gives the review commands.
