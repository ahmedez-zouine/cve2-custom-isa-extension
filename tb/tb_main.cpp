// Verilator driver for tb_top: generates clock/reset, optional VCD waves,
// and returns the program's exit code as the process exit code.
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>

#include "Vtb_top.h"
#include "verilated.h"
#if VM_TRACE
#include "verilated_vcd_c.h"
#endif

int main(int argc, char **argv) {
  auto ctx = std::make_unique<VerilatedContext>();
  ctx->commandArgs(argc, argv);
  ctx->fatalOnError(true);

  auto top = std::make_unique<Vtb_top>(ctx.get(), "TOP");

  // +waves=<file>: record a VCD of 20000 cycles, starting at +waves_from=<cycle>
  bool waves = false;
  const char *wave_file = "waves.vcd";
  uint64_t waves_from = 0, waves_len = 20000;
  for (int i = 1; i < argc; i++) {
    if (!strcmp(argv[i], "+waves")) waves = true;
    if (!strncmp(argv[i], "+waves=", 7)) { waves = true; wave_file = argv[i] + 7; }
    if (!strncmp(argv[i], "+waves_from=", 12)) waves_from = strtoull(argv[i] + 12, nullptr, 10);
  }

#if VM_TRACE
  std::unique_ptr<VerilatedVcdC> tfp;
  if (waves) {
    ctx->traceEverOn(true);
    tfp = std::make_unique<VerilatedVcdC>();
    top->trace(tfp.get(), 99);
    tfp->open(wave_file);
    printf("[tb] writing waves to %s (cycles %llu to %llu)\n", wave_file,
           (unsigned long long)waves_from, (unsigned long long)(waves_from + waves_len));
  }
#else
  if (waves) printf("[tb] WARNING: simulator built without tracing support (verilator --trace)\n");
#endif

  // Start with reset released, then assert it so that every flop with an
  // asynchronous reset sees a negedge on rst_ni (the core is clock gated).
  top->clk_i  = 0;
  top->rst_ni = 1;
  top->eval();
  top->rst_ni = 0;
  top->eval();
  uint64_t t = 0;
  int reset_cycles = 5;

  uint64_t cycle = 0;
  while (!ctx->gotFinish()) {
    bool dump = tfp && cycle >= waves_from && cycle < waves_from + waves_len;
    cycle++;
    // falling edge
    top->clk_i = 0;
    top->eval();
#if VM_TRACE
    if (dump) tfp->dump(t);
#endif
    t += 5;
    ctx->time(t);

    // rising edge
    if (reset_cycles > 0 && --reset_cycles == 0) top->rst_ni = 1;
    top->clk_i = 1;
    top->eval();
#if VM_TRACE
    if (dump) tfp->dump(t);
#endif
    t += 5;
    ctx->time(t);

    if (top->sim_done_o) break;
  }

  // one more cycle so the final $display output and trace lines get flushed
  top->clk_i = 0;
  top->eval();
  int code = (int)top->sim_exit_code_o;
  top->final();
#if VM_TRACE
  if (tfp) tfp->close();
#endif

  if (code == 0)
    printf("[tb] PASS (exit code 0)\n");
  else if (code == 124)
    printf("[tb] FAIL (timeout)\n");
  else
    printf("[tb] FAIL (exit code %d)\n", code);
  fflush(stdout);
  return code == 0 ? 0 : (code & 0xff ? code & 0xff : 1);
}
