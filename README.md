# Integer square root for CVE2

This project adds an unsigned integer square-root instruction to CVE2, a compact
32-bit RISC-V processor. The goal is to calculate a result in hardware, verify
the instruction in simulation, and measure its implementation cost on an FPGA.

## 1. Mathematical definition

For an unsigned input (x), the integer square root (r) is

$$
r = \left\lfloor \sqrt{x} \right\rfloor,
\qquad
r^2 \leq x < (r+1)^2.
$$

The inequalities are also a useful correctness check: (r) fits below (x),
but the next integer does not.

For example, when (x=20):

$$
4^2 = 16 \leq 20 < 25 = 5^2,
\qquad
\therefore \left\lfloor \sqrt{20} \right\rfloor = 4.
$$

For a 32-bit unsigned input,

$$
0 \leq x \leq 2^{32}-1 = 4{,}294{,}967{,}295.
$$

The maximum result is 65,535, since

$$
65{,}535^2 = 4{,}294{,}836{,}225 \leq 2^{32}-1
< 65{,}536^2 = 4{,}294{,}967{,}296.
$$

The result therefore needs 16 significant bits and is zero-extended into the
32-bit destination register.

| Input | Result | Check |
|---:|---:|---|
| 0 | 0 | 0 squared is 0; 1 squared is greater than 0. |
| 15 | 3 | 3 squared is 9; 4 squared is greater than 15. |
| 16 | 4 | 4 squared is 16; 5 squared is greater than 16. |
| 20 | 4 | 4 squared is 16; 5 squared is greater than 20. |
| 25 | 5 | 5 squared is 25; 6 squared is greater than 25. |

## 2. Instruction format and rules

The instruction is written as:

```text
isqrt rd, rs1
```

Its 32-bit encoding is:

```text
 bits 31:25  24:20  19:15  14:12  11:7   6:0
 ┌─────────┬───────┬──────┬───────┬──────┬─────────┐
 │ 0000000 │ 00000 │ rs1  │  000  │  rd  │ 0001011 │
 └─────────┴───────┴──────┴───────┴──────┴─────────┘
   funct7     rs2             funct3          opcode
```

- The opcode `0001011` (hex `0x0b`) selects RISC-V custom-0.
- `rs1` names the register containing the unsigned input.
- `rd` names the destination register.
- `funct7`, `rs2`, and `funct3` are reserved for this instruction and must be zero.
- Any other custom-0 encoding must raise an illegal-instruction exception.

For `isqrt x5, x6`, the register fields are `rs1=00110` and `rd=00101`.
The instruction word is `0x0003028b`. If x6 contains 20, execution writes
4 into x5 and leaves x6 unchanged.

The register corner cases follow normal RISC-V behavior:

- `rd = rs1`: read the old value, then replace it with its square root.
- `rd = x0`: discard the result; x0 remains zero.
- `rs1 = x0`: read zero, so the result is zero.
- An invalid encoding traps even if its destination is x0.

## 3. Square-root algorithm

The implementation uses the binary digit-by-digit, or restoring,
algorithm. It reads two input bits at a time because each root bit corresponds
to one pair of input bits. Thus a 32-bit input needs 16 iterations.

Let (Q) be the partial root, (R) the partial remainder, and (b\in\{0,1,2,3\})
the next two-bit input pair. Form the candidate remainder (T) and trial value
(D):

$$
\begin{aligned}
T &= 4R+b,\\
D &= 4Q+1.
\end{aligned}
$$

If the trial value fits, subtract it and set the new root bit to one. Otherwise,
keep the candidate remainder and set the new root bit to zero:

If the trial value fits, use:

$$
Q' = 2Q+1,
\qquad
R' = T-D
\quad\text{when } T\geq D.
$$

Otherwise, use:

$$
Q' = 2Q,
\qquad
R' = T
\quad\text{when } T<D.
$$

For input 15, the final three pairs are `00, 11, 11` (earlier pairs are zero).
Starting from (Q=0,R=0), those pairs produce:

| Pair | Candidate (T=4R+b) | Decision | New (Q) | New (R) |
|---:|---:|---|---:|---:|
| 00 | 0 | (D=1) does not fit | 0 | 0 |
| 11 | 3 | (D=1) fits; (3-1=2) | 1 | 2 |
| 11 | 11 | (D=5) fits; (11-5=6) | 3 | 6 |

The result is 3; indeed (3^2+6=15). For input 16, the final pairs are
`01, 00, 00`. They produce roots 1, 2, then 4, with remainder zero.

The recurrence maintains the invariant

$$
P=Q^2+R,
\qquad
0\leq R < 2Q+1,
$$

where (P) is the input prefix processed so far. The next prefix is (4P+b).
Testing (D=4Q+1) is exactly the test for whether the next root bit can be one.

In a sequential circuit, one iteration per clock would take 16 clocks. The
current CVE2 ALU implementation expands all 16 iterations into combinational
logic to aim for one-cycle execution. This may create a long critical path;
actual FPGA timing must be measured before making a frequency claim.

## 4. How the instruction fits the processor

CVE2 uses a two-stage pipeline: instruction fetch (IF), followed by combined
decode and execute (ID/EX).

```text
Stage 1: IF                    Stage 2: ID / EX
Fetch and buffer instruction -> Decode -> Read rs1 -> ALU -> Write rd
```

The signal path is:

1. The IF stage fetches the instruction and places it in the IF/ID registers.
2. The decoder checks the opcode and reserved fields, then selects register `rs1`
   and the `ALU_ISQRT` operation.
3. The register file presents the source value to the ALU.
4. The ALU computes the root and the normal result path carries it to the
   register file write port.
5. If the instruction is legal and executing, the destination register updates
   on the rising clock edge.

The register file reads combinationally and writes on a clock edge. For
`rd=rs1`, the old register value feeds the calculation before the edge; the
new value is written at the edge. This relies on normal setup and hold timing.
The writeback module in this CVE2 version is a passthrough, not an extra pipeline
stage. The instruction should not need a new stall or coprocessor interface.

## 5. Current implementation status

The custom opcode and ALU operation are defined in the package. The decoder
checks all reserved fields, and the ALU now computes the root with 16 unrolled
restoring steps. It returns the result through the existing writeback path.

The supplied tests pass after integration: 5 software checks and 2,007 hardware
checks. These cover known inputs, 2,000 random reference comparisons, an in-place
destination, and a dependent root chain. Standalone ALU lint also passes.
The benchmark prints 247 software cycles and 23 hardware cycles per root, with
the same checksum of 10,996,072. These are integer-rounded averages that include
loop and random-number-generation overhead, not individual instruction latency.

Additional tests for illegal encodings and x0 behavior are still planned.
These results do not establish full ISA regression coverage or FPGA timing.

## 6. Repository map

- [Package: opcode and ALU operation types](cve2/rtl/cve2_pkg.sv)
- [Decoder: legality and control signals](cve2/rtl/cve2_decoder.sv)
- [ALU: arithmetic and result selection](cve2/rtl/cve2_alu.sv)
- [Software baseline test](sw/sw_isqrt.c)
- [Hardware instruction test](sw/hw_isqrt.c)
- [Instruction encoding and C reference](sw/lib/isqrt.h)
- [Processor fetch stage](cve2/rtl/cve2_if_stage.sv)
- [Processor ID/EX stage](cve2/rtl/cve2_id_stage.sv)
- [Execution block](cve2/rtl/cve2_ex_block.sv)
- [Flip-flop register file](cve2/rtl/cve2_register_file_ff.sv)
- [Simulation testbench](tb/tb_top.sv)

The provided testbench and core configuration are part of the assignment and
should remain unchanged. FPGA wrapper, constraints, synthesis results, and the
technical report are later project work; do not claim FPGA measurements until
the tools have actually run.

## 7. Set up on an Apple Silicon Mac

You need Apple's C/C++ command-line tools, Verilator, Make, and a RISC-V
cross-compiler. Homebrew provides Apple Silicon packages for Verilator and
RISC-V ELF GCC [1–3].

If the Apple command-line tools are not installed, install them with:

```sh
xcode-select --install
```

If Homebrew is not installed, follow its official [installation guide](https://docs.brew.sh/Installation.html).
Its default prefix on Apple Silicon is `/opt/homebrew`; follow the shell setup
instructions printed by the installer [1]. Then install the project tools:

```sh
brew install verilator riscv64-elf-gcc
```

Check that your terminal can find them:

```sh
verilator --version
riscv64-elf-gcc --version
make --version
```

## 8. Build and run

From the project root, run the software reference:

```sh
make run TEST=sw_isqrt RISCV=riscv64-elf-
```

The software test should print `sw_isqrt: PASS`. Run the hardware test with:

```sh
make run TEST=hw_isqrt RISCV=riscv64-elf-
```

The hardware test should now print `hw_isqrt: PASS (2007 checks)`. Run both
supplied tests with `make test RISCV=riscv64-elf-`.

The Makefile uses the prefix `riscv64-unknown-elf-` by default; the
explicit `RISCV=riscv64-elf-` selects Homebrew's compiler on this Mac. Build
outputs, disassemblies, instruction traces, and waveforms are written under
`build/`. Use `make clean` if you need to rebuild from scratch.

### Homebrew references

1. [Homebrew installation guide](https://docs.brew.sh/Installation.html)
2. [Verilator formula](https://formulae.brew.sh/formula/verilator)
3. [RISC-V ELF GCC formula](https://formulae.brew.sh/formula/riscv64-elf-gcc)
