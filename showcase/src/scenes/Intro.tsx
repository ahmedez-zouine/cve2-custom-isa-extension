import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CinematicTitle} from '../components/CinematicTitle';
import {ProcessorHero} from '../components/ProcessorHero';
import {Header, Footnote, ease, progress} from '../components/Motion';

export const Intro: React.FC<{duration: number; short?: boolean}> = ({duration, short}) => {
  const frame = useCurrentFrame();
  const t = frame * (short ? 2 : 1);
  const introScale = 0.9 + 0.08 * ease(progress(frame, 0, duration));
  const rotY = -15 + Math.sin(t / 110) * 1.8;
  const rotX = 9 + Math.cos(t / 120) * 1.2;

  return (
    <>
      <Header number="01" title="Processor Architecture" />
      <div
        style={{
          position: 'absolute',
          left: 1030,
          top: 130,
          transformStyle: 'preserve-3d',
          transform: `perspective(1500px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${introScale})`,
        }}
      >
        <ProcessorHero frame={t} size={760} />
      </div>
      <CinematicTitle frame={t + (short ? 35 : 0)} />
      <Footnote>Ahmed Ez-Zouine (Mohammed V University in Rabat) - CVE2 custom ISA extension</Footnote>
    </>
  );
};
