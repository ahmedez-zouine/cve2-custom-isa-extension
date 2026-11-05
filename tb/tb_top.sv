// Testbench top: the core + a memory (tb_mem.sv). Clock and reset come from
// tb_main.cpp. Plusargs:
//   +hex=<file>            program image (32-bit words, $readmemh format) - required
//   +max_cycles=<n>        timeout (default 20,000,000)
//   +cve2_tracer_enable=1  write an instruction trace (trace_core_00000000.log)
//   +waves=<file>          write a VCD waveform (handled in tb_main.cpp)
module tb_top (
  input  logic        clk_i,
  input  logic        rst_ni,
  output logic        sim_done_o,
  output logic [31:0] sim_exit_code_o
);
  import cve2_pkg::*;

  localparam logic [31:0] BOOT_ADDR = 32'h0000_0080;

  logic        instr_req, instr_gnt, instr_rvalid, instr_err;
  logic [31:0] instr_addr, instr_rdata;
  logic        data_req, data_gnt, data_rvalid, data_we, data_err;
  logic [3:0]  data_be;
  logic [31:0] data_addr, data_wdata, data_rdata;
  logic        mem_done;
  logic [31:0] mem_exit_code;

  // The CV-X-IF coprocessor interface is NOT used in this assignment (XInterface = 0).
  x_issue_resp_t x_issue_resp;
  x_result_t     x_result;
  assign x_issue_resp = '0;
  assign x_result     = '0;

  cve2_top_tracing #(
    .MHPMCounterNum   (0),
    .MHPMCounterWidth (40),
    .RV32E            (1'b0),
    .RV32M            (RV32MFast)
  ) u_core (
    .clk_i               (clk_i),
    .rst_ni              (rst_ni),
    .test_en_i           (1'b0),
    .ram_cfg_i           ('0),
    .hart_id_i           (32'h0),
    .boot_addr_i         (BOOT_ADDR),

    .instr_req_o         (instr_req),
    .instr_gnt_i         (instr_gnt),
    .instr_rvalid_i      (instr_rvalid),
    .instr_addr_o        (instr_addr),
    .instr_rdata_i       (instr_rdata),
    .instr_err_i         (instr_err),

    .data_req_o          (data_req),
    .data_gnt_i          (data_gnt),
    .data_rvalid_i       (data_rvalid),
    .data_we_o           (data_we),
    .data_be_o           (data_be),
    .data_addr_o         (data_addr),
    .data_wdata_o        (data_wdata),
    .data_rdata_i        (data_rdata),
    .data_err_i          (data_err),

    .x_issue_valid_o     (),
    .x_issue_ready_i     (1'b0),
    .x_issue_req_o       (),
    .x_issue_resp_i      (x_issue_resp),
    .x_register_o        (),
    .x_commit_valid_o    (),
    .x_commit_o          (),
    .x_result_valid_i    (1'b0),
    .x_result_ready_o    (),
    .x_result_i          (x_result),

    .irq_software_i      (1'b0),
    .irq_timer_i         (1'b0),
    .irq_external_i      (1'b0),
    .irq_fast_i          (16'h0),
    .irq_nm_i            (1'b0),

    .debug_req_i         (1'b0),
    .debug_halted_o      (),
    .dm_halt_addr_i      (32'h0),
    .dm_exception_addr_i (32'h0),
    .crash_dump_o        (),

    .fetch_enable_i      (1'b1),
    .core_sleep_o        ()
  );

  tb_mem u_mem (
    .clk_i           (clk_i),
    .instr_req_i     (instr_req),
    .instr_gnt_o     (instr_gnt),
    .instr_rvalid_o  (instr_rvalid),
    .instr_addr_i    (instr_addr),
    .instr_rdata_o   (instr_rdata),
    .instr_err_o     (instr_err),
    .data_req_i      (data_req),
    .data_gnt_o      (data_gnt),
    .data_rvalid_o   (data_rvalid),
    .data_we_i       (data_we),
    .data_be_i       (data_be),
    .data_addr_i     (data_addr),
    .data_wdata_i    (data_wdata),
    .data_rdata_o    (data_rdata),
    .data_err_o      (data_err),
    .sim_done_o      (mem_done),
    .sim_exit_code_o (mem_exit_code)
  );

  // ------------------------------------------------------------------
  // Timeout: stop runaway programs (exit code 124)
  // ------------------------------------------------------------------
  int unsigned max_cycles;
  int unsigned cycle;
  initial begin
    if (!$value$plusargs("max_cycles=%d", max_cycles)) max_cycles = 20_000_000;
  end

  logic timeout_q;
  always_ff @(posedge clk_i or negedge rst_ni) begin
    if (!rst_ni) begin
      cycle     <= 0;
      timeout_q <= 1'b0;
    end else begin
      cycle <= cycle + 1;
      if (cycle >= max_cycles && !timeout_q) begin
        $display("[tb] TIMEOUT after %0d cycles", cycle);
        timeout_q <= 1'b1;
      end
    end
  end

  assign sim_done_o      = mem_done | timeout_q;
  assign sim_exit_code_o = timeout_q ? 32'd124 : mem_exit_code;

  final $display("[tb] %0d cycles", cycle);

endmodule
