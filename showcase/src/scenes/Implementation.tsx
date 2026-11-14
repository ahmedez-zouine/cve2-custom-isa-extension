import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Header, Footnote, Panel, reveal} from '../components/Motion';
import {RTLCodeViewer} from '../components/RTLCodeViewer';
import {C, mono} from '../styles/theme';

export const Implementation: React.FC<{duration: number; short?: boolean}> = ({short}) => {
  const f = useCurrentFrame();
  const t = f * (short ? 2 : 1);

  const decoderCode = [
    "OPCODE_CUSTOM_0: begin // ISQRT decode (0x0B)",
    "  if (instr[31:25] == 7'b000_0000 &&",
    "      instr[24:20] == 5'b0_0000 &&",
    "      instr[14:12] == 3'b000) begin",
    "    alu_operator_o = ALU_ISQRT;",
    "    rf_ren_a_o     = 1'b1;",
    "    rf_we          = 1'b1;",
    "  end else begin",
    "    illegal_insn   = 1'b1;",
    "  end",
    "end",
  ].join('\n');

  const aluCode = [
    "always_comb begin : isqrt_comb",
    "  sq_x     = operand_a_i;",
    "  sq_root  = '0;",
    "  sq_rem   = '0;",
    "  sq_trial = '0;",
    "  for (int i = 0; i < 16; i++) begin",
    "    sq_rem   = (sq_rem << 2) | (sq_x >> 30);",
    "    sq_x     = sq_x << 2;",
    "    sq_trial = (sq_root << 2) | 32'h1;",
    "    sq_root  = sq_root << 1;",
    "    if (sq_rem >= sq_trial) begin",
    "      sq_rem  = sq_rem - sq_trial;",
    "      sq_root = sq_root | 32'h1;",
    "    end",
    "  end",
    "  isqrt_result = sq_root;",
    "end",
  ].join('\n');

  // Synchronized line focus and descriptive labels
  const decoderStep =
    t < 45 ? {line: 0, label: 'Match 0x0B (custom-0)', tone: 'cyan' as const} :
    t < 110 ? {line: 4, label: 'Select ALU_ISQRT', tone: 'cyan' as const} :
    t < 175 ? {line: 5, label: 'Read rs1', tone: 'cyan' as const} :
    t < 245 ? {line: 6, label: 'Enable rd Writeback', tone: 'green' as const} :
    t < 310 ? {line: 8, label: 'Trap Illegal Fields', tone: 'cyan' as const} :
    {line: 6, label: 'Enable rd Writeback', tone: 'green' as const};

  const aluStep =
    t < 45 ? {line: 0, label: 'Combinational Block', tone: 'cyan' as const} :
    t < 100 ? {line: 5, label: '16 Restoring Stages', tone: 'cyan' as const} :
    t < 155 ? {line: 6, label: 'Candidate T = 4R + b', tone: 'cyan' as const} :
    t < 210 ? {line: 8, label: 'Trial D = 4Q + 1', tone: 'cyan' as const} :
    t < 270 ? {line: 10, label: 'Compare T >= D', tone: 'green' as const} :
    {line: 15, label: 'Commit 16-Bit Root', tone: 'green' as const};

  // Smooth calm signal pulse (0 to 1 looping)
  const flowPulse = (t * 0.008) % 1;

  return (
    <>
      <Header number="04" title="RTL Implementation" />

      {/* Heading */}
      <div style={{position: 'absolute', left: 110, top: 120, ...reveal(t, 4)}}>
        <h1 style={{fontSize: 50, letterSpacing: -1, fontWeight: 600, margin: 0, lineHeight: 1.1, color: C.white}}>
          SystemVerilog RTL Integration
        </h1>
        <p style={{fontSize: 22, color: C.muted, margin: '10px 0 0'}}>
          Custom instruction decode and unrolled 16-step recurrence in cve2_decoder.sv and cve2_alu.sv.
        </p>
      </div>

      {/* Main Two-Editor Layout */}
      <div style={{position: 'absolute', left: 110, right: 110, top: 230, display: 'flex', gap: 24, ...reveal(t, 10)}}>
        {/* Left: Decoder Editor + Insight Card */}
        <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column'}}>
          <RTLCodeViewer
            path="cve2/rtl/cve2_decoder.sv"
            code={decoderCode}
            firstLine={345}
            frame={t - 8}
            focusLine={decoderStep.line}
            focusLabel={decoderStep.label}
            focusTone={decoderStep.tone}
            badge="Instruction Decoder"
            fontSize={17}
            lineHeight={31}
            style={{height: 500}}
          />

          <div
            style={{
              marginTop: 14,
              padding: '13px 18px',
              background: '#ffffff',
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <span style={{fontSize: 14.5, fontWeight: 700, color: C.white}}>Opcode 0x0B (CUSTOM-0)</span>
              <span style={{fontSize: 13.5, color: C.muted, marginLeft: 10}}>
                Strict legality trap on non-zero fields
              </span>
            </div>
            <span
              style={{
                fontFamily: mono,
                fontSize: 12.5,
                color: C.cyan,
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                padding: '3px 10px',
                borderRadius: 6,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              rs1 -&gt; ALU -&gt; rd
            </span>
          </div>
        </div>

        {/* Right: ALU Recurrence Editor + Insight Card */}
        <div style={{flex: 1.32, minWidth: 0, display: 'flex', flexDirection: 'column'}}>
          <RTLCodeViewer
            path="cve2/rtl/cve2_alu.sv : isqrt_comb"
            code={aluCode}
            firstLine={1322}
            frame={t - 14}
            focusLine={aluStep.line}
            focusLabel={aluStep.label}
            focusTone={aluStep.tone}
            badge="16 Unrolled Restoring Steps"
            fontSize={16.5}
            lineHeight={25}
            style={{height: 500}}
          />

          <div
            style={{
              marginTop: 14,
              padding: '13px 18px',
              background: '#ffffff',
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <span style={{fontSize: 14.5, fontWeight: 700, color: C.white}}>always_comb : isqrt_comb</span>
              <span style={{fontSize: 13.5, color: C.muted, marginLeft: 10}}>
                Pure combinational datapath without internal clocks
              </span>
            </div>
            <span
              style={{
                fontFamily: mono,
                fontSize: 12.5,
                color: C.green,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '3px 10px',
                borderRadius: 6,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              0 Pipeline Stalls
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bridge: Result Multiplexer and End-to-End Signal Flow */}
      <Panel
        style={{
          position: 'absolute',
          left: 110,
          right: 110,
          top: 816,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          background: '#ffffff',
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          ...reveal(t, 24),
        }}
      >
        {/* Left: Result Mux RTL Excerpt */}
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <span style={{fontSize: 15, fontWeight: 600, color: C.muted}}>Result Mux</span>
          <code
            style={{
              fontFamily: mono,
              fontSize: 17,
              color: C.cyan,
              background: '#f0f9ff',
              padding: '6px 14px',
              borderRadius: 6,
              fontWeight: 600,
              border: '1px solid #bae6fd',
            }}
          >
            ALU_ISQRT: result_o = isqrt_result;
          </code>
        </div>

        {/* Center: Smooth End-to-End Signal Flow */}
        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{padding: '5px 12px', background: '#f8fafc', border: `1px solid ${C.borderSubtle}`, borderRadius: 6, fontFamily: mono, fontSize: 13, color: C.white, fontWeight: 600}}>
            cve2_decoder
          </div>
          <svg width="34" height="12" viewBox="0 0 34 12">
            <line x1="2" y1="6" x2="28" y2="6" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
            <polygon points="32,6 26,2.5 26,9.5" fill="#94a3b8" />
            <circle cx={4 + 24 * flowPulse} cy="6" r="2.5" fill={C.cyan} />
          </svg>

          <div style={{padding: '5px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, fontFamily: mono, fontSize: 13, color: C.cyan, fontWeight: 600}}>
            cve2_alu
          </div>
          <svg width="34" height="12" viewBox="0 0 34 12">
            <line x1="2" y1="6" x2="28" y2="6" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
            <polygon points="32,6 26,2.5 26,9.5" fill="#94a3b8" />
            <circle cx={4 + 24 * ((flowPulse + 0.33) % 1)} cy="6" r="2.5" fill={C.cyan} />
          </svg>

          <div style={{padding: '5px 12px', background: '#f8fafc', border: `1px solid ${C.borderSubtle}`, borderRadius: 6, fontFamily: mono, fontSize: 13, color: C.white, fontWeight: 600}}>
            cve2_ex_block
          </div>
          <svg width="34" height="12" viewBox="0 0 34 12">
            <line x1="2" y1="6" x2="28" y2="6" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
            <polygon points="32,6 26,2.5 26,9.5" fill="#059669" />
            <circle cx={4 + 24 * ((flowPulse + 0.66) % 1)} cy="6" r="2.5" fill={C.green} />
          </svg>

          <div style={{padding: '5px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, fontFamily: mono, fontSize: 13, color: C.green, fontWeight: 600}}>
            rd writeback
          </div>
        </div>

        {/* Right: Key Specs */}
        <div style={{display: 'flex', gap: 10}}>
          <span style={{fontFamily: mono, fontSize: 13, background: '#f8fafc', border: `1px solid ${C.line}`, padding: '4px 10px', borderRadius: 6, color: C.white, fontWeight: 600}}>
            1 Cycle Latency
          </span>
          <span style={{fontFamily: mono, fontSize: 13, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: 6, color: C.green, fontWeight: 600}}>
            0 Stalls
          </span>
        </div>
      </Panel>

      <Footnote>
        Source files: cve2/rtl/cve2_decoder.sv and cve2/rtl/cve2_alu.sv. ISQRT integrates directly without adding pipeline stages or stall cycles.
      </Footnote>
    </>
  );
};
