# Design

The `isqrt rd, rs1` instruction treats `rs1` as an unsigned 32-bit integer and returns the floor of its square root. The result fits in 16 bits and is zero-extended to 32 bits on writeback.
{ .project-lead }

## R-type encoding { .project-section }

The instruction uses the R-type layout and the RISC-V custom-0 opcode. It has no second source operand, so `rs2` is reserved as zero.

| Bits | Field | Value |
| --- | --- | --- |
| 31–25 | `funct7` | `0000000` |
| 24–20 | `rs2` | `00000` |
| 19–15 | `rs1` | Source register |
| 14–12 | `funct3` | `000` |
| 11–7 | `rd` | Destination register |
| 6–0 | Opcode | `0001011` (`0x0b`, custom-0) |

The decoder accepts the instruction only when `funct7`, `rs2` and `funct3` all encode zero. The ordinary illegal-instruction path handles the other custom-0 encodings. The existing register file handles `rd = rs1` and `rd = x0`.

The assembler directive below emits `0x0005858b` for the in-place operation `isqrt x11, x11`.

```asm
.insn r 0x0b, 0, 0, x11, x11, x0
```

The two register corner cases use the processor’s existing register-file rules. If `rd = rs1`, the old value is read before the result is written. If `rd = x0`, the calculated value is discarded.

## Decode, execute and write back { .project-section }

[![CVE2 instruction flow from fetch through the decoder and ALU to register writeback](assets/pipeline.svg)](assets/pipeline.svg)

Fetch brings the instruction into the core. The decoder checks the opcode and reserved fields, reads `rs1`, and selects `ALU_ISQRT`. In the execute stage, operand A enters the square-root datapath. The ALU result mux sends the completed root through the ordinary writeback path to `rd`. No separate register file or write port is introduced.

### RTL changes

| Module | Responsibility |
| --- | --- |
| [`cve2_pkg.sv`](https://github.com/ahmedez-zouine/cve2-custom-isa-extension/blob/10f4bd0/cve2/rtl/cve2_pkg.sv) | Declares the custom opcode and `ALU_ISQRT` operation |
| [`cve2_decoder.sv`](https://github.com/ahmedez-zouine/cve2-custom-isa-extension/blob/10f4bd0/cve2/rtl/cve2_decoder.sv) | Validates the encoding and selects the operands and ALU operation |
| [`cve2_alu.sv`](https://github.com/ahmedez-zouine/cve2-custom-isa-extension/blob/10f4bd0/cve2/rtl/cve2_alu.sv) | Computes the integer root and supplies the ALU result |

## Sixteen dependent square-root steps { .project-section }

Each step consumes the next two input bits and adds one bit to the root. The [arithmetic guide](arithmetic.md) derives the trial value and traces all three nonzero pairs for the input 20.

The RTL unrolls all 16 steps into one combinational path. Every step depends on the preceding root and remainder. This avoids an iterative controller but contributes a long path from the operand to the destination register. A multicycle implementation could reuse a single step, with additional cycles and control logic.

[Inspect the routed timing and area](results.md) to see the cost of the unrolled implementation.
