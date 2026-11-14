import React from 'react';
import {C, mono} from '../styles/theme';
import {progress} from './Motion';

export const WaveformViewer: React.FC<{frame: number}> = ({frame}) => {
  // Smooth sweep across the recorded cycle trace
  const sweep = progress(frame, 15, 120);
  const cursorX = 180 + sweep * 580;
  const edgePassed = sweep >= 0.52;

  return (
    <svg width="100%" height="365" viewBox="0 0 820 365" style={{display: 'block', overflow: 'visible'}}>
      <defs>
        <clipPath id="traceClip">
          <rect x="180" y="10" width={580 * sweep} height="345" />
        </clipPath>
      </defs>

      {/* Clean Grid Background */}
      <rect x="180" y="25" width="580" height="315" fill="#f8fafc" rx="8" stroke={C.borderSubtle} strokeWidth="1" />

      {/* Vertical Time Markers */}
      {[240, 480, 720].map((x, idx) => (
        <g key={x}>
          <line x1={x} x2={x} y1="25" y2="340" stroke="#e2e8f0" strokeDasharray="4 6" strokeWidth="1" />
          <text x={x} y="18" fill={C.muted} fontFamily={mono} fontSize="12" textAnchor="middle">
            {['20,555 ps', '20,565 ps (Execute)', '20,575 ps (Writeback)'][idx]}
          </text>
        </g>
      ))}

      {/* Subtle Active Cycle Highlight */}
      <rect x="240" y="25" width="240" height="315" fill={C.cyan} opacity="0.03" />

      {/* Signal Row Labels & Horizontal Dividing Lines */}
      {[
        {name: 'clk_i', y: 55},
        {name: 'instruction', y: 105},
        {name: 'operand_a_i', y: 155},
        {name: 'result_o', y: 205},
        {name: 'rf_we_wb', y: 255},
        {name: 'Stored x11', y: 305},
      ].map((sig, i) => (
        <g key={sig.name}>
          <text x="12" y={sig.y + 5} fill={C.white} fontFamily={mono} fontSize="14" fontWeight="600">
            {sig.name}
          </text>
          {i < 5 && <line x1="180" x2="760" y1={sig.y + 25} y2={sig.y + 25} stroke="#e2e8f0" strokeWidth="1" />}
        </g>
      ))}

      {/* Active Waveforms (Revealed by Sweep) */}
      <g clipPath="url(#traceClip)" fill="none" strokeWidth="2.2">
        {/* 1. Clock Waveform */}
        <path
          d="M 180 68 H 240 V 42 H 360 V 68 H 480 V 42 H 600 V 68 H 720 V 42 H 760"
          stroke="#334155"
        />

        {/* 2. Instruction Bus */}
        <path d="M 180 115 H 230 L 240 92 H 470 L 480 115 H 760" stroke="#64748b" />
        <path d="M 180 92 H 230 L 240 115 H 470 L 480 92 H 760" stroke="#64748b" />
        <rect x="248" y="93" width="224" height="21" fill="#ffffff" rx="4" />

        {/* 3. Operand A Bus */}
        <path d="M 180 165 H 230 L 240 142 H 470 L 480 165 H 760" stroke={C.cyan} />
        <path d="M 180 142 H 230 L 240 165 H 470 L 480 142 H 760" stroke={C.cyan} />
        <rect x="248" y="143" width="224" height="21" fill="#f0f9ff" rx="4" />

        {/* 4. Combinational Result Bus */}
        <path d="M 180 215 H 230 L 240 192 H 470 L 480 215 H 760" stroke={C.green} />
        <path d="M 180 192 H 230 L 240 215 H 470 L 480 192 H 760" stroke={C.green} />
        <rect x="248" y="193" width="224" height="21" fill="#f0fdf4" rx="4" />

        {/* 5. Write Enable Pulse */}
        <path d="M 180 268 H 240 V 242 H 480 V 268 H 760" stroke={C.green} strokeWidth="2.4" />

        {/* 6. Stored Register x11 Bus (Captures 4 at 20575 ps) */}
        <path d="M 180 315 H 470 L 480 292 H 760" stroke={C.green} strokeWidth="2.2" />
        <path d="M 180 292 H 470 L 480 315 H 760" stroke={C.green} strokeWidth="2.2" />
        <rect x="488" y="293" width="264" height="21" fill="#ecfdf5" rx="4" />
      </g>

      {/* Bus Text Values */}
      <g fontFamily={mono} fontSize="13" fontWeight="600" textAnchor="middle">
        <text x="360" y="108" fill={C.white} opacity={progress(frame, 25, 40)}>
          isqrt x11, x11 (0x0B)
        </text>
        <text x="360" y="158" fill={C.cyan} opacity={progress(frame, 30, 45)}>
          operand_a = 20
        </text>
        <text x="360" y="208" fill={C.green} opacity={progress(frame, 40, 55)}>
          result = 4 (⌊√20⌋)
        </text>
        <text x="360" y="258" fill={C.green} opacity={progress(frame, 45, 60)}>
          rf_we = 1 (Active High)
        </text>
        <text x="360" y="308" fill={C.muted} opacity={progress(frame, 35, 50)}>
          x11 = 20
        </text>
        <text x="620" y="308" fill={C.green} opacity={edgePassed ? 1.0 : 0.25}>
          x11 = 4 (Written to rd)
        </text>
      </g>

      {/* Clean Sweep Cursor */}
      <g>
        <line x1={cursorX} x2={cursorX} y1="22" y2="342" stroke={C.cyan} strokeWidth="1.5" />
        <circle cx={cursorX} cy="25" r="3.5" fill={C.cyan} />
        <circle cx={cursorX} cy="340" r="3.5" fill={C.cyan} />
      </g>
    </svg>
  );
};
