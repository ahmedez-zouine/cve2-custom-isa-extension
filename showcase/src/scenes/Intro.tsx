import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CinematicTitle} from '../components/CinematicTitle';
import {ProcessorHero} from '../components/ProcessorHero';
import {Header, Footnote, ease, progress} from '../components/Motion';

export const Intro: React.FC<{duration: number; short?: boolean}> = ({duration, short}) => {
  const frame = useCurrentFrame();
  const t = frame * (short ? 2 : 1);
  const introScale = 0.88 + 0.08 * ease(progress(frame, 0, duration));

  return (
    <>
      <Header number="01" title="Processor Architecture" />
      <div
        style={{
          position: 'absolute',
          left: 1080,
          top: 135,
          transform: `perspective(1600px) rotateY(-15deg) rotateX(8deg) scale(${introScale})`,
        }}
      >
        <ProcessorHero frame={t} size={760} />
      </div>
      <CinematicTitle frame={t + (short ? 35 : 0)} />
      <Footnote>Ahmed Ez-Zouine (Mohammed V University in Rabat) - CVE2 custom ISA extension</Footnote>
    </>
  );
};
