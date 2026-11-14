import React from 'react';
import {C, mono} from '../styles/theme';
import {Panel, progress, ease, reveal} from './Motion';

interface RecurrenceStep {
  step: number;
  pairIndex: number;
  pair: number;
  pairBin: string;
  prevRoot: number;
  prevRemainder: number;
  prefix: number;
  candidate: number;
  trial: number;
  qBit: number;
  root: number;
  remainder: number;
}

const INPUT_VALUE = 2086479684; // 45,678^2 = 0x7C5D2F44

function compute32BitSteps(input: number): RecurrenceStep[] {
  const out: RecurrenceStep[] = [];
  let prefix = 0n;
  let root = 0n;
  let rem = 0n;
  const bigIn = BigInt(input);

  for (let idx = 15; idx >= 0; idx--) {
    const shift = BigInt(idx * 2);
    const pair = Number((bigIn >> shift) & 3n);
    const bigPair = BigInt(pair);
    const prevRoot = Number(root);
    const prevRemainder = Number(rem);
    const candidate = (rem << 2n) | bigPair;
    const trial = (root << 2n) | 1n;
    const qBit = candidate >= trial ? 1n : 0n;

    prefix = (prefix << 2n) | bigPair;
    root = (root << 1n) | qBit;
    rem = candidate - qBit * trial;

    out.push({
      step: 16 - idx,
      pairIndex: idx,
      pair,
      pairBin: pair.toString(2).padStart(2, '0'),
      prevRoot,
      prevRemainder,
      prefix: Number(prefix),
      candidate: Number(candidate),
      trial: Number(trial),
      qBit: Number(qBit),
      root: Number(root),
      remainder: Number(rem),
    });
  }
  return out;
}

const STEPS = compute32BitSteps(INPUT_VALUE);
const fmt = new Intl.NumberFormat('en-US');

export const ISQRTVisualization: React.FC<{frame: number; duration: number}> = ({frame, duration}) => {
  // Smooth uniform progression across all 16 active stages (p15 down to p0)
  const phase = progress(frame, duration * 0.08, duration * 0.86);
  const stepIdx = Math.min(15, Math.floor(phase * 16));
  const row = STEPS[stepIdx];
  const isDone = phase >= 0.92;
  const conditionMet = row.candidate >= row.trial;

  const rootSq = BigInt(row.root) * BigInt(row.root);
  const nextSq = BigInt(row.root + 1) * BigInt(row.root + 1);
  const barReveal = ease(progress(frame, 30, 85));

  // Show the current 4-stage group (Stages 1-4, 5-8, 9-12, or 13-16)
  const groupStart = Math.floor(stepIdx / 4) * 4;
  const visibleSteps = STEPS.slice(groupStart, groupStart + 4);

  return (
    <div style={{position: 'absolute', left: 110, right: 110, top: 235}}>
      {/* 1. Top Header & 16 Bit-Pair Strip */}
      <div style={{marginBottom: 24, ...reveal(frame, 6)}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
          <div style={{display: 'flex', gap: 18, alignItems: 'baseline'}}>
            <span style={{fontSize: 18, color: C.muted, fontWeight: 500}}>Input operand_a</span>
            <span style={{fontSize: 36, fontWeight: 700, color: C.white, lineHeight: 1}}>
              {fmt.format(INPUT_VALUE)}
            </span>
            <span
              style={{
                fontFamily: mono,
                fontSize: 15,
                color: C.cyan,
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                padding: '4px 10px',
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              0x7C5D2F44
            </span>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: mono, fontSize: 15, color: C.muted}}>
            <span>Pair p{row.pairIndex} = {row.pairBin}₂</span>
            <span
              style={{
                background: isDone ? '#ecfdf5' : '#ffffff',
                border: `1px solid ${isDone ? '#a7f3d0' : C.line}`,
                padding: '5px 14px',
                borderRadius: 6,
                color: isDone ? C.green : C.white,
                fontWeight: 600,
              }}
            >
              STEP {String(row.step).padStart(2, '0')} / 16
            </span>
          </div>
        </div>

        {/* Clean 16 Bit-Pair Register Strip */}
        <div style={{display: 'flex', gap: 8}}>
          {STEPS.map((s, idx) => {
            const isActive = idx === stepIdx;
            const isPast = idx < stepIdx;
            const resolvedOne = isPast && s.qBit === 1;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  textAlign: 'center',
                  borderRadius: 8,
                  background: isActive ? '#f0f9ff' : isPast ? '#f8fafc' : '#ffffff',
                  border: `1px solid ${isActive ? C.cyan : resolvedOne ? '#bbf7d0' : C.line}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{fontFamily: mono, fontSize: 11, color: isActive ? C.cyan : C.muted, marginBottom: 3}}>
                  p{s.pairIndex}
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 16,
                    fontWeight: 600,
                    color: isActive ? C.cyan : resolvedOne ? C.green : C.white,
                  }}
                >
                  {s.pairBin}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Four Clean Hardware Stage Cards */}
      <div style={{display: 'flex', gap: 24, marginBottom: 24, ...reveal(frame, 14)}}>
        {/* Stage 1: Candidate */}
        <Panel style={{flex: 1, padding: '20px 24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
            <span style={{fontSize: 16, fontWeight: 600, color: C.white}}>Stage 1 : Candidate</span>
            <span style={{fontFamily: mono, fontSize: 13, color: C.muted}}>T = 4R + b</span>
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 15,
              color: C.textSecondary,
              marginBottom: 16,
              background: '#f8fafc',
              padding: '10px 12px',
              borderRadius: 6,
              border: `1px solid ${C.borderSubtle}`,
            }}
          >
            T = ({fmt.format(row.prevRemainder)} &lt;&lt; 2) | {row.pair}
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={{fontSize: 14, color: C.muted}}>Shifted Remainder</span>
            <span style={{fontFamily: mono, fontSize: 28, fontWeight: 700, color: C.white, lineHeight: 1}}>
              {fmt.format(row.candidate)}
            </span>
          </div>
        </Panel>

        {/* Stage 2: Trial Divisor */}
        <Panel style={{flex: 1, padding: '20px 24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
            <span style={{fontSize: 16, fontWeight: 600, color: C.white}}>Stage 2 : Trial Value</span>
            <span style={{fontFamily: mono, fontSize: 13, color: C.muted}}>D = 4Q + 1</span>
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 15,
              color: C.textSecondary,
              marginBottom: 16,
              background: '#f8fafc',
              padding: '10px 12px',
              borderRadius: 6,
              border: `1px solid ${C.borderSubtle}`,
            }}
          >
            D = ({fmt.format(row.prevRoot)} &lt;&lt; 2) | 1
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={{fontSize: 14, color: C.muted}}>Trial Divisor</span>
            <span style={{fontFamily: mono, fontSize: 28, fontWeight: 700, color: C.white, lineHeight: 1}}>
              {fmt.format(row.trial)}
            </span>
          </div>
        </Panel>

        {/* Stage 3: Subtractor & Compare */}
        <Panel style={{flex: 1.18, padding: '20px 24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
            <span style={{fontSize: 16, fontWeight: 600, color: C.white}}>Stage 3 : Compare</span>
            <span
              style={{
                fontFamily: mono,
                fontSize: 13,
                fontWeight: 600,
                color: conditionMet ? C.green : C.muted,
                background: conditionMet ? '#ecfdf5' : '#f8fafc',
                border: `1px solid ${conditionMet ? '#a7f3d0' : C.borderSubtle}`,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {conditionMet ? 'T ≥ D (Subtract)' : 'T < D (Keep T)'}
            </span>
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 15,
              color: C.textSecondary,
              marginBottom: 16,
              background: '#f8fafc',
              padding: '10px 12px',
              borderRadius: 6,
              border: `1px solid ${C.borderSubtle}`,
            }}
          >
            {fmt.format(row.candidate)} {conditionMet ? '≥' : '<'} {fmt.format(row.trial)} → R = {fmt.format(row.remainder)}
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={{fontSize: 14, color: C.muted}}>Root Bit &amp; Remainder</span>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12}}>
              <span style={{fontFamily: mono, fontSize: 28, fontWeight: 700, color: conditionMet ? C.green : C.white, lineHeight: 1}}>
                q = {row.qBit}
              </span>
              <span style={{fontFamily: mono, fontSize: 15, color: C.muted}}>
                R = {fmt.format(row.remainder)}
              </span>
            </div>
          </div>
        </Panel>

        {/* Stage 4: Accumulated Root */}
        <Panel
          style={{
            width: 360,
            padding: '20px 24px',
            background: isDone ? '#f0fdf4' : '#ffffff',
            border: `1px solid ${isDone ? '#86efac' : C.line}`,
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
            <span style={{fontSize: 16, fontWeight: 600, color: isDone ? C.green : C.white}}>
              {isDone ? 'Final Result (rd)' : 'Partial Root Q'}
            </span>
            <span style={{fontFamily: mono, fontSize: 13, color: isDone ? C.green : C.muted}}>
              0x{row.root.toString(16).toUpperCase().padStart(4, '0')}
            </span>
          </div>
          <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14}}>
            <span style={{fontSize: 44, fontWeight: 700, color: isDone ? C.green : C.white, lineHeight: 1}}>
              {fmt.format(row.root)}
            </span>
            <span style={{fontFamily: mono, fontSize: 13, color: isDone ? C.green : C.muted}}>
              {row.step}-bit root
            </span>
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 13,
              color: isDone ? C.green : C.muted,
              fontWeight: isDone ? 600 : 400,
              borderTop: `1px solid ${isDone ? '#a7f3d0' : C.borderSubtle}`,
              paddingTop: 10,
            }}
          >
            {isDone ? 'Verified: 45,678² = 2,086,479,684' : `Q = (${fmt.format(row.prevRoot)} << 1) | ${row.qBit}`}
          </div>
        </Panel>
      </div>

      {/* 3. Bottom Two-Panel Section: Live 16-Stage Trace Window & Performance Summary */}
      <div style={{display: 'flex', gap: 24, height: 292, ...reveal(frame, 22)}}>
        {/* Left Card: Live 4-Stage Window Trace Table */}
        <Panel style={{flex: 1.45, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
              <span style={{fontSize: 17, fontWeight: 600, color: C.white}}>
                Combinational Recurrence Trace (Stages {groupStart + 1} to {groupStart + 4} of 16)
              </span>
              <span style={{fontFamily: mono, fontSize: 13, color: C.muted}}>
                16-bit output: 1011_0010_0110_1110₂
              </span>
            </div>

            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 85px 135px 135px 150px 80px 1fr',
                padding: '8px 14px',
                background: '#f8fafc',
                border: `1px solid ${C.borderSubtle}`,
                borderRadius: 6,
                fontFamily: mono,
                fontSize: 12,
                fontWeight: 600,
                color: C.muted,
                marginBottom: 8,
              }}
            >
              <span>Stage</span>
              <span>Pair (b)</span>
              <span>Candidate T</span>
              <span>Trial D</span>
              <span>Comparison</span>
              <span>Bit q</span>
              <span style={{textAlign: 'right'}}>Root Q / Rem R</span>
            </div>

            {/* 4 Active Window Rows */}
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              {visibleSteps.map((s) => {
                const isRowActive = row.step === s.step;
                const isRowPending = s.step > row.step;
                const taken = s.qBit === 1;

                return (
                  <div
                    key={s.step}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 85px 135px 135px 150px 80px 1fr',
                      padding: '9px 14px',
                      borderRadius: 6,
                      fontFamily: mono,
                      fontSize: 13.5,
                      alignItems: 'center',
                      background: isRowActive ? '#f0f9ff' : '#ffffff',
                      border: `1px solid ${isRowActive ? '#bae6fd' : C.borderSubtle}`,
                      opacity: isRowPending ? 0.45 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{fontWeight: 600, color: isRowActive ? C.cyan : C.white}}>
                      Step {String(s.step).padStart(2, '0')} (p{s.pairIndex})
                    </span>
                    <span style={{color: C.textSecondary}}>{s.pairBin}₂</span>
                    <span style={{color: C.white}}>T = {fmt.format(s.candidate)}</span>
                    <span style={{color: C.white}}>D = {fmt.format(s.trial)}</span>
                    <span style={{color: taken ? C.green : C.muted, fontWeight: taken ? 600 : 400}}>
                      {fmt.format(s.candidate)} {taken ? '≥' : '<'} {fmt.format(s.trial)}
                    </span>
                    <span style={{fontWeight: 600, color: taken ? C.green : C.muted}}>
                      q = {s.qBit}
                    </span>
                    <span style={{textAlign: 'right', fontWeight: 600, color: C.white}}>
                      Q = {fmt.format(s.root)}, R = {fmt.format(s.remainder)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* Right Card: Prefix Invariant & Speedup */}
        <Panel style={{flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
          {/* Top: Prefix Invariant */}
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
              <span style={{fontSize: 17, fontWeight: 600, color: C.white}}>
                Prefix Invariant
              </span>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  color: C.green,
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                }}
              >
                P = Q² + R
              </span>
            </div>
            <div
              style={{
                background: '#f8fafc',
                border: `1px solid ${C.borderSubtle}`,
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontFamily: mono,
              }}
            >
              <div style={{fontSize: 15, fontWeight: 600, color: C.white}}>
                {fmt.format(row.root)}² + {fmt.format(row.remainder)} = {fmt.format(row.prefix)}
              </div>
              <div style={{fontSize: 13, color: C.cyan, fontWeight: 600}}>
                {fmt.format(rootSq)} ≤ {fmt.format(row.prefix)} &lt; {fmt.format(nextSq)}
              </div>
            </div>
          </div>

          {/* Bottom: Workload Speedup */}
          <div style={{borderTop: `1px solid ${C.borderSubtle}`, paddingTop: 14}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12}}>
              <span style={{fontSize: 16, fontWeight: 600, color: C.white}}>
                Benchmark Execution Speedup
              </span>
              <span style={{fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.green}}>
                10.7× Faster
              </span>
            </div>

            <div style={{marginBottom: 10}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5}}>
                <span style={{color: C.white, fontWeight: 500}}>Hardware isqrt (1-Cycle ALU)</span>
                <span style={{fontFamily: mono, fontWeight: 600, color: C.white}}>23 cycles / root</span>
              </div>
              <div style={{height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden'}}>
                <div style={{width: `${(23 / 247) * 100 * barReveal}%`, height: '100%', background: C.cyan, borderRadius: 5}} />
              </div>
            </div>

            <div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5}}>
                <span style={{color: C.muted}}>Software Loop (RV32IMC)</span>
                <span style={{fontFamily: mono, color: C.muted}}>247 cycles / root</span>
              </div>
              <div style={{height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden'}}>
                <div style={{width: `${100 * barReveal}%`, height: '100%', background: '#cbd5e1', borderRadius: 5}} />
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};
