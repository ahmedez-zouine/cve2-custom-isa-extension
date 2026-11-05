// The isqrt instruction and a C reference model.
//
//   isqrt rd, rs1        rd = floor(sqrt(rs1)), rs1 interpreted as unsigned
//
//   31      25 24   20 19   15 14  12 11    7 6       0
//   0000000    00000   rs1     000    rd      0001011      (custom-0 opcode)
//
// The toolchain does not know the mnemonic; the GNU assembler's `.insn`
// directive emits the raw encoding:
//   .insn r <opcode>, <funct3>, <funct7>, <rd>, <rs1>, <rs2>
#ifndef ISQRT_H
#define ISQRT_H

#include <stdint.h>

#define ISQRT_OPCODE 0x0b
#define ISQRT_FUNCT3 0x0
#define ISQRT_FUNCT7 0x00

// Hardware square root (your instruction).
static inline uint32_t isqrt_hw(uint32_t x) {
  uint32_t r;
  __asm__ volatile(".insn r 0x0b, 0x0, 0x00, %0, %1, x0" : "=r"(r) : "r"(x));
  return r;
}

// Golden reference model: same result, plain RV32I instructions.
static inline uint32_t isqrt_ref(uint32_t x) {
  uint32_t root = 0, rem = 0;
  for (int i = 0; i < 16; i++) {
    rem = (rem << 2) | (x >> 30);
    x <<= 2;
    uint32_t trial = (root << 2) | 1;
    root <<= 1;
    if (rem >= trial) {
      rem -= trial;
      root |= 1;
    }
  }
  return root;
}

#endif
