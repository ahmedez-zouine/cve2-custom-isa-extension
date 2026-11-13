import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Header, Footnote, ease, progress} from '../components/Motion';
import {DatapathDiagramSVG} from '../components/DatapathDiagramSVG';
import {C} from '../styles/theme';

export const Architecture: React.FC<{duration: number; short?: boolean}> = ({duration, short}) => {
  const f = useCurrentFrame();
  const t = f * (short ? 2 : 1);
  const a = ease(progress(t, 4, 24));

  return (
    <>
      <Header number="02" title="Architecture and Datapath" />

      {/* Title */}
      <div style={{position: 'absolute', left: 110, top: 125, opacity: progress(t, 4, 20)}}>
        <h1 style={{fontSize: 52, letterSpacing: -1, fontWeight: 600, margin: 0, lineHeight: 1.1, color: C.white}}>
          Two-Stage Pipeline and ISQRT Integration
        </h1>
        <p style={{fontSize: 23, color: C.muted, margin: '12px 0 0'}}>
          Two-stage RV32IMC core. The ISQRT unit uses the existing ALU and register writeback path.
        </p>
      </div>

      {/* Centered Animated Vector SVG Diagram Card */}
      <div
        style={{
          position: 'absolute',
          left: (1920 - 1360) / 2,
          top: 228,
          width: 1360,
          height: 726,
          background: '#ffffff',
          borderRadius: 14,
          border: `1px solid ${C.line}`,
          boxShadow: '0 10px 32px rgba(0,0,0,0.06)',
          padding: '8px',
          boxSizing: 'border-box',
          opacity: a,
          transform: `translateY(${18 * (1 - a)}px) scale(${0.98 + 0.02 * a})`,
          overflow: 'hidden',
        }}
      >
        <DatapathDiagramSVG frame={t} duration={duration} />
      </div>

      <Footnote>
        The ISQRT operation integrates into cve2_alu. It adds combinational logic without adding pipeline stages or stall cycles.
      </Footnote>
    </>
  );
};
