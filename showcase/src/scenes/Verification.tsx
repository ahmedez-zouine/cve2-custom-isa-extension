import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Header, Heading, Footnote, Panel, reveal} from '../components/Motion';
import {WaveformViewer} from '../components/WaveformViewer';
import {FPGAScene} from '../components/FPGAScene';
import {C, mono} from '../styles/theme';
import evidence from '../data/evidence.json';

export const Verification: React.FC<{duration: number; short?: boolean}> = ({short}) => {
  const f = useCurrentFrame();
  const t = f * (short ? 2 : 1);

  return (
    <>
      <Header number="05" title="Simulation and FPGA" />

      {/* Heading */}
      <div style={{position: 'absolute', left: 110, top: 125, ...reveal(t, 4)}}>
        <h1 style={{fontSize: 52, letterSpacing: -1, fontWeight: 600, margin: 0, lineHeight: 1.1, color: C.white}}>
          Hardware Verification and FPGA Implementation
        </h1>
        <p style={{fontSize: 23, color: C.muted, margin: '12px 0 0'}}>
          Zero-defect simulation with Verilator and physical routing on AMD Xilinx Artix-7.
        </p>
      </div>

      {/* Left Panel: Logic Analyzer & Testbench */}
      <Panel
        style={{
          position: 'absolute',
          left: 110,
          top: 240,
          width: 930,
          height: 695,
          padding: '24px 28px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          ...reveal(t, 10),
        }}
      >
        <div>
          {/* Header Bar */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18}}>
            <div>
              <span style={{fontSize: 22, fontWeight: 700, color: C.white}}>tb_top : Cycle Simulation</span>
              <span style={{fontSize: 15, color: C.muted, fontFamily: mono, marginLeft: 12}}>Verilator 5.054</span>
            </div>
            <span
              style={{
                color: C.green,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 6,
                padding: '4px 14px',
                fontFamily: mono,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              100% PASS
            </span>
          </div>

          {/* Verification Metrics Tiles */}
          <div style={{display: 'flex', gap: 18, marginBottom: 18}}>
            <div style={{flex: 1, background: '#f8fafc', padding: '12px 18px', borderRadius: 8, border: `1px solid ${C.line}`}}>
              <div style={{fontSize: 34, fontWeight: 700, color: C.white, lineHeight: 1.1}}>
                {evidence.verification.integration.toLocaleString('en-US')}
              </div>
              <div style={{fontSize: 14, color: C.muted, marginTop: 4}}>
                Integration & Random Checks
              </div>
            </div>

            <div style={{flex: 1, background: '#f8fafc', padding: '12px 18px', borderRadius: 8, border: `1px solid ${C.line}`}}>
              <div style={{fontSize: 34, fontWeight: 700, color: C.cyan, lineHeight: 1.1}}>
                {evidence.verification.corners} Suites
              </div>
              <div style={{fontSize: 14, color: C.muted, marginTop: 4}}>
                Corner Cases & Illegal Traps
              </div>
            </div>
          </div>

          {/* Trace Title */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderTop: `1px solid ${C.line}`, paddingTop: 14}}>
            <span style={{fontSize: 16, color: C.cyan, fontFamily: mono, fontWeight: 600}}>
              isqrt x11, x11 (20 → ⌊√20⌋ = 4)
            </span>
            <span style={{fontSize: 13, color: C.muted, fontFamily: mono}}>
              Trace: 20,555 - 20,585 ps
            </span>
          </div>
        </div>

        {/* Waveform Logic Analyzer */}
        <WaveformViewer frame={t - 15} />
      </Panel>

      {/* Right Panel: FPGA Synthesis and Timing */}
      <Panel
        style={{
          position: 'absolute',
          left: 1065,
          top: 240,
          width: 745,
          height: 695,
          padding: '24px 28px',
          boxSizing: 'border-box',
          ...reveal(t, 18),
        }}
      >
        <FPGAScene frame={t - 10} />
      </Panel>

      <Footnote>
        Left: recorded cycle simulation trace with Verilator. Right: routed implementation results on Xilinx Artix-7 XC7A35T.
      </Footnote>
    </>
  );
};
