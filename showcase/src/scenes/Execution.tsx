import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Header, Footnote, reveal} from '../components/Motion';
import {ISQRTVisualization} from '../components/ISQRTVisualization';
import {C} from '../styles/theme';

export const Execution: React.FC<{duration: number; short?: boolean}> = ({duration, short}) => {
  const f = useCurrentFrame();
  const t = f * (short ? 2 : 1);

  return (
    <>
      <Header number="03" title="Algorithm and Execution" />

      <div style={{position: 'absolute', left: 110, top: 120, ...reveal(t, 4)}}>
        <h1 style={{fontSize: 50, letterSpacing: -1, fontWeight: 600, margin: 0, lineHeight: 1.1, color: C.white}}>
          32-Bit Hardware Execution: isqrt(2,086,479,684) = 45,678
        </h1>
        <p style={{fontSize: 22, color: C.muted, margin: '10px 0 0'}}>
          All 16 restoring recurrence stages actively resolve one root bit per 2-bit input pair in a single clock cycle.
        </p>
      </div>

      <ISQRTVisualization frame={f} duration={duration} />

      <Footnote>
        Full 32-bit execution trace (0x7C5D2F44 → 0x0000B26E). All 16 stages evaluate combinationally in cve2_alu within one cycle.
      </Footnote>
    </>
  );
};
