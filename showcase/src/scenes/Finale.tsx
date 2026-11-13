import React from 'react';
import {useCurrentFrame} from 'remotion';
import {DatapathDiagramSVG} from '../components/DatapathDiagramSVG';
import {ProcessorHero} from '../components/ProcessorHero';
import {CinematicTitle} from '../components/CinematicTitle';
import {Header, Footnote, ease, progress, reveal} from '../components/Motion';
import {C} from '../styles/theme';

export const Finale: React.FC<{duration: number; short?: boolean; stillFrame?: number}> = ({duration, short, stillFrame}) => {
  const currentFrame = useCurrentFrame();
  const f = stillFrame ?? currentFrame;
  const t = f * (short ? 2 : 1);
  const p = ease(progress(f, 0, duration));

  return (
    <>
      <Header number="06" title="Summary" />
      <div
        style={{
          position: 'absolute',
          left: 980,
          top: 95,
          width: 900,
          height: 480,
          opacity: 0.38,
          transform: `scale(${0.68 - 0.04 * p})`,
          transformOrigin: 'top left',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        }}
      >
        <DatapathDiagramSVG frame={t + 60} duration={duration} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 1140,
          top: 255,
          transform: `perspective(1400px) rotateY(-10deg) rotateX(6deg) scale(${0.94 - 0.08 * p})`,
        }}
      >
        <ProcessorHero frame={t + 100} size={660} id="finalChip" />
      </div>
      <CinematicTitle frame={t + 15} final />
      <div style={{position: 'absolute', left: 110, top: 760, color: C.muted, fontSize: 24, lineHeight: 1.6, ...reveal(t, 50)}}>
        Open-source RTL and verification:<br />
        <span style={{color: C.cyan, fontWeight: 600}}>github.com/ahmedez-zouine/cve2-custom-isa-extension</span>
      </div>
      <Footnote>Designed and verified by Ahmed Ez-Zouine (Mohammed V University in Rabat).</Footnote>
    </>
  );
};
