import React from 'react';
import {C, mono, sans} from '../styles/theme';
import {Panel, progress, ease, reveal} from './Motion';
import evidence from '../data/evidence.json';

export const ISQRTVisualization: React.FC<{frame: number; duration: number}> = ({frame, duration}) => {
  // Relaxed pacing across the scene:
  // Phase 0..0.22: leading zero steps (1 to 12)
  // Phase 0.22..0.85: informative steps (13, 14, 15, 16)
  // Phase 0.85..1.0: final hold and verification badge
  const phase = progress(frame, duration * 0.10, duration * 0.85);

  const stepIdx = Math.min(
    15,
    phase < 0.22
      ? Math.floor((phase / 0.22) * 12)
      : 12 + Math.floor(((phase - 0.22) / 0.78) * 4)
  );

  const row = evidence.workedExample.steps[stepIdx];
  const prevRow = stepIdx > 0 ? evidence.workedExample.steps[stepIdx - 1] : {root: 0, remainder: 0};
  const isDone = phase >= 0.90;

  // Binary bit pair representations
  const pairBinStrings = [
    '00', '00', '00', '00', '00', '00', '00', '00',
    '00', '00', '00', '00', '10', '01', '00', '00'
  ];
  const currentPairBin = pairBinStrings[stepIdx];

  const conditionMet = row.candidate >= row.trial;

  return (
    <div style={{position: 'absolute', left: 110, right: 110, top: 250}}>
      {/* Top Bar: Input Register and 16 Bit-Pairs */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, ...reveal(frame, 6)}}>
        <div style={{display: 'flex', gap: 32, alignItems: 'baseline'}}>
          <span style={{fontSize: 20, color: C.muted, fontWeight: 500}}>Input operand_a</span>
          <span style={{fontSize: 48, fontWeight: 600, color: C.white, lineHeight: 1}}>144</span>
          <span style={{fontFamily: mono, fontSize: 20, color: C.cyan, background: C.cyanLight, padding: '4px 10px', borderRadius: 6, fontWeight: 600}}>
            0x00000090
          </span>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: C.muted, fontFamily: mono}}>
          <span>16 Bit-Pairs [31:0]</span>
          <span style={{background: '#f1f5f9', border: `1px solid ${C.line}`, padding: '4px 12px', borderRadius: 6, color: C.white, fontWeight: 600}}>
            STEP {String(row.step).padStart(2, '0')} / 16
          </span>
        </div>
      </div>

      {/* Bit-Pair Register Strip */}
      <div style={{display: 'flex', gap: 6, marginBottom: 26, ...reveal(frame, 12)}}>
        {pairBinStrings.map((pair, idx) => {
          const isActive = idx === stepIdx;
          const isPast = idx < stepIdx;
          const isInformative = idx >= 12;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                padding: '8px 0',
                textAlign: 'center',
                borderRadius: 8,
                background: isActive ? '#e0f2fe' : isPast ? '#f8fafc' : '#ffffff',
                border: `1.5px solid ${isActive ? C.cyan : isPast ? '#cbd5e1' : '#e2e8f0'}`,
                boxShadow: isActive ? '0 0 12px rgba(2,132,199,0.2)' : 'none',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{fontFamily: mono, fontSize: 11, color: isActive ? C.cyan : C.muted, marginBottom: 2}}>
                p{15 - idx}
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 16,
                  fontWeight: 600,
                  color: isActive ? '#0369a1' : isInformative ? C.white : '#94a3b8',
                }}
              >
                {pair}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main 3-Stage Hardware Execution View */}
      <div style={{display: 'flex', gap: 24, marginBottom: 24, ...reveal(frame, 20)}}>
        {/* Stage 1: Shift & Candidate Formation */}
        <Panel style={{flex: 1, padding: '22px 24px', position: 'relative'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
            <span style={{fontSize: 16, fontWeight: 600, color: C.cyan}}>Stage 1 : Candidate</span>
            <span style={{fontFamily: mono, fontSize: 13, color: C.muted}}>T = 4R + b</span>
          </div>
          <div style={{fontFamily: mono, fontSize: 18, color: C.white, marginBottom: 16, background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: `1px solid ${C.line}`}}>
            T = ({prevRow.remainder} &lt;&lt; 2) | {row.pair}
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={{fontSize: 15, color: C.muted}}>Candidate T:</span>
            <span style={{fontFamily: mono, fontSize: 32, fontWeight: 600, color: C.cyan}}>
              {row.candidate}
            </span>
          </div>
        </Panel>

        {/* Stage 2: Trial Divisor Generation */}
        <Panel style={{flex: 1, padding: '22px 24px', position: 'relative'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
            <span style={{fontSize: 16, fontWeight: 600, color: C.cyan}}>Stage 2 : Trial Divisor</span>
            <span style={{fontFamily: mono, fontSize: 13, color: C.muted}}>D = 4Q + 1</span>
          </div>
          <div style={{fontFamily: mono, fontSize: 18, color: C.white, marginBottom: 16, background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: `1px solid ${C.line}`}}>
            D = ({prevRow.root} &lt;&lt; 2) | 1
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={{fontSize: 15, color: C.muted}}>Trial D:</span>
            <span style={{fontFamily: mono, fontSize: 32, fontWeight: 600, color: C.cyan}}>
              {row.trial}
            </span>
          </div>
        </Panel>

        {/* Stage 3: Comparator & Decision Logic */}
        <Panel style={{flex: 1.15, padding: '22px 24px', position: 'relative'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
            <span style={{fontSize: 16, fontWeight: 600, color: conditionMet ? C.green : '#475569'}}>
              Stage 3 : Subtractor / Compare
            </span>
            <span
              style={{
                fontFamily: mono,
                fontSize: 13,
                fontWeight: 600,
                color: conditionMet ? C.green : '#64748b',
                background: conditionMet ? '#ecfdf5' : '#f1f5f9',
                padding: '3px 8px',
                borderRadius: 4,
              }}
            >
              {conditionMet ? 'T ≥ D (Bit 1)' : 'T < D (Bit 0)'}
            </span>
          </div>
          <div style={{fontFamily: mono, fontSize: 16, color: C.white, marginBottom: 16, background: '#f8fafc', padding: '10px 12px', borderRadius: 6, border: `1px solid ${C.line}`}}>
            {row.candidate} ≥ {row.trial} ? {conditionMet ? `R = ${row.candidate} - ${row.trial} = ${row.remainder}` : `R = ${row.remainder}`}
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={{fontSize: 15, color: C.muted}}>Generated Bit:</span>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12}}>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 32,
                  fontWeight: 700,
                  color: conditionMet ? C.green : '#64748b',
                }}
              >
                q = {conditionMet ? '1' : '0'}
              </span>
              <span style={{fontFamily: mono, fontSize: 16, color: C.muted}}>
                R = {row.remainder}
              </span>
            </div>
          </div>
        </Panel>

        {/* Root Accumulator Register Card */}
        <Panel
          style={{
            width: 380,
            padding: '22px 24px',
            background: isDone ? '#f0fdf4' : '#ffffff',
            borderColor: isDone ? C.green : C.line,
            transition: 'background 0.3s, border-color 0.3s',
          }}
        >
          <div style={{fontSize: 16, color: isDone ? C.green : C.muted, fontWeight: 600, marginBottom: 8}}>
            {isDone ? 'Final Result (rd)' : 'Accumulated Root Q'}
          </div>
          <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
            <span style={{fontSize: 64, fontWeight: 700, color: isDone ? C.green : C.white, lineHeight: 1}}>
              {row.root}
            </span>
            <span style={{fontFamily: mono, fontSize: 18, color: C.muted}}>
              {row.root.toString(2).padStart(4, '0')}₂
            </span>
          </div>
          <div style={{fontFamily: mono, fontSize: 14, color: isDone ? '#047857' : C.muted, marginTop: 14, borderTop: `1px solid ${isDone ? '#a7f3d0' : C.line}`, paddingTop: 10}}>
            {isDone ? '12² = 144 ≤ 144 < 13²' : 'Qnext = (Qprev << 1) | q'}
          </div>
        </Panel>
      </div>

      {/* Bottom Summary Bar */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16, color: C.muted, ...reveal(frame, 28)}}>
        <span>Leading 12 stages evaluate zeroes; final 4 stages resolve the exact integer root.</span>
        <span style={{fontFamily: mono, fontSize: 15, color: isDone ? C.green : C.cyan, fontWeight: 600}}>
          {isDone ? 'Exact root computed in 1 cycle' : '16 combinational unrolled stages'}
        </span>
      </div>
    </div>
  );
};
