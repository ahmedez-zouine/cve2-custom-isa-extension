// Minimal runtime for the CVE2 take-home testbench (no libc).
#ifndef SIM_H
#define SIM_H

#include <stdint.h>
#include <stddef.h>

// ---------------------------------------------------------------------------
// Simulation control registers (see tb/tb_mem.sv)
// ---------------------------------------------------------------------------
#define SIM_PUTC   (*(volatile uint32_t *)0x10000000u)
#define SIM_EXIT   (*(volatile uint32_t *)0x10000004u)

void sim_putc(char c);
void sim_puts(const char *s);
void sim_exit(int code) __attribute__((noreturn));
int  printf(const char *fmt, ...);  // supports %d %i %u %x %X %c %s %p, width, 0-pad

// ---------------------------------------------------------------------------
// CSRs
// ---------------------------------------------------------------------------
#define csr_read(csr) ({ uint32_t __v; __asm__ volatile("csrr %0, " #csr : "=r"(__v)::"memory"); __v; })
#define csr_write(csr, val) __asm__ volatile("csrw " #csr ", %0" ::"rK"(val))
#define csr_set(csr, val) __asm__ volatile("csrs " #csr ", %0" ::"rK"(val))
#define csr_clear(csr, val) __asm__ volatile("csrc " #csr ", %0" ::"rK"(val))

static inline uint32_t rdcycle(void) { return csr_read(mcycle); }
static inline uint32_t rdinstret(void) { return csr_read(minstret); }

// ---------------------------------------------------------------------------
// Traps
// ---------------------------------------------------------------------------
typedef struct {
  uint32_t x[32];  // x[2] = interrupted sp
  uint32_t mepc;
} trap_frame_t;

// When non-zero, illegal-instruction exceptions are counted and skipped
// instead of ending the test.
extern volatile uint32_t g_expect_illegal;
extern volatile uint32_t g_illegal_count;
extern volatile uint32_t g_last_mtval;

// ---------------------------------------------------------------------------
// Pseudo-random numbers (xorshift32)
// ---------------------------------------------------------------------------
void     rand_seed(uint32_t seed);
uint32_t rand32(void);

// ---------------------------------------------------------------------------
// Self-checking helpers
// ---------------------------------------------------------------------------
// Report a mismatch (prints only the first few) and count it.
void check_failed(const char *what, uint32_t got, uint32_t expected);
#define CHECK_EQ(what, got, expected)                                    \
  do {                                                                   \
    uint32_t __g = (uint32_t)(got), __e = (uint32_t)(expected);          \
    g_check_count++;                                                     \
    if (__g != __e) check_failed((what), __g, __e);                      \
  } while (0)
extern uint32_t g_check_count;
extern uint32_t g_fail_count;
// Print the summary and return the exit code (0 = all checks passed).
int test_finish(const char *name);

// Freestanding replacements for the libc functions the compiler may call.
void *memcpy(void *dst, const void *src, size_t n);
void *memset(void *dst, int c, size_t n);
int   memcmp(const void *a, const void *b, size_t n);

#endif
