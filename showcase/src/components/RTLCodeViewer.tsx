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
    if (/^(isqrt_result|rf_we)$/.test(tok)) {
      return <span key={i} style={{color: '#059669', fontWeight: 700}}>{tok}</span>;
    }
    if (/^(\d+'[bh][\da-fA-F_]+|'0|32'h1|\d+)$/.test(tok)) {
      return <span key={i} style={{color: '#0369a1', fontWeight: 600}}>{tok}</span>;
    }
    if (/^(instr|rf_ren_a_o|illegal_insn|alu_operator_o|operand_a_i|sq_x|sq_root|sq_rem|sq_trial|result_o|operator_i)$/.test(tok)) {
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
  focusLabel?: string;
  focusTone?: 'cyan' | 'green';
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
  focusLabel = 'ACTIVE',
  focusTone = 'cyan',
  badge = 'SystemVerilog',
  fontSize = 18,
  lineHeight = 28,
  style,
}) => {
  const lines = code.split('\n');
  const indent = Math.min(...lines.filter(l => l.trim()).map(l => l.length - l.trimStart().length));
  const lastLine = firstLine + lines.length - 1;
  const lineRange = `L${firstLine}-${lastLine}`;

  const isGreenFocus = focusTone === 'green';
  const focusBg = isGreenFocus ? '#ecfdf5' : '#f0f9ff';
  const focusBorder = isGreenFocus ? C.green : C.cyan;
  const focusPillBg = isGreenFocus ? '#d1fae5' : '#e0f2fe';
  const focusPillBorder = isGreenFocus ? '#a7f3d0' : '#bae6fd';
  const focusColor = isGreenFocus ? C.green : C.cyan;

  return (
    <Panel
      style={{
        overflow: 'hidden',
        background: '#ffffff',
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        boxShadow: '0 6px 22px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* macOS Window Header Bar with Traffic-Light Dots & Terminal Icon */}
      <div
        style={{
          padding: '11px 18px',
          background: '#f8fafc',
          borderBottom: `1px solid ${C.line}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14, minWidth: 0}}>
          {/* macOS Traffic Lights */}
          <div style={{display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0}}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#ff5f56',
                border: '1px solid #e0443e',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#ffbd2e',
                border: '1px solid #dea123',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#27c93f',
                border: '1px solid #1aab29',
                display: 'inline-block',
              }}
            />
          </div>

          {/* macOS Terminal Prompt Badge (>_) */}
          <div
            style={{
              width: 24,
              height: 20,
              borderRadius: 5,
              background: '#0f172a',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
              <path
                d="M2.5 3L5.5 6L2.5 9"
                stroke="#34d399"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="7.5"
                y1="9"
                x2="11.5"
                y2="9"
                stroke="#f8fafc"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* File Path & Line Range */}
          <div style={{display: 'flex', alignItems: 'center', gap: 8, minWidth: 0}}>
            <span
              style={{
                fontFamily: mono,
                fontSize: 14.5,
                fontWeight: 600,
                color: C.white,
                whiteSpace: 'nowrap',
              }}
            >
              {path}
            </span>
            <span
              style={{
                fontFamily: mono,
                fontSize: 11.5,
                color: C.muted,
                background: '#ffffff',
                border: `1px solid ${C.borderSubtle}`,
                padding: '1px 7px',
                borderRadius: 4,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {lineRange}
            </span>
          </div>
        </div>

        {/* Module Badge with Status Dot */}
        <span
          style={{
            fontFamily: mono,
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 6,
            background: '#ffffff',
            color: C.white,
            fontWeight: 600,
            border: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: C.green,
              display: 'inline-block',
            }}
          />
          {badge}
        </span>
      </div>

      {/* Code Lines Body */}
      <div style={{padding: '10px 0', background: '#ffffff', flex: 1}}>
        {lines.map((line, idx) => {
          const isFocused = focusLine === idx;
          const lineAlpha = progress(frame, idx * 1.1, 9 + idx * 1.1);
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
                background: isFocused ? focusBg : 'transparent',
                borderLeft: `3.5px solid ${isFocused ? focusBorder : 'transparent'}`,
                transition: 'background 0.2s, border-left-color 0.2s',
              }}
            >
              {/* Line Number */}
              <span
                style={{
                  display: 'inline-block',
                  minWidth: 52,
                  textAlign: 'right',
                  paddingRight: 14,
                  color: isFocused ? focusColor : '#94a3b8',
                  fontSize: Math.max(12, fontSize - 3),
                  fontWeight: isFocused ? 700 : 400,
                  userSelect: 'none',
                  borderRight: `1px solid ${isFocused ? focusPillBorder : '#f1f5f9'}`,
                  marginRight: 14,
                }}
              >
                {firstLine + idx}
              </span>

              {/* Code Tokens */}
              <span style={{flex: 1}}>{renderTokens(rawText)}</span>

              {/* Descriptive Active Line Pill */}
              {isFocused && (
                <span
                  style={{
                    fontFamily: sans,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: focusColor,
                    background: focusPillBg,
                    border: `1px solid ${focusPillBorder}`,
                    padding: '2px 9px',
                    borderRadius: 5,
                    marginLeft: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {focusLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};
