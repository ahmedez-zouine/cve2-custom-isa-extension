import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Header, Footnote, Panel, reveal} from '../components/Motion';
import {RTLCodeViewer} from '../components/RTLCodeViewer';
import {C, mono, sans} from '../styles/theme';

export const Implementation: React.FC<{duration: number; short?: boolean}> = ({duration, short}) => {
  const f = useCurrentFrame();
  const t = f * (short ? 2 : 1);

  // Snippets
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

  // Dynamic focus logic synchronized with presentation timeline
  const decoderFocus =
    t < 30 ? 0 :
    t < 90 ? 4 :
    t < 160 ? 5 :
    t < 230 ? 6 :
    t < 300 ? 8 : -1;

  const aluFocus =
    t < 40 ? 0 :
    t < 90 ? 5 :
    t < 140 ? 6 :
    t < 190 ? 8 :
    t < 250 ? 10 :
    t < 320 ? 15 : -1;

  // Signal flow animation pulse (0 to 1 looping)
  const flowPulse = (t * 0.015) % 1;

  return (
    <>
      <Header number="04" title="RTL Implementation" />

      {/* Heading */}
      <div style={{position: 'absolute', left: 110, top: 125, ...reveal(t, 4)}}>
        <h1 style={{fontSize: 52, letterSpacing: -1, fontWeight: 600, margin: 0, lineHeight: 1.1, color: C.white}}>
          SystemVerilog RTL Integration
        </h1>
        <p style={{fontSize: 23, color: C.muted, margin: '12px 0 0'}}>
          Custom instruction decode and unrolled 16-step recurrence in cve2_decoder.sv and cve2_alu.sv.
        </p>
      </div>

      {/* Main Two-Editor Layout */}
      <div style={{position: 'absolute', left: 110, right: 110, top: 235, display: 'flex', gap: 28, ...reveal(t, 10)}}>
        {/* Left: Decoder Editor */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
          <RTLCodeViewer
            path="cve2/rtl/cve2_decoder.sv"
            code={decoderCode}
            firstLine={345}
            frame={t - 10}
            focusLine={decoderFocus}
            badge="Instruction Decoder"
            fontSize={18}
            lineHeight={29}
            style={{height: 545}}
          />

          {/* Decoder Architecture Insight Card */}
          <div
            style={{
              marginTop: 14,
              padding: '14px 18px',
              background: '#f8fafc',
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{fontSize: 14, fontWeight: 700, color: C.white}}>Opcode 0x0B (CUSTOM-0)</span>
              <span style={{fontSize: 13, color: C.muted, marginLeft: 10}}>Strict legality trap on non-zero unused fields</span>
            </div>
            <span style={{fontFamily: mono, fontSize: 13, color: C.cyan, fontWeight: 600}}>
              rs1 → ALU → rd
            </span>
          </div>
        </div>

        {/* Right: ALU Recurrence Editor */}
        <div style={{flex: 1.32, display: 'flex', flexDirection: 'column'}}>
          <RTLCodeViewer
            path="cve2/rtl/cve2_alu.sv : isqrt_comb"
            code={aluCode}
            firstLine={1322}
            frame={t - 16}
            focusLine={aluFocus}
            badge="16 Unrolled Restoring Steps"
            fontSize={18}
            lineHeight={29}
            style={{height: 545}}
          />

          {/* ALU Architecture Insight Card */}
          <div
            style={{
              marginTop: 14,
              padding: '14px 18px',
              background: '#f8fafc',
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{fontSize: 14, fontWeight: 700, color: C.white}}>always_comb : isqrt_comb</span>
              <span style={{fontSize: 13, color: C.muted, marginLeft: 10}}>Pure combinational datapath without internal clocks</span>
            </div>
            <span style={{fontFamily: mono, fontSize: 13, color: C.green, fontWeight: 600}}>
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
          top: 835,
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          background: '#ffffff',
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          ...reveal(t, 24),
        }}
      >
        {/* Left: Result Mux RTL Excerpt */}
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <span style={{fontSize: 15, fontWeight: 600, color: C.muted}}>Result Mux</span>
          <code
            style={{
              fontFamily: mono,
              fontSize: 18,
              color: C.cyan,
              background: C.cyanLight,
              padding: '6px 14px',
              borderRadius: 6,
              fontWeight: 600,
              border: '1px solid #bae6fd',
            }}
          >
            ALU_ISQRT: result_o = isqrt_result;
          </code>
        </div>

        {/* Center: Live Flow Pipeline Diagram */}
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{padding: '5px 12px', background: '#f1f5f9', borderRadius: 6, fontFamily: mono, fontSize: 13, color: C.white, fontWeight: 600}}>
            cve2_decoder
          </div>
          <svg width="40" height="12" viewBox="0 0 40 12">
            <line x1="2" y1="6" x2="34" y2="6" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
            <polygon points="38,6 32,2 32,10" fill="#94a3b8" />
            <circle cx={4 + 30 * flowPulse} cy="6" r="3" fill="#0284c7" />
          </svg>

          <div style={{padding: '5px 12px', background: '#e0f2fe', borderRadius: 6, fontFamily: mono, fontSize: 13, color: '#0369a1', fontWeight: 600}}>
            cve2_alu
          </div>
          <svg width="40" height="12" viewBox="0 0 40 12">
            <line x1="2" y1="6" x2="34" y2="6" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
            <polygon points="38,6 32,2 32,10" fill="#94a3b8" />
            <circle cx={4 + 30 * ((flowPulse + 0.33) % 1)} cy="6" r="3" fill="#0284c7" />
          </svg>

          <div style={{padding: '5px 12px', background: '#ecfdf5', borderRadius: 6, fontFamily: mono, fontSize: 13, color: '#059669', fontWeight: 600}}>
            cve2_ex_block (mux)
          </div>
          <svg width="40" height="12" viewBox="0 0 40 12">
            <line x1="2" y1="6" x2="34" y2="6" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
            <polygon points="38,6 32,2 32,10" fill="#94a3b8" />
            <circle cx={4 + 30 * ((flowPulse + 0.66) % 1)} cy="6" r="3" fill="#059669" />
          </svg>

          <div style={{padding: '5px 12px', background: '#ecfdf5', borderRadius: 6, fontFamily: mono, fontSize: 13, color: '#059669', fontWeight: 700}}>
            rd writeback
          </div>
        </div>

        {/* Right: Key Specs */}
        <div style={{display: 'flex', gap: 14}}>
          <span style={{fontFamily: mono, fontSize: 13, background: '#f8fafc', border: `1px solid ${C.line}`, padding: '4px 10px', borderRadius: 5, color: C.white, fontWeight: 600}}>
            1 Cycle Latency
          </span>
          <span style={{fontFamily: mono, fontSize: 13, background: '#f8fafc', border: `1px solid ${C.line}`, padding: '4px 10px', borderRadius: 5, color: C.green, fontWeight: 600}}>
            +0 FFs Overhead
          </span>
        </div>
      </Panel>

      <Footnote>
        Source files: cve2/rtl/cve2_decoder.sv and cve2/rtl/cve2_alu.sv. ISQRT integrates directly without adding pipeline stages or stall cycles.
      </Footnote>
    </>
  );
};
