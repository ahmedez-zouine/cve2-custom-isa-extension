// sw_isqrt: square roots in software only (no custom instruction).
//
// Runs on the unmodified core. Use it to check that your setup works, and as
// the baseline for the speed comparison in hw_isqrt.
#include "sim.h"
#include "isqrt.h"

int main(void) {
  printf("sw_isqrt: software square root on CVE2\n");

  // a few known values
  CHECK_EQ("isqrt_ref(0)", isqrt_ref(0), 0);
  CHECK_EQ("isqrt_ref(15)", isqrt_ref(15), 3);
  CHECK_EQ("isqrt_ref(16)", isqrt_ref(16), 4);
  CHECK_EQ("isqrt_ref(1000000)", isqrt_ref(1000000), 1000);
  CHECK_EQ("isqrt_ref(0xFFFFFFFF)", isqrt_ref(0xFFFFFFFFu), 65535);

  // speed: 256 random operands
  uint32_t sum = 0;
  rand_seed(7);
  uint32_t c0 = rdcycle();
  for (int i = 0; i < 256; i++) sum += isqrt_ref(rand32());
  uint32_t c1 = rdcycle();
  printf("software: %u cycles per square root (checksum %u)\n", (c1 - c0) / 256, sum);

  return test_finish("sw_isqrt");
}
