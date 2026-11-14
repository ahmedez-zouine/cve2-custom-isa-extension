import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Header, Footnote, Panel, reveal} from '../components/Motion';
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
      <div style={{position: 'absolute', left: 110, top: 120, ...reveal(t, 4)}}>
        <h1 style={{fontSize: 50, letterSpacing: -1, fontWeight: 600, margin: 0, lineHeight: 1.1, color: C.white}}>
          Hardware Verification and FPGA Implementation
        </h1>
        <p style={{fontSize: 22, color: C.muted, margin: '10px 0 0'}}>
          Zero-defect cycle simulation with Verilator and physical routing on AMD Xilinx Artix-7.
        </p>
      </div>

      {/* Left Panel: Logic Analyzer & Testbench */}
      <Panel
        style={{
          position: 'absolute',
          left: 110,
          top: 235,
          width: 924,
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
              <div style={{fontSize: 22, fontWeight: 700, color: C.white}}>tb_top : Cycle Simulation</div>
              <div style={{fontSize: 14, color: C.muted, fontFamily: mono, marginTop: 4}}>
                Verilator 5.054 · Recorded Writeback Trace
              </div>
            </div>
            <span
              style={{
                color: C.green,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 6,
                padding: '5px 14px',
                fontFamily: mono,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              200,705 / 200,705 PASS
            </span>
          </div>

          {/* Verification Metrics Tiles */}
          <div style={{display: 'flex', gap: 18, marginBottom: 18}}>
            <div style={{flex: 1, background: '#f8fafc', padding: '14px 18px', borderRadius: 8, border: `1px solid ${C.borderSubtle}`}}>
              <div style={{fontSize: 32, fontWeight: 700, color: C.white, lineHeight: 1.1}}>
                {evidence.verification.integration.toLocaleString('en-US')}
              </div>
              <div style={{fontSize: 13.5, color: C.muted, marginTop: 4}}>
                Directed, Boundary &amp; Random Checks
              </div>
            </div>

            <div style={{flex: 1, background: '#f8fafc', padding: '14px 18px', borderRadius: 8, border: `1px solid ${C.borderSubtle}`}}>
              <div style={{fontSize: 32, fontWeight: 700, color: C.cyan, lineHeight: 1.1}}>
                {evidence.verification.corners} Suites
              </div>
              <div style={{fontSize: 13.5, color: C.muted, marginTop: 4}}>
                x0 Write Ignore, Hazard &amp; Illegal Traps
              </div>
            </div>
          </div>

          {/* Trace Title */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              borderTop: `1px solid ${C.borderSubtle}`,
              paddingTop: 14,
            }}
          >
            <span style={{fontSize: 15, color: C.white, fontFamily: mono, fontWeight: 600}}>
              Trace: isqrt x11, x11 (20 → ⌊√20⌋ = 4)
            </span>
            <span style={{fontSize: 13, color: C.muted, fontFamily: mono}}>
              Window: 20,555 to 20,585 ps
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
          left: 1058,
          top: 235,
          width: 752,
          height: 695,
          padding: '24px 28px',
          boxSizing: 'border-box',
          ...reveal(t, 18),
        }}
      >
        <FPGAScene frame={t - 10} />
      </Panel>

      <Footnote>
        Left: recorded cycle-accurate simulation trace with Verilator. Right: post-routing implementation results on Xilinx Artix-7 XC7A35T.
      </Footnote>
    </>
  );
};
