#include "sim.h"
#include "isqrt.h"

// Fixed registers make the invalid instruction words easy to inspect.
#define CHECK_ILLEGAL(word) do {                                         \
  uint32_t dst, src, second;                                             \
  uint32_t before = g_illegal_count;                                     \
  g_last_mtval = 0;                                                      \
  g_expect_illegal = 1;                                                  \
  __asm__ volatile(                                                     \
      "li t0, 0x12345678\n"                                             \
      "li t1, 20\n"                                                     \
      "li t2, 0\n"                                                      \
      ".word " #word "\n"                                               \
      "mv %0, t0\n"                                                     \
      "mv %1, t1\n"                                                     \
      "mv %2, t2\n"                                                     \
      : "=r"(dst), "=r"(src), "=r"(second)                              \
      : : "t0", "t1", "t2", "memory");                                 \
  g_expect_illegal = 0;                                                  \
  CHECK_EQ("illegal trap count", g_illegal_count, before + 1);            \
  CHECK_EQ("illegal mcause", csr_read(mcause), 2);                        \
  CHECK_EQ("illegal mtval", g_last_mtval, word);                          \
  CHECK_EQ("illegal preserves t0", dst, 0x12345678);                      \
  CHECK_EQ("illegal preserves rs1", src, 20);                            \
  CHECK_EQ("illegal preserves rs2", second, 0);                          \
} while (0)

int main(void) {
  static const struct {
    uint32_t input;
    uint32_t root;
  } cases[] = {
      {0, 0}, {1, 1}, {2, 1}, {3, 1}, {4, 2},
      {15, 3}, {16, 4}, {17, 4}, {24, 4}, {25, 5}, {26, 5},
      {4294836224u, 65534}, {4294836225u, 65535},
      {4294967294u, 65535}, {4294967295u, 65535},
  };

  printf("isqrt_corners: boundaries, x0 and expected illegal traps\n");
  for (unsigned i = 0; i < sizeof(cases) / sizeof(cases[0]); i++) {
    CHECK_EQ("boundary root", isqrt_hw(cases[i].input), cases[i].root);
  }

  uint32_t zero, source, result;
  __asm__ volatile(
      "li t0, 20\n"
      ".insn r 0x0b, 0, 0, x0, t0, x0\n"
      "mv %0, x0\n"
      "mv %1, t0\n"
      : "=r"(zero), "=r"(source) : : "t0");
  CHECK_EQ("rd=x0 discards result", zero, 0);
  CHECK_EQ("rd=x0 preserves source", source, 20);

  __asm__ volatile(".insn r 0x0b, 0, 0, %0, x0, x0" : "=r"(result));
  CHECK_EQ("rs1=x0 returns zero", result, 0);

  CHECK_ILLEGAL(0x0203028b); // funct7=1, rd=t0, rs1=t1
  CHECK_ILLEGAL(0x0003128b); // funct3=1
  CHECK_ILLEGAL(0x0073028b); // rs2=t2, even though t2 contains zero
  CHECK_ILLEGAL(0x0073000b); // Invalid rs2 with rd=x0

  CHECK_EQ("legal instruction after traps", isqrt_hw(20), 4);
  return test_finish("isqrt_corners");
}
