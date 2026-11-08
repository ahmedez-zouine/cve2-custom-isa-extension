module cve2_fpga_top (
  input  logic        clk_i,
  input  logic        rst_ni,
  input  logic        fetch_enable_i,
  output logic        instr_req_o,
  input  logic        instr_gnt_i,
  input  logic        instr_rvalid_i,
  output logic [31:0] instr_addr_o,
  input  logic [31:0] instr_rdata_i,
  input  logic        instr_err_i,
  output logic        data_req_o,
  input  logic        data_gnt_i,
  input  logic        data_rvalid_i,
  output logic        data_we_o,
  output logic [3:0]  data_be_o,
  output logic [31:0] data_addr_o,
  output logic [31:0] data_wdata_o,
  input  logic [31:0] data_rdata_i,
  input  logic        data_err_i,
  input  logic        irq_software_i,
  input  logic        irq_timer_i,
  input  logic        irq_external_i,
  input  logic [15:0] irq_fast_i,
  input  logic        irq_nm_i,
  input  logic        debug_req_i,
  output logic        debug_halted_o,
  output logic        core_sleep_o
);
  import cve2_pkg::*;

  (* ASYNC_REG = "TRUE" *) logic [1:0] rst_sync_q;

  always_ff @(posedge clk_i or negedge rst_ni) begin
    if (!rst_ni) begin
      rst_sync_q <= 2'b00;
    end else begin
      rst_sync_q <= {rst_sync_q[0], 1'b1};
    end
  end

  cve2_top #(
    .MHPMCounterNum   (0),
    .MHPMCounterWidth (40),
    .RV32E            (1'b0),
    .RV32M            (RV32MFast),
    .XInterface       (1'b0)
  ) u_core (
    .clk_i,
    .rst_ni              (rst_sync_q[1]),
    .test_en_i           (1'b0),
    .ram_cfg_i           ('0),
    .hart_id_i           (32'h0),
    .boot_addr_i         (32'h0000_0080),
    .instr_req_o,
    .instr_gnt_i,
    .instr_rvalid_i,
    .instr_addr_o,
    .instr_rdata_i,
    .instr_err_i,
    .data_req_o,
    .data_gnt_i,
    .data_rvalid_i,
    .data_we_o,
    .data_be_o,
    .data_addr_o,
    .data_wdata_o,
    .data_rdata_i,
    .data_err_i,
    .x_issue_valid_o     (),
    .x_issue_ready_i     (1'b0),
    .x_issue_req_o       (),
    .x_issue_resp_i      ('0),
    .x_register_o        (),
    .x_commit_valid_o    (),
    .x_commit_o          (),
    .x_result_valid_i    (1'b0),
    .x_result_ready_o    (),
    .x_result_i          ('0),
    .irq_software_i,
    .irq_timer_i,
    .irq_external_i,
    .irq_fast_i,
    .irq_nm_i,
    .debug_req_i,
    .debug_halted_o,
    .dm_halt_addr_i      (32'h0),
    .dm_exception_addr_i (32'h0),
    .crash_dump_o        (),
    .fetch_enable_i,
    .core_sleep_o
  );
endmodule
