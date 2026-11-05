// Minimal runtime for the CVE2 take-home testbench (no libc).
#include <stdarg.h>

#include "sim.h"

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
void sim_putc(char c) { SIM_PUTC = (uint32_t)(unsigned char)c; }

void sim_puts(const char *s) {
  while (*s) sim_putc(*s++);
}

void sim_exit(int code) {
  SIM_EXIT = (uint32_t)code;
  for (;;) {
  }
}

static void put_uint(uint32_t v, unsigned base, int width, char pad, int upper) {
  char buf[12];
  int n = 0;
  const char *digits = upper ? "0123456789ABCDEF" : "0123456789abcdef";
  do {
    buf[n++] = digits[v % base];
    v /= base;
  } while (v);
  while (n < width--) sim_putc(pad);
  while (n) sim_putc(buf[--n]);
}

int printf(const char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  for (; *fmt; fmt++) {
    if (*fmt != '%') {
      sim_putc(*fmt);
      continue;
    }
    fmt++;
    char pad = ' ';
    int width = 0;
    int left = 0;
    if (*fmt == '-') {
      left = 1;
      fmt++;
    }
    if (*fmt == '0') {
      pad = '0';
      fmt++;
    }
    while (*fmt >= '0' && *fmt <= '9') width = width * 10 + (*fmt++ - '0');
    if (*fmt == 'l') fmt++;  // %ld etc.: long is 32 bits here
    switch (*fmt) {
      case 'd':
      case 'i': {
        int32_t v = va_arg(ap, int32_t);
        if (v < 0) {
          sim_putc('-');
          if (width) width--;
          put_uint(0u - (uint32_t)v, 10, width, pad, 0);
        } else {
          put_uint((uint32_t)v, 10, width, pad, 0);
        }
        break;
      }
      case 'u': put_uint(va_arg(ap, uint32_t), 10, width, pad, 0); break;
      case 'x': put_uint(va_arg(ap, uint32_t), 16, width, pad, 0); break;
      case 'X': put_uint(va_arg(ap, uint32_t), 16, width, pad, 1); break;
      case 'p':
        sim_puts("0x");
        put_uint(va_arg(ap, uint32_t), 16, 8, '0', 0);
        break;
      case 'c': sim_putc((char)va_arg(ap, int)); break;
      case 's': {
        const char *s = va_arg(ap, const char *);
        int len = 0;
        while (s[len]) len++;
        if (!left)
          for (int i = len; i < width; i++) sim_putc(' ');
        sim_puts(s);
        if (left)
          for (int i = len; i < width; i++) sim_putc(' ');
        break;
      }
      case '%': sim_putc('%'); break;
      default:
        sim_putc('%');
        sim_putc(*fmt);
        break;
    }
  }
  va_end(ap);
  return 0;
}

// ---------------------------------------------------------------------------
// Traps
// ---------------------------------------------------------------------------
volatile uint32_t g_expect_illegal;
volatile uint32_t g_illegal_count;
volatile uint32_t g_last_mtval;

static const char *exc_name(uint32_t mcause) {
  switch (mcause) {
    case 0: return "instruction address misaligned";
    case 1: return "instruction access fault";
    case 2: return "illegal instruction";
    case 3: return "breakpoint";
    case 4: return "load address misaligned";
    case 5: return "load access fault";
    case 6: return "store address misaligned";
    case 7: return "store access fault";
    case 11: return "ecall from M-mode";
    default: return "unknown";
  }
}

static uint32_t insn_length(uint32_t pc) {
  uint16_t lo = *(volatile uint16_t *)pc;
  return ((lo & 3u) == 3u) ? 4u : 2u;
}

void trap_handler(trap_frame_t *f) {
  uint32_t mcause = csr_read(mcause);
  uint32_t mtval = csr_read(mtval);

  if (mcause & 0x80000000u) {
    printf("\n*** unexpected interrupt: mcause=0x%08x mepc=0x%08x\n", mcause, f->mepc);
    sim_exit(3);
  }

  if (mcause == 2 && g_expect_illegal) {
    g_illegal_count++;
    g_last_mtval = mtval;
    f->mepc += insn_length(f->mepc);
    return;
  }

  printf("\n*** unexpected exception: %s (mcause=%u)\n", exc_name(mcause), mcause);
  printf("    mepc=0x%08x mtval=0x%08x\n", f->mepc, mtval);
  if (mcause == 2 && (mtval & 0x7fu) == 0x0bu) {
    printf("    This is a custom-0 instruction (opcode 0001011) that the core does not decode.\n");
    printf("    Look up the address in build/<test>.dis to see which one.\n");
  }
  sim_exit(2);
}

// ---------------------------------------------------------------------------
// Random numbers
// ---------------------------------------------------------------------------
static uint32_t g_rand_state = 0x2545F491u;

void rand_seed(uint32_t seed) { g_rand_state = seed ? seed : 0x2545F491u; }

uint32_t rand32(void) {
  uint32_t x = g_rand_state;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  g_rand_state = x;
  return x;
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------
uint32_t g_check_count;
uint32_t g_fail_count;

void check_failed(const char *what, uint32_t got, uint32_t expected) {
  if (g_fail_count < 10)
    printf("  MISMATCH %s: got 0x%08x, expected 0x%08x\n", what, got, expected);
  else if (g_fail_count == 10)
    printf("  ... (further mismatches not printed)\n");
  g_fail_count++;
}

int test_finish(const char *name) {
  if (g_fail_count == 0) {
    printf("%s: PASS (%u checks)\n", name, g_check_count);
    return 0;
  }
  printf("%s: FAIL (%u of %u checks failed)\n", name, g_fail_count, g_check_count);
  return 1;
}

// ---------------------------------------------------------------------------
// Freestanding libc subset
// ---------------------------------------------------------------------------
void *memcpy(void *dst, const void *src, size_t n) {
  uint8_t *d = dst;
  const uint8_t *s = src;
  while (n--) *d++ = *s++;
  return dst;
}

void *memset(void *dst, int c, size_t n) {
  uint8_t *d = dst;
  while (n--) *d++ = (uint8_t)c;
  return dst;
}

int memcmp(const void *a, const void *b, size_t n) {
  const uint8_t *x = a, *y = b;
  for (; n; n--, x++, y++)
    if (*x != *y) return *x - *y;
  return 0;
}
