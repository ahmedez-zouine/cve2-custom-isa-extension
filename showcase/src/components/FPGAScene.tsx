import React from 'react';
import {C, mono} from '../styles/theme';
import {ease, progress} from './Motion';
import evidence from '../data/evidence.json';

export const FPGAScene: React.FC<{frame: number}> = ({frame}) => {
  const p = ease(progress(frame, 18, 85));
  const d = evidence.fpga;

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between'}}>
      {/* 1. Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <div style={{fontSize: 22, fontWeight: 700, color: C.white}}>
            AMD Xilinx Artix-7 Implementation
          </div>
          <div style={{fontSize: 14, color: C.muted, fontFamily: mono, marginTop: 4}}>
            xc7a35tcsg324-1 · Vivado 2024.2 (Post-Route)
          </div>
        </div>
        <span
          style={{
            fontFamily: mono,
            fontSize: 13,
            fontWeight: 600,
            color: C.cyan,
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            padding: '5px 12px',
            borderRadius: 6,
          }}
        >
          50 MHz Target (20 ns)
        </span>
      </div>

      {/* 2. Post-Route Area Utilization Card */}
      <div style={{background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: `1px solid ${C.borderSubtle}`}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
          <span style={{fontSize: 16, fontWeight: 600, color: C.white}}>Routed Logic Utilization (LUTs)</span>
          <span
            style={{
              fontFamily: mono,
              fontSize: 13,
              color: C.cyan,
              background: '#ffffff',
              border: `1px solid ${C.line}`,
              padding: '2px 10px',
              borderRadius: 5,
              fontWeight: 600,
            }}
          >
            +1,218 LUTs (+40.8%)
          </span>
        </div>

        {/* Baseline LUTs */}
        <div style={{marginBottom: 12}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.muted, marginBottom: 5}}>
            <span>Baseline CVE2 Core</span>
            <span style={{fontFamily: mono, color: C.white, fontWeight: 600}}>
              {Number(d.baselineLuts).toLocaleString('en-US')} LUTs
            </span>
          </div>
          <div style={{height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${(d.baselineLuts / 5000) * 100 * p}%`, background: '#94a3b8', borderRadius: 4}} />
          </div>
        </div>

        {/* Extended LUTs */}
        <div style={{marginBottom: 14}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.white, marginBottom: 5}}>
            <span style={{fontWeight: 500}}>Extended Core (with isqrt)</span>
            <span style={{fontFamily: mono, color: C.cyan, fontWeight: 700}}>
              {Number(d.extendedLuts).toLocaleString('en-US')} LUTs
            </span>
          </div>
          <div style={{height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${(d.extendedLuts / 5000) * 100 * p}%`, background: C.cyan, borderRadius: 4}} />
          </div>
        </div>

        {/* Flip-Flops & DSP Row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTop: `1px solid ${C.borderSubtle}`,
            fontSize: 13,
            color: C.muted,
            fontFamily: mono,
          }}
        >
          <span>Flip-Flops: 1,961 → 1,965 (+4 FFs)</span>
          <span>DSP: 1 · BRAM: 0</span>
        </div>
      </div>

      {/* 3. Post-Route Critical Path & Timing Breakdown Card */}
      <div style={{background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: `1px solid ${C.borderSubtle}`}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
          <span style={{fontSize: 16, fontWeight: 600, color: C.white}}>Critical Register Path Delay</span>
          <span style={{fontFamily: mono, fontSize: 13, color: C.muted}}>
            83 Logic Levels · 50 CARRY4
          </span>
        </div>

        {/* Key Timing Metrics Row */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14}}>
          <div style={{background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.borderSubtle}`}}>
            <div style={{fontSize: 12, color: C.muted, marginBottom: 4}}>Datapath Delay</div>
            <div style={{fontFamily: mono, fontSize: 20, fontWeight: 700, color: C.white}}>49.39 ns</div>
          </div>
          <div style={{background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.borderSubtle}`}}>
            <div style={{fontSize: 12, color: C.muted, marginBottom: 4}}>Logic / Routing</div>
            <div style={{fontFamily: mono, fontSize: 16, fontWeight: 600, color: C.cyan, marginTop: 3}}>15.4 / 34.0 ns</div>
          </div>
          <div style={{background: '#ffffff', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.borderSubtle}`}}>
            <div style={{fontSize: 12, color: C.muted, marginBottom: 4}}>Setup Slack (WNS)</div>
            <div style={{fontFamily: mono, fontSize: 20, fontWeight: 700, color: C.white}}>-29.56 ns</div>
          </div>
        </div>

        {/* Visual Logic vs Routing Breakdown Bar */}
        <div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, fontFamily: mono, marginBottom: 5}}>
            <span>Logic Delay: 15.40 ns (31.2%)</span>
            <span>Routing Delay: 33.99 ns (68.8%)</span>
          </div>
          <div style={{display: 'flex', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', gap: 2}}>
            <div style={{width: `${31.2 * p}%`, height: '100%', background: C.cyan}} />
            <div style={{width: `${68.8 * p}%`, height: '100%', background: '#64748b'}} />
          </div>
        </div>
      </div>

      {/* 4. Power & Trade-Off Summary Card */}
      <div
        style={{
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: 10,
          border: `1px solid ${C.borderSubtle}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13.5,
          color: C.muted,
        }}
      >
        <div>
          <strong style={{color: C.white}}>Estimated Power:</strong> 86 mW → 101 mW (+15 mW dynamic)
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 13,
            color: C.green,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '4px 10px',
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          Iterative 16-cycle unit: &gt;50 MHz
        </div>
      </div>
    </div>
  );
};
