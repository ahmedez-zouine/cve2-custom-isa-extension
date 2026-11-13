import React from 'react';
import {C, mono, sans} from '../styles/theme';
import {ease, progress} from './Motion';
import evidence from '../data/evidence.json';

export const FPGAScene: React.FC<{frame: number}> = ({frame}) => {
  const p = ease(progress(frame, 20, 90));
  const d = evidence.fpga;

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between'}}>
      {/* 1. Header: Xilinx Artix-7 Chip Package */}
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        {/* Chip Icon */}
        <svg width="78" height="78" viewBox="0 0 78 78">
          <rect x="5" y="5" width="68" height="68" rx="6" fill="#f1f5f9" stroke={C.line} strokeWidth="1.5" />
          <rect x="15" y="15" width="48" height="48" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.2" />
          {/* Pins */}
          {Array.from({length: 4}, (_, i) => (
            <g key={i} fill="#d97706">
              <rect x={20 + i * 11} y="1" width="4" height="5" rx="1" />
              <rect x={20 + i * 11} y="72" width="4" height="5" rx="1" />
              <rect x="1" y={20 + i * 11} width="5" height="4" rx="1" />
              <rect x="72" y={20 + i * 11} width="5" height="4" rx="1" />
            </g>
          ))}
          <text x="39" y="44" textAnchor="middle" fill="#ffffff" fontSize="16" fontFamily={mono} fontWeight="700">
            A7
          </text>
        </svg>

        <div>
          <div style={{fontSize: 24, fontWeight: 700, color: C.white, lineHeight: 1.2}}>
            AMD Xilinx Artix-7
          </div>
          <div style={{fontSize: 15, color: C.muted, fontFamily: mono, marginTop: 4}}>
            XC7A35TCSG324-1 : Vivado 2024.2 (Routed OOC)
          </div>
        </div>
      </div>

      {/* 2. Resources Breakdown: LUTs and Flip-Flops */}
      <div style={{background: '#f8fafc', padding: '16px 18px', borderRadius: 10, border: `1px solid ${C.line}`}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
          <span style={{fontSize: 15, fontWeight: 600, color: C.white}}>Look-Up Tables (LUTs)</span>
          <span style={{fontFamily: mono, fontSize: 13, color: C.cyan, background: C.cyanLight, padding: '2px 8px', borderRadius: 4, fontWeight: 600}}>
            +1,218 LUTs (+40.8%)
          </span>
        </div>

        {/* Comparison Bars */}
        <div style={{marginBottom: 10}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.muted, marginBottom: 4}}>
            <span>Baseline CVE2</span>
            <span style={{fontFamily: mono, color: C.white, fontWeight: 600}}>{Number(d.baselineLuts).toLocaleString('en-US')} LUTs</span>
          </div>
          <div style={{height: 7, background: C.borderSubtle, borderRadius: 4, overflow: 'hidden'}}>
            <div style={{height: 7, width: `${(d.baselineLuts / 5000) * 100 * p}%`, background: '#3b82f6', borderRadius: 4}} />
          </div>
        </div>

        <div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.muted, marginBottom: 4}}>
            <span>With ISQRT</span>
            <span style={{fontFamily: mono, color: C.cyan, fontWeight: 600}}>{Number(d.extendedLuts).toLocaleString('en-US')} LUTs</span>
          </div>
          <div style={{height: 7, background: C.borderSubtle, borderRadius: 4, overflow: 'hidden'}}>
            <div style={{height: 7, width: `${(d.extendedLuts / 5000) * 100 * p}%`, background: C.cyan, borderRadius: 4}} />
          </div>
        </div>

        {/* Registers / Flip-Flops */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: `1px solid ${C.line}`}}>
          <span style={{fontSize: 14, color: C.muted}}>Sequential Registers (FFs):</span>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontFamily: mono, fontSize: 14, fontWeight: 600, color: C.white}}>1,780 FFs</span>
            <span style={{fontFamily: mono, fontSize: 12, color: C.green, background: '#ecfdf5', padding: '1px 6px', borderRadius: 4, fontWeight: 600}}>
              +0 FFs (Pure Combinational)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Physical Timing & Slack Analysis */}
      <div style={{background: '#fffbeb', padding: '16px 18px', borderRadius: 10, border: '1px solid #fde68a'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
          <span style={{fontSize: 15, fontWeight: 600, color: '#92400e'}}>Timing Analysis (50 MHz Constraint)</span>
          <span style={{fontFamily: mono, fontSize: 13, color: '#b45309', fontWeight: 600}}>Target: 20.0 ns</span>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6}}>
          <span style={{fontSize: 14, color: '#78350f'}}>Critical Data Path Delay:</span>
          <span style={{fontFamily: mono, fontSize: 22, fontWeight: 700, color: '#b45309'}}>49.56 ns</span>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <span style={{fontSize: 14, color: '#78350f'}}>Worst Negative Slack (WNS):</span>
          <span style={{fontFamily: mono, fontSize: 24, fontWeight: 700, color: '#b91c1c'}}>
            -29.56 ns
          </span>
        </div>
      </div>

      {/* 4. Architectural Insight Takeaway */}
      <div style={{fontSize: 14, color: C.muted, lineHeight: 1.5, background: '#ffffff', padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.line}`}}>
        <span style={{fontWeight: 600, color: C.white}}>Architectural Insight: </span>
        The single-cycle design completes roots in 1 cycle (10.7x benchmark speedup). A multi-cycle iterative alternative slashes area to ~150 LUTs with 100+ MHz closure.
      </div>
    </div>
  );
};
