// Simulation memory for the testbench: 1 MiB of RAM plus two
// simulation-control addresses. Not synthesizable (it uses $readmemh/$write).
//
// The core has two memory ports, one for instructions and one for data. Both
// use the same simple handshake: the core raises req with an address, the
// memory answers with gnt in the same cycle and with rvalid + rdata one cycle
// later.
//
// Address map
//   0x0000_0000 - 0x000F_FFFF   RAM, loaded from the file given with +hex=<file>
//   0x1000_0000                 write: print the low byte as a character
//   0x1000_0004                 write: end the simulation, the value is the exit code
//   anything else               error response
module tb_mem (
  input  logic        clk_i,

  // instruction port
  input  logic        instr_req_i,
  output logic        instr_gnt_o,
  output logic        instr_rvalid_o,
  input  logic [31:0] instr_addr_i,
  output logic [31:0] instr_rdata_o,
  output logic        instr_err_o,

  // data port
  input  logic        data_req_i,
  output logic        data_gnt_o,
  output logic        data_rvalid_o,
  input  logic        data_we_i,
  input  logic [3:0]  data_be_i,
  input  logic [31:0] data_addr_i,
  input  logic [31:0] data_wdata_i,
  output logic [31:0] data_rdata_o,
  output logic        data_err_o,

  output logic        sim_done_o,
  output logic [31:0] sim_exit_code_o
);

  localparam int unsigned WORDS = 262144;  // 1 MiB

  logic [31:0] mem [WORDS];

  initial begin
    string hex_file;
    if (!$value$plusargs("hex=%s", hex_file)) $fatal(1, "[tb] no program given, use +hex=<file>");
    $readmemh(hex_file, mem);
  end

  wire instr_in_ram = instr_addr_i < 4 * WORDS;
  wire data_in_ram  = data_addr_i  < 4 * WORDS;
  wire [17:0] instr_word = instr_addr_i[19:2];
  wire [17:0] data_word  = data_addr_i[19:2];

  // grant every request immediately
  assign instr_gnt_o = instr_req_i;
  assign data_gnt_o  = data_req_i;

  // instruction port: answer one cycle after the request
  logic        instr_rvalid_q = 1'b0;
  logic [31:0] instr_rdata_q;
  logic        instr_err_q;
  always_ff @(posedge clk_i) begin
    instr_rvalid_q <= instr_req_i;
    instr_rdata_q  <= instr_in_ram ? mem[instr_word] : 32'h0;
    instr_err_q    <= !instr_in_ram;
  end
  assign instr_rvalid_o = instr_rvalid_q;
  assign instr_rdata_o  = instr_rdata_q;
  assign instr_err_o    = instr_err_q;

  // data port: answer one cycle after the request; writes go to RAM or to
  // the simulation-control addresses
  logic        data_rvalid_q = 1'b0;
  logic [31:0] data_rdata_q;
  logic        data_err_q;
  logic        done_q = 1'b0;
  logic [31:0] exit_code_q = 32'h0;
  wire         to_ctrl = data_addr_i == 32'h1000_0000 || data_addr_i == 32'h1000_0004;

  always_ff @(posedge clk_i) begin
    data_rvalid_q <= data_req_i;
    data_rdata_q  <= data_in_ram ? mem[data_word] : 32'h0;
    data_err_q    <= !data_in_ram && !(data_we_i && to_ctrl);

    if (data_req_i && data_we_i) begin
      if (data_in_ram) begin
        for (int b = 0; b < 4; b++)
          if (data_be_i[b]) mem[data_word][8*b +: 8] <= data_wdata_i[8*b +: 8];
      end else if (data_addr_i == 32'h1000_0000) begin
        $write("%c", data_wdata_i[7:0]);
        $fflush();
      end else if (data_addr_i == 32'h1000_0004) begin
        done_q      <= 1'b1;
        exit_code_q <= data_wdata_i;
      end
    end
  end
  assign data_rvalid_o   = data_rvalid_q;
  assign data_rdata_o    = data_rdata_q;
  assign data_err_o      = data_err_q;
  assign sim_done_o      = done_q;
  assign sim_exit_code_o = exit_code_q;

endmodule
