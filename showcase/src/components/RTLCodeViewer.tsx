import React from 'react';
import {C, mono, sans} from '../styles/theme';
import {Panel, progress} from './Motion';

const tokenRE = /(\/\/.*$|\b(?:always_comb|begin|end|for|int|if|else|case|unique|logic)\b|\b(?:OPCODE_CUSTOM_0|ALU_ISQRT|OP_A_REG_A)\b|\b(?:\d+'[bh][\da-fA-F_]+|'0|32'h1|\d+)\b|\b(?:instr|rf_ren_a_o|rf_we|illegal_insn|alu_operator_o|operand_a_i|sq_x|sq_root|sq_rem|sq_trial|isqrt_result|result_o|operator_i)\b)/g;

function renderTokens(line: string) {
  return line.split(tokenRE).map((tok, i) => {
    if (!tok) return null;
    if (tok.startsWith('//')) {
      return <span key={i} style={{color: '#64748b', fontStyle: 'italic'}}>{tok}</span>;
    }
    if (/^(always_comb|begin|end|for|int|if|else|case|unique|logic)$/.test(tok)) {
      return <span key={i} style={{color: '#0550ae', fontWeight: 600}}>{tok}</span>;
    }
    if (/^(OPCODE_CUSTOM_0|ALU_ISQRT|OP_A_REG_A)$/.test(tok)) {
      return <span key={i} style={{color: '#0284c7', fontWeight: 700}}>{tok}</span>;
    }
    if (/^(\d+'[bh][\da-fA-F_]+|'0|32'h1|\d+)$/.test(tok)) {
      return <span key={i} style={{color: '#0969da', fontWeight: 600}}>{tok}</span>;
    }
    if (/^(instr|rf_ren_a_o|rf_we|illegal_insn|alu_operator_o|operand_a_i|sq_x|sq_root|sq_rem|sq_trial|isqrt_result|result_o|operator_i)$/.test(tok)) {
      return <span key={i} style={{color: '#0f172a', fontWeight: 600}}>{tok}</span>;
    }
    return <span key={i} style={{color: '#334155'}}>{tok}</span>;
  });
}

interface RTLCodeViewerProps {
  path: string;
  code: string;
  firstLine: number;
  frame: number;
  focusLine?: number;
  badge?: string;
  fontSize?: number;
  lineHeight?: number;
  style?: React.CSSProperties;
}

export const RTLCodeViewer: React.FC<RTLCodeViewerProps> = ({
  path,
  code,
  firstLine,
  frame,
  focusLine = -1,
  badge = 'SystemVerilog',
  fontSize = 19,
  lineHeight = 30,
  style,
}) => {
  const lines = code.split('\n');
  const indent = Math.min(...lines.filter(l => l.trim()).map(l => l.length - l.trimStart().length));

  return (
    <Panel
      style={{
        overflow: 'hidden',
        background: '#ffffff',
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* Editor Header Bar with macOS Window Dots */}
      <div
        style={{
          padding: '12px 18px',
          background: '#f8fafc',
          borderBottom: `1px solid ${C.line}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          {/* Traffic Light Dots */}
          <div style={{display: 'flex', gap: 6}}>
            <div style={{width: 10, height: 10, borderRadius: '50%', background: '#ef4444', opacity: 0.85}} />
            <div style={{width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', opacity: 0.85}} />
            <div style={{width: 10, height: 10, borderRadius: '50%', background: '#10b981', opacity: 0.85}} />
          </div>

          {/* File Path */}
          <span style={{fontFamily: mono, fontSize: 15, fontWeight: 600, color: C.white, display: 'flex', alignItems: 'center', gap: 6}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            {path}
          </span>
        </div>

        {/* Language Badge */}
        <span
          style={{
            fontFamily: mono,
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 5,
            background: C.cyanLight,
            color: C.cyan,
            fontWeight: 700,
            border: '1px solid #bae6fd',
          }}
        >
          {badge}
        </span>
      </div>

      {/* Code Lines Body */}
      <div style={{padding: '12px 0', background: '#ffffff', flex: 1}}>
        {lines.map((line, idx) => {
          const isFocused = focusLine === idx;
          const lineAlpha = progress(frame, idx * 1.2, 10 + idx * 1.2);
          const rawText = line.slice(indent >= 0 ? indent : 0);

          return (
            <div
              key={idx}
              style={{
                fontFamily: mono,
                fontSize,
                lineHeight: `${lineHeight}px`,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'pre',
                paddingRight: 16,
                opacity: lineAlpha,
                background: isFocused ? '#f0f9ff' : 'transparent',
                borderLeft: `3.5px solid ${isFocused ? C.cyan : 'transparent'}`,
                transition: 'background 0.2s, border-left-color 0.2s',
              }}
            >
              {/* Line Number */}
              <span
                style={{
                  display: 'inline-block',
                  minWidth: 54,
                  textAlign: 'right',
                  paddingRight: 16,
                  color: isFocused ? C.cyan : '#94a3b8',
                  fontSize: fontSize - 3,
                  fontWeight: isFocused ? 700 : 400,
                  userSelect: 'none',
                  borderRight: `1px solid ${isFocused ? '#bae6fd' : '#f1f5f9'}`,
                  marginRight: 14,
                }}
              >
                {firstLine + idx}
              </span>

              {/* Code Tokens */}
              <span style={{flex: 1}}>{renderTokens(rawText)}</span>

              {/* Active Tag indicator */}
              {isFocused && (
                <span
                  style={{
                    fontFamily: sans,
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.cyan,
                    background: '#e0f2fe',
                    padding: '2px 8px',
                    borderRadius: 4,
                    marginLeft: 12,
                  }}
                >
                  ACTIVE
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};
