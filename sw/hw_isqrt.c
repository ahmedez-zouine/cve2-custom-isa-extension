// hw_isqrt: tests your isqrt instruction and measures its speed.
//
// On the unmodified core this stops at the first isqrt with an
// "illegal instruction" exception. That is the starting point.
#include "sim.h"
#include "isqrt.h"

int main(void) {
  printf("hw_isqrt: isqrt instruction on CVE2\n");

  // a few known values
  CHECK_EQ("isqrt_hw(0)", isqrt_hw(0), 0);
  CHECK_EQ("isqrt_hw(15)", isqrt_hw(15), 3);
  CHECK_EQ("isqrt_hw(16)", isqrt_hw(16), 4);
  CHECK_EQ("isqrt_hw(1000000)", isqrt_hw(1000000), 1000);
  CHECK_EQ("isqrt_hw(0xFFFFFFFF)", isqrt_hw(0xFFFFFFFFu), 65535);

  // 2000 random values, compared with the C reference model
  rand_seed(0xC0FFEE);
  for (int i = 0; i < 2000; i++) {
    uint32_t x = rand32() >> (i % 32);  // small and large values
    CHECK_EQ("isqrt_hw(random value)", isqrt_hw(x), isqrt_ref(x));
  }

  // rd = rs1:  isqrt x, x
  uint32_t x = 1000000;
  __asm__ volatile(".insn r 0x0b, 0, 0, %0, %0, x0" : "+r"(x));
  CHECK_EQ("isqrt with rd = rs1", x, 1000);

  // back-to-back: each result is the operand of the next isqrt
  uint32_t a = isqrt_hw(0xFFFFFFFFu);  // 65535
  uint32_t b = isqrt_hw(a);            // 255
  uint32_t c = isqrt_hw(b);            // 15
  CHECK_EQ("back-to-back isqrt", c, 15);

  // speed: the same 256 random operands as sw_isqrt, so the checksum must match
  uint32_t sum = 0;
  rand_seed(7);
  uint32_t c0 = rdcycle();
  for (int i = 0; i < 256; i++) sum += isqrt_hw(rand32());
  uint32_t c1 = rdcycle();
  printf("hardware: %u cycles per square root (checksum %u)\n", (c1 - c0) / 256, sum);

  return test_finish("hw_isqrt");
}