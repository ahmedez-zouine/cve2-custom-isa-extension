module cve2_clock_gate (
  input  logic clk_i,
  input  logic en_i,
  input  logic scan_cg_en_i,
  output logic clk_o
);
  // Use the FPGA clock network for the core's clock enable.
  BUFGCE u_clock_buffer (
    .I  (clk_i),
    .CE (en_i | scan_cg_en_i),
    .O  (clk_o)
  );
endmodule
