import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Background, progress} from './components/Motion';
import {SceneTransition} from './components/SceneTransition';
import {Intro} from './scenes/Intro';
import {Architecture} from './scenes/Architecture';
import {Execution} from './scenes/Execution';
import {Implementation} from './scenes/Implementation';
import {Verification} from './scenes/Verification';
import {Finale} from './scenes/Finale';
import {C, sans, mono} from './styles/theme';
import './styles/global.css';

export const Video: React.FC<{short?: boolean; audio?: boolean}> = ({short = false, audio = true}) => {
  const f = useCurrentFrame();
  const durations = short ? [75, 90, 120, 90, 90, 75] : [270, 450, 540, 420, 450, 360];
  const total = durations.reduce((a, b) => a + b, 0);
  const scenes = [Intro, Architecture, Execution, Implementation, Verification, Finale];

  const chapterTitles = [
    '01 Architecture',
    '02 Datapath',
    '03 Algorithm',
    '04 RTL Design',
    '05 Simulation & FPGA',
    '06 Summary'
  ];

  let acc = 0;
  let activeScene = 0;
  for (let i = 0; i < durations.length; i++) {
    if (f >= acc && f < acc + durations[i]) {
      activeScene = i;
      break;
    }
    acc += durations[i];
  }
  const currentSec = Math.floor(f / 30);
  const totalSec = Math.floor(total / 30);
  const timeFormatted = `${String(Math.floor(currentSec / 60)).padStart(2, '0')}:${String(currentSec % 60).padStart(2, '0')} / ${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;

  let start = 0;
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: sans, color: C.white}}>
      <Background frame={f} />
      {scenes.map((Scene, i) => {
        const from = start;
        start += durations[i];
        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={durations[i]}
            name={chapterTitles[i]}
          >
            <SceneTransition duration={durations[i]}>
              <Scene duration={durations[i]} short={short} />
            </SceneTransition>
          </Sequence>
        );
      })}

      {/* Bottom HUD & Timeline Track */}
      <div style={{position: 'absolute', left: 100, right: 100, bottom: 28}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13, fontFamily: mono, color: C.muted}}>
          <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
            <span style={{color: C.cyan, fontWeight: 600}}>{chapterTitles[activeScene]}</span>
          </div>
          <span>{timeFormatted}</span>
        </div>
        <div style={{position: 'relative', width: '100%', height: 3, background: C.borderSubtle, borderRadius: 2}}>
          <div style={{height: 3, width: `${(f / (total - 1)) * 100}%`, background: C.cyan, borderRadius: 2}} />
          {/* Chapter Boundary Markers */}
          {durations.slice(0, -1).reduce<{acc: number; marks: number[]}>((res, d) => {
            const nextAcc = res.acc + d;
            res.marks.push((nextAcc / total) * 100);
            res.acc = nextAcc;
            return res;
          }, {acc: 0, marks: []}).marks.map((pct, idx) => (
            <div key={idx} style={{position: 'absolute', left: `${pct}%`, top: -2, width: 2, height: 7, background: '#cbd5e1', borderRadius: 1}} />
          ))}
        </div>
      </div>

      {audio && <Audio src={staticFile(short ? 'soundtrack-short.wav' : 'soundtrack.wav')} volume={0.75} />}
      <AbsoluteFill style={{background: '#ffffff', opacity: Math.max(1 - progress(f, 0, 25), progress(f, total - 28, total - 1)), pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
