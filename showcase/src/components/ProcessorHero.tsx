import React from 'react';
import {C, mono} from '../styles/theme';
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
  const a = ease(progress(frame, 0, 45));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 800 800"
      style={{display: 'block', overflow: 'visible'}}
    >
      <defs>
        <linearGradient id={`${id}substrate`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={`${id}die`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={`${id}isqrtGreen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id={`${id}pinGold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Smooth PCB Signal Traces (Sky-Blue Input / Emerald-Green Output) */}
      <g opacity={a}>
        {Array.from({length: 12}, (_, i) => {
          const p = 186 + i * 39;
          const accent = i % 3 === 0;
          const bend = (i % 3) * 14;
          return (
            <g
              key={i}
              fill="none"
              strokeWidth={accent ? 2 : 1.2}
              strokeLinecap="round"
              opacity={accent ? 0.72 : 0.36}
            >
              {/* Top input traces */}
              <path
                d={`M ${p} 164 V ${112 - bend} L ${p - 32} ${72 - bend} V 12`}
                stroke={accent ? C.cyan : '#94a3b8'}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - a}
              />
              {/* Left input traces */}
              <path
                d={`M 164 ${p} H ${112 - bend} L ${72 - bend} ${p + 28} H 12`}
                stroke={accent ? C.cyan : '#94a3b8'}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - a}
              />
              {/* Right output traces (Emerald Green) */}
              <path
                d={`M 636 ${p} H ${688 + bend} L ${728 + bend} ${p - 28} H 788`}
                stroke={accent ? C.green : '#94a3b8'}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - a}
              />
              {/* Bottom output traces (Emerald Green) */}
              <path
                d={`M ${p} 636 V ${688 + bend} L ${p + 32} ${728 + bend} V 788`}
                stroke={accent ? C.green : '#94a3b8'}
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - a}
              />
            </g>
          );
        })}
      </g>

      {/* Main 3D Beveled Processor Package & Die */}
      <g opacity={a}>
        {/* 3D Bottom-Right Ceramic Extrusion Bevels */}
        <rect x="166" y="178" width="474" height="474" rx="20" fill="#94a3b8" />
        <rect x="162" y="174" width="470" height="470" rx="18" fill="#cbd5e1" />

        {/* 64 Gold QFP Pins (16 per side) */}
        {Array.from({length: 16}, (_, i) => {
          const p = 190 + i * 26.2;
          return (
            <g key={`pin-${i}`}>
              <rect x={p} y="136" width="12" height="36" rx="2" fill={`url(#${id}pinGold)`} />
              <rect x={p} y="628" width="12" height="36" rx="2" fill={`url(#${id}pinGold)`} />
              <rect x="136" y={p} width="36" height="12" rx="2" fill={`url(#${id}pinGold)`} />
              <rect x="628" y={p} width="36" height="12" rx="2" fill={`url(#${id}pinGold)`} />
            </g>
          );
        })}

        {/* Ceramic Package Top Surface */}
        <rect
          x="168"
          y="168"
          width="464"
          height="464"
          rx="16"
          fill={`url(#${id}substrate)`}
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {/* Subtle Silkscreen Header & Pin-1 Dot */}
        <text x="196" y="185" fill="#64748b" fontSize="11" fontFamily={mono} fontWeight="600">
          CVE2-QFP64 · RV32IMC
        </text>
        <circle cx="196" cy="612" r="5" fill="#d97706" />

        {/* Inner Interposer Frame */}
        <rect
          x="192"
          y="192"
          width="416"
          height="416"
          rx="10"
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        {/* 3D Extruded Silicon Die Thickness Bevel */}
        <rect x="228" y="234" width="352" height="344" rx="8" fill="#0f172a" />

        {/* Silicon Die Top Face */}
        <rect
          x="222"
          y="226"
          width="352"
          height="344"
          rx="8"
          fill={`url(#${id}die)`}
          stroke="#475569"
          strokeWidth="2"
        />

        {/* Pipeline Cell Array (6 rows x 10 cols) */}
        {Array.from({length: 6}, (_, row) =>
          Array.from({length: 10}, (_, col) => {
            const isCyanCell = (row + col) % 5 === 0;
            return (
              <rect
                key={`cell-${row}-${col}`}
                x={240 + col * 31.8}
                y={244 + row * 21.5}
                width="25"
                height="15"
                rx="2"
                fill={isCyanCell ? '#0284c7' : (row + col) % 2 === 0 ? '#475569' : '#334155'}
                stroke="#64748b"
                strokeWidth="0.6"
                opacity={isCyanCell ? 0.9 : 1}
              />
            );
          }),
        )}

        {/* Left Block: REGFILE */}
        <rect
          x="238"
          y="386"
          width="124"
          height="166"
          rx="6"
          fill="#334155"
          stroke="#64748b"
          strokeWidth="1.5"
        />
        <text
          x="300"
          y="409"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="14"
          fontFamily={mono}
          fontWeight="700"
        >
          REGFILE
        </text>
        {Array.from({length: 10}, (_, i) => (
          <line
            key={`rf-${i}`}
            x1="252"
            x2="348"
            y1={426 + i * 11.5}
            y2={426 + i * 11.5}
            stroke={i === 9 ? '#10b981' : i === 2 ? '#38bdf8' : '#475569'}
            strokeWidth={i === 9 || i === 2 ? 2.5 : 1.5}
          />
        ))}

        {/* Upper-Right Block: CVE2 Core */}
        <rect
          x="374"
          y="386"
          width="184"
          height="76"
          rx="6"
          fill="#334155"
          stroke="#64748b"
          strokeWidth="1.5"
        />
        <text
          x="466"
          y="424"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="26"
          fontFamily={mono}
          fontWeight="700"
        >
          CVE2
        </text>
        <text
          x="466"
          y="445"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="12"
          fontFamily={mono}
          fontWeight="600"
        >
          RV32IMC
        </text>

        {/* Bold High-Visibility Emerald Green ALU + ISQRT Block */}
        <rect x="380" y="478" width="184" height="76" rx="8" fill="#064e3b" />
        <rect
          x="374"
          y="472"
          width="184"
          height="76"
          rx="8"
          fill={`url(#${id}isqrtGreen)`}
          stroke="#6ee7b7"
          strokeWidth="2.5"
        />
        <text
          x="466"
          y="507"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="21"
          fontFamily={mono}
          fontWeight="700"
        >
          ALU + ISQRT
        </text>
        <text
          x="466"
          y="530"
          textAnchor="middle"
          fill="#ecfdf5"
          fontSize="12.5"
          fontFamily={mono}
          fontWeight="700"
        >
          1-CYCLE · 16 STAGES
        </text>
      </g>
    </svg>
  );
};
