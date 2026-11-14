import React from 'react';
import {mono, sans} from '../styles/theme';
import {ease, progress} from './Motion';

interface ProcessorHeroProps {
  frame: number;
  size?: number;
  id?: string;
}

export const ProcessorHero: React.FC<ProcessorHeroProps> = ({
  frame,
  size = 760,
  id = 'hero',
}) => {
  const s = size / 760;
  const a = ease(progress(frame, 0, 50));

  // Slow, smooth 70-frame draw-in for outer traces and gentle continuous signal flow
  const traceReveal = ease(progress(frame, 0, 70));
  const dashFlow = -frame * 0.55;

  // Calm, monotonic 4x4 ISQRT progression across the scene that settles once complete
  const stageProg = ease(progress(frame, 15, 160));
  const activeStageCount = Math.min(16, Math.round(stageProg * 16));
  const allSolved = stageProg >= 0.99;

  // Gentle 3D breathing motion
  const floatZ = Math.sin(frame / 90) * 2.5 * s;
  const microRotX = Math.sin(frame / 110) * 0.8;
  const microRotY = Math.cos(frame / 120) * 1.0;

  // Geometry constants (normalized 760px space, scaled by `s`)
  const pkgLeft = 155 * s;
  const pkgTop = 155 * s;
  const pkgSize = 450 * s;
  const pkgDepth = 16 * s;

  const dieLeft = 225 * s;
  const dieTop = 220 * s;
  const dieSize = 310 * s;
  const dieDepth = 15 * s;

  const isqrtLeft = 365 * s;
  const isqrtTop = 365 * s;
  const isqrtW = 158 * s;
  const isqrtH = 152 * s;
  const isqrtDepth = 18 * s;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: `rotateX(${microRotX}deg) rotateY(${microRotY}deg)`,
        userSelect: 'none',
      }}
    >
      {/* LAYER 0 (Z = -26px): Clean PCB Traces (No Outer Box, No Shadow) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${-26 * s}px)`,
          pointerEvents: 'none',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 760 760"
          style={{display: 'block', overflow: 'visible', opacity: a}}
        >
          {/* Left & Top Input Traces (Sky Blue - rs1 Operand & Control) */}
          {Array.from({length: 8}, (_, i) => {
            const pos = 225 + i * 38;
            const isActive = i % 2 === 0;
            const leftD = `M 162 ${pos} H 118 L ${76 - (i % 3) * 12} ${pos + (i - 3.5) * 6} H 14`;
            const topD = `M ${pos} 162 V 118 L ${pos + (i - 3.5) * 5} ${76 - (i % 3) * 12} V 14`;
            return (
              <g key={`trace-in-${i}`} fill="none" strokeLinecap="round">
                <path
                  d={leftD}
                  stroke={isActive ? '#0284c7' : '#cbd5e1'}
                  strokeWidth={isActive ? 1.8 : 1.1}
                  opacity={isActive ? 0.45 * traceReveal : 0.45 * traceReveal}
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - traceReveal}
                />
                {isActive && (
                  <path
                    d={leftD}
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                    strokeDasharray="28 42"
                    strokeDashoffset={-dashFlow}
                    opacity={0.78 * traceReveal}
                  />
                )}
                <path
                  d={topD}
                  stroke={isActive ? '#0284c7' : '#cbd5e1'}
                  strokeWidth={isActive ? 1.6 : 1.1}
                  opacity={isActive ? 0.38 * traceReveal : 0.4 * traceReveal}
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - traceReveal}
                />
              </g>
            );
          })}

          {/* Right & Bottom Output Traces (Emerald Green - rd Result) */}
          {Array.from({length: 8}, (_, i) => {
            const pos = 225 + i * 38;
            const isActive = i % 2 === 1;
            const rightD = `M 598 ${pos} H 642 L ${684 + (i % 3) * 12} ${pos + (i - 3.5) * 6} H 746`;
            const bottomD = `M ${pos} 598 V 642 L ${pos + (i - 3.5) * 5} ${684 + (i % 3) * 12} V 746`;
            return (
              <g key={`trace-out-${i}`} fill="none" strokeLinecap="round">
                <path
                  d={rightD}
                  stroke={isActive ? '#059669' : '#cbd5e1'}
                  strokeWidth={isActive ? 1.8 : 1.1}
                  opacity={isActive ? 0.5 * traceReveal : 0.45 * traceReveal}
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - traceReveal}
                />
                {isActive && (
                  <path
                    d={rightD}
                    stroke="#10b981"
                    strokeWidth="2.2"
                    strokeDasharray="28 42"
                    strokeDashoffset={dashFlow}
                    opacity={0.82 * traceReveal}
                  />
                )}
                <path
                  d={bottomD}
                  stroke={isActive ? '#059669' : '#cbd5e1'}
                  strokeWidth={isActive ? 1.6 : 1.1}
                  opacity={isActive ? 0.42 * traceReveal : 0.4 * traceReveal}
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - traceReveal}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* LAYER 1 (Z = 0px): 3D Beveled Ceramic Package Substrate + 64 Gold QFP Pins */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transform: 'translateZ(0px)',
          opacity: a,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 760 760"
          style={{position: 'absolute', inset: 0, overflow: 'visible'}}
        >
          <defs>
            <linearGradient id={`${id}-pinV`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id={`${id}-pinH`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {Array.from({length: 16}, (_, i) => {
            const p = 186 + i * 24.5;
            return (
              <g key={`qfp-${i}`}>
                <rect x={p} y="124" width="11" height="36" rx="2" fill={`url(#${id}-pinV)`} stroke="#92400e" strokeWidth="0.6" />
                <rect x={p} y="600" width="11" height="36" rx="2" fill={`url(#${id}-pinV)`} stroke="#92400e" strokeWidth="0.6" />
                <rect x="124" y={p} width="36" height="11" rx="2" fill={`url(#${id}-pinH)`} stroke="#92400e" strokeWidth="0.6" />
                <rect x="600" y={p} width="36" height="11" rx="2" fill={`url(#${id}-pinH)`} stroke="#92400e" strokeWidth="0.6" />
              </g>
            );
          })}
        </svg>

        {/* 3D Ceramic Substrate Block */}
        <div
          style={{
            position: 'absolute',
            left: pkgLeft,
            top: pkgTop,
            width: pkgSize,
            height: pkgSize,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${pkgDepth / 2}px)`,
          }}
        >
          {/* Top Face */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 16 * s,
              background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 55%, #e2e8f0 100%)',
              border: '1.5px solid #94a3b8',
              transform: `translateZ(${pkgDepth / 2}px)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 16 * s,
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontFamily: mono, fontSize: 11 * s, color: '#64748b', fontWeight: 600}}>
                CVE2-QFP64 · RV32IMC
              </span>
              <span style={{fontFamily: mono, fontSize: 11 * s, color: '#0284c7', fontWeight: 600}}>
                SUBSTRATE
              </span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div
                style={{
                  width: 10 * s,
                  height: 10 * s,
                  borderRadius: '50%',
                  background: '#d97706',
                  border: '1px solid #92400e',
                }}
              />
              <span style={{fontFamily: mono, fontSize: 10 * s, color: '#94a3b8'}}>
                PIN-1 REF
              </span>
            </div>
          </div>

          {/* 3D Extruded Bottom Wall (+Y) */}
          <div
            style={{
              position: 'absolute',
              left: 12 * s,
              right: 12 * s,
              top: pkgSize - pkgDepth / 2,
              height: pkgDepth,
              background: 'linear-gradient(180deg, #94a3b8 0%, #cbd5e1 100%)',
              borderTop: '1px solid #64748b',
              transform: 'rotateX(-90deg)',
            }}
          />
          {/* 3D Extruded Right Wall (+X) */}
          <div
            style={{
              position: 'absolute',
              top: 12 * s,
              bottom: 12 * s,
              left: pkgSize - pkgDepth / 2,
              width: pkgDepth,
              background: 'linear-gradient(90deg, #94a3b8 0%, #cbd5e1 100%)',
              borderLeft: '1px solid #64748b',
              transform: 'rotateY(90deg)',
            }}
          />
          {/* 3D Extruded Left Wall (-X) */}
          <div
            style={{
              position: 'absolute',
              top: 12 * s,
              bottom: 12 * s,
              left: -pkgDepth / 2,
              width: pkgDepth,
              background: '#cbd5e1',
              transform: 'rotateY(-90deg)',
            }}
          />
          {/* 3D Extruded Top Wall (-Y) */}
          <div
            style={{
              position: 'absolute',
              left: 12 * s,
              right: 12 * s,
              top: -pkgDepth / 2,
              height: pkgDepth,
              background: '#e2e8f0',
              transform: 'rotateX(90deg)',
            }}
          />
        </div>
      </div>

      {/* LAYER 2 (Z = 20px): Brushed Interposer Frame & Micro-Bond Wires */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${20 * s}px)`,
          opacity: a,
          pointerEvents: 'none',
        }}
      >
        <svg width={size} height={size} viewBox="0 0 760 760" style={{display: 'block', overflow: 'visible'}}>
          <rect
            x="192"
            y="190"
            width="376"
            height="376"
            rx="10"
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          {Array.from({length: 12}, (_, i) => {
            const dPos = 248 + i * 24;
            const oPos = 226 + i * 28;
            return (
              <g key={`bw-${i}`} stroke="#94a3b8" strokeWidth="1.1" opacity="0.72">
                <line x1={dPos} y1="220" x2={oPos} y2="196" />
                <line x1={dPos} y1="530" x2={oPos} y2="560" />
                <line x1="225" y1={dPos - 4} x2="198" y2={oPos - 4} />
                <line x1="535" y1={dPos - 4} x2="562" y2={oPos - 4} />
              </g>
            );
          })}
          {[
            [205, 203],
            [555, 203],
            [205, 553],
            [555, 553],
          ].map(([fx, fy], idx) => (
            <g key={idx} stroke="#64748b" strokeWidth="1.2" opacity="0.7">
              <line x1={fx - 5} y1={fy} x2={fx + 5} y2={fy} />
              <line x1={fx} y1={fy - 5} x2={fx} y2={fy + 5} />
            </g>
          ))}
        </svg>
      </div>

      {/* LAYER 3 (Z = 34px): Raised 3D Silicon Die (CVE2 Core Floorplan) */}
      <div
        style={{
          position: 'absolute',
          left: dieLeft,
          top: dieTop,
          width: dieSize,
          height: dieSize,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${34 * s + dieDepth / 2}px)`,
          opacity: a,
        }}
      >
        {/* Top Face of Silicon Die */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 6 * s,
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            border: '1.5px solid #475569',
            transform: `translateZ(${dieDepth / 2}px)`,
            padding: 14 * s,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Die Header Strip */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontFamily: mono, fontSize: 10.5 * s, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.6}}>
              CVE2 SILICON DIE
            </span>
            <span style={{fontFamily: mono, fontSize: 10 * s, color: '#38bdf8', fontWeight: 600}}>
              2-STAGE PIPELINE
            </span>
          </div>

          {/* Top Floorplan Row: IF STAGE + ID/EX DECODER */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 * s, marginTop: 8 * s}}>
            <div
              style={{
                background: 'rgba(51, 65, 85, 0.72)',
                border: '1px solid #475569',
                borderRadius: 5 * s,
                padding: `${8 * s}px ${10 * s}px`,
              }}
            >
              <div style={{fontFamily: mono, fontSize: 10.5 * s, fontWeight: 700, color: '#f8fafc'}}>
                IF STAGE
              </div>
              <div style={{fontFamily: sans, fontSize: 9.5 * s, color: '#cbd5e1', marginTop: 3 * s}}>
                PC + Prefetch
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 * s, marginTop: 6 * s}}>
                {Array.from({length: 8}, (_, k) => (
                  <div
                    key={k}
                    style={{
                      height: 4 * s,
                      borderRadius: 1,
                      background: k % 3 === 0 ? '#0284c7' : '#64748b',
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(51, 65, 85, 0.72)',
                border: '1px solid #0284c7',
                borderRadius: 5 * s,
                padding: `${8 * s}px ${10 * s}px`,
              }}
            >
              <div style={{fontFamily: mono, fontSize: 10.5 * s, fontWeight: 700, color: '#38bdf8'}}>
                ID / EX DECODER
              </div>
              <div style={{fontFamily: sans, fontSize: 9.5 * s, color: '#e2e8f0', marginTop: 3 * s}}>
                custom-0 (0x0B)
              </div>
              <div style={{fontFamily: mono, fontSize: 9 * s, color: '#94a3b8', marginTop: 6 * s}}>
                isqrt rd, rs1
              </div>
            </div>
          </div>

          {/* Bottom Floorplan Left Column (Right side hosts Layer 4 Emerald ALU + ISQRT) */}
          <div style={{display: 'grid', gridTemplateColumns: '116fr 158fr', gap: 10 * s, marginTop: 10 * s, flex: 1}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10 * s}}>
              {/* 32x32 Register File */}
              <div
                style={{
                  flex: 1,
                  background: 'rgba(51, 65, 85, 0.65)',
                  border: '1px solid #475569',
                  borderRadius: 5 * s,
                  padding: `${8 * s}px ${9 * s}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{fontFamily: mono, fontSize: 10 * s, fontWeight: 700, color: '#f8fafc'}}>
                    32x32 REGFILE
                  </div>
                  <div style={{fontFamily: sans, fontSize: 9 * s, color: '#cbd5e1', marginTop: 2 * s}}>
                    rs1 / rd write
                  </div>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 3 * s, marginTop: 4 * s}}>
                  {Array.from({length: 5}, (_, r) => (
                    <div
                      key={r}
                      style={{
                        height: 3.5 * s,
                        borderRadius: 1,
                        background: r === 4 ? '#10b981' : r === 1 ? '#38bdf8' : '#475569',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* RV32M (MUL / DIV) */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid #475569',
                  borderRadius: 5 * s,
                  padding: `${7 * s}px ${9 * s}px`,
                }}
              >
                <div style={{fontFamily: mono, fontSize: 9.5 * s, fontWeight: 700, color: '#e2e8f0'}}>
                  RV32M
                </div>
                <div style={{fontFamily: mono, fontSize: 8.5 * s, color: '#94a3b8', marginTop: 2 * s}}>
                  MUL / DIV
                </div>
              </div>
            </div>

            {/* Emerald-tinted bay underneath elevated Layer 4 ALU + ISQRT unit */}
            <div
              style={{
                borderRadius: 6 * s,
                border: '1px dashed rgba(52, 211, 153, 0.4)',
                background: 'rgba(5, 150, 105, 0.12)',
              }}
            />
          </div>
        </div>

        {/* 3D Extruded Silicon Die Walls */}
        <div
          style={{
            position: 'absolute',
            left: 3 * s,
            right: 3 * s,
            top: dieSize - dieDepth / 2,
            height: dieDepth,
            background: 'linear-gradient(180deg, #0f172a 0%, #334155 100%)',
            transform: 'rotateX(-90deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 3 * s,
            bottom: 3 * s,
            left: dieSize - dieDepth / 2,
            width: dieDepth,
            background: 'linear-gradient(90deg, #0f172a 0%, #334155 100%)',
            transform: 'rotateY(90deg)',
          }}
        />
      </div>

      {/* LAYER 4 (Z = 58px): Clean Emerald Green 3D ALU + ISQRT UNIT Block */}
      <div
        style={{
          position: 'absolute',
          left: isqrtLeft,
          top: isqrtTop,
          width: isqrtW,
          height: isqrtH,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${58 * s + floatZ + isqrtDepth / 2}px)`,
          opacity: a,
        }}
      >
        {/* Top Face of Elevated Emerald Green ISQRT Unit */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8 * s,
            background: 'linear-gradient(145deg, #059669 0%, #047857 100%)',
            border: '2px solid #34d399',
            transform: `translateZ(${isqrtDepth / 2}px)`,
            padding: 10 * s,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontFamily: mono, fontSize: 10.5 * s, fontWeight: 700, color: '#ffffff'}}>
              ALU + ISQRT
            </span>
            <span
              style={{
                fontFamily: mono,
                fontSize: 8.5 * s,
                fontWeight: 700,
                padding: `${2 * s}px ${5 * s}px`,
                borderRadius: 4 * s,
                background: '#ecfdf5',
                color: '#059669',
              }}
            >
              1-CYCLE
            </span>
          </div>

          {/* 4x4 Bit-Pair Matrix (calm reveal to settled emerald green) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4 * s,
              marginTop: 6 * s,
            }}
          >
            {Array.from({length: 16}, (_, idx) => {
              const settled = allSolved || idx < activeStageCount;
              const current = !allSolved && idx === activeStageCount;
              const pairNum = 15 - idx;
              return (
                <div
                  key={idx}
                  style={{
                    height: 17 * s,
                    borderRadius: 3 * s,
                    background: current
                      ? '#34d399'
                      : settled
                        ? '#10b981'
                        : 'rgba(6, 78, 59, 0.45)',
                    border: `1px solid ${current ? '#ecfdf5' : settled ? '#a7f3d0' : 'rgba(167, 243, 208, 0.25)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: mono,
                    fontSize: 8 * s,
                    fontWeight: 700,
                    color: current ? '#064e3b' : '#ffffff',
                  }}
                >
                  p{pairNum}
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: mono,
              fontSize: 9 * s,
              color: '#d1fae5',
              marginTop: 4 * s,
            }}
          >
            <span>16 stages</span>
            <span style={{fontWeight: 700, color: '#ffffff'}}>rd = 45,678</span>
          </div>
        </div>

        {/* 3D Extruded Bottom & Right Walls (Clean Emerald Green) */}
        <div
          style={{
            position: 'absolute',
            left: 4 * s,
            right: 4 * s,
            top: isqrtH - isqrtDepth / 2,
            height: isqrtDepth,
            background: '#065f46',
            borderTop: '1px solid #10b981',
            transform: 'rotateX(-90deg)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 4 * s,
            bottom: 4 * s,
            left: isqrtW - isqrtDepth / 2,
            width: isqrtDepth,
            background: '#047857',
            borderLeft: '1px solid #10b981',
            transform: 'rotateY(90deg)',
          }}
        />
      </div>
    </div>
  );
};
