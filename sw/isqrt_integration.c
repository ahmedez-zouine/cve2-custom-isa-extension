#include "sim.h"
#include "isqrt.h"

static void check_square_transitions(void) {
  CHECK_EQ("zero", isqrt_hw(0), 0);
  CHECK_EQ("maximum unsigned input", isqrt_hw(UINT32_MAX), UINT16_MAX);

  // Each positive square is where the integer root increases by one.
  for (uint32_t root = 1; root <= UINT16_MAX; ++root) {
    uint32_t square = root * root;
    CHECK_EQ("below square", isqrt_hw(square - 1), root - 1);
    CHECK_EQ("at square", isqrt_hw(square), root);
    CHECK_EQ("above square", isqrt_hw(square + 1), root);
  }
}

static void check_full_width_inputs(void) {
  rand_seed(0x91F16B25u);
  for (unsigned i = 0; i < 4096; ++i) {
    uint32_t input = rand32();
    uint32_t root = isqrt_hw(input);
    // A 64-bit product keeps 65536 squared from wrapping to zero.
    uint64_t next = (uint64_t)root + 1;
    int correct = root <= UINT16_MAX && (uint64_t)root * root <= input &&
                  (uint64_t)input < next * next;
    CHECK_EQ("floor-root inequalities", correct, 1);
  }
}

static void check_instruction_dependencies(void) {
  uint32_t source = 1000000;
  uint32_t stored, result;

  // Exercise load-use and isqrt-to-store dependencies before RV32IMC arithmetic.
  __asm__ volatile(
      "lw t0, 0(%[source])\n"
      ".insn r 0x0b, 0, 0, t1, t0, x0\n"
      "sw t1, 0(%[destination])\n"
      "lw t2, 0(%[destination])\n"
      "mul t2, t2, t1\n"
      "divu t2, t2, t1\n"
      "c.addi t2, 1\n"
      "mv %[result], t2\n"
      : [result] "=r"(result), "=m"(stored)
      : [source] "r"(&source), [destination] "r"(&stored)
      : "t0", "t1", "t2", "memory");

  CHECK_EQ("stored isqrt result", stored, 1000);
  CHECK_EQ("dependent RV32IMC result", result, 1001);
}

int main(void) {
  check_instruction_dependencies();
  check_square_transitions();
  check_full_width_inputs();
  return test_finish("isqrt_integration");
}
