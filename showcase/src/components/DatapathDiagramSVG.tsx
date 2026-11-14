import React from 'react';
import {sans, mono} from '../styles/theme';

type Point = [number, number];

function getPointOnPolyline(points: Point[], p: number): Point {
  if (p <= 0) return points[0];
  if (p >= 1) return points[points.length - 1];

  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.hypot(dx, dy);
    lengths.push(len);
    total += len;
  }

  let target = p * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const segT = lengths[i] > 0 ? target / lengths[i] : 0;
      const x = points[i][0] + (points[i + 1][0] - points[i][0]) * segT;
      const y = points[i][1] + (points[i + 1][1] - points[i][1]) * segT;
      return [x, y];
    }
    target -= lengths[i];
  }
  return points[points.length - 1];
}

export interface DatapathState {
  activeStage: 1 | 2 | 3 | 4 | 5;
  showFetchPulse: boolean;
  showDecodePulse: boolean;
  showAluInPulse: boolean;
  isAluActive: boolean;
  showAluOutPulse: boolean;
  showWbPulse: boolean;
  aluDone: boolean;
  pFetch: number;
  pDecode: number;
  pAluIn: number;
  pAluOut: number;
  pWb: number;
}

export function getDatapathState(frame: number): DatapathState {
  const isContinuous = frame >= 175;

  if (!isContinuous) {
    const activeStage: 1 | 2 | 3 | 4 | 5 =
      frame < 42 ? 1 : frame < 66 ? 2 : frame < 94 ? 3 : frame < 122 ? 4 : 5;
    return {
      activeStage,
      showFetchPulse: frame >= 16 && frame <= 54,
      showDecodePulse: frame >= 38 && frame <= 78,
      showAluInPulse: frame >= 62 && frame <= 104,
      isAluActive: frame >= 92 && frame <= 136,
      showAluOutPulse: frame >= 108 && frame <= 145,
      showWbPulse: frame >= 122 && frame <= 175,
      aluDone: frame >= 118,
      pFetch: Math.max(0, Math.min(1, (frame - 16) / 28)),
      pDecode: Math.max(0, Math.min(1, (frame - 38) / 24)),
      pAluIn: Math.max(0, Math.min(1, (frame - 62) / 34)),
      pAluOut: Math.max(0, Math.min(1, (frame - 108) / 24)),
      pWb: Math.max(0, Math.min(1, (frame - 122) / 42)),
    };
  }

  const cyc = ((frame - 175) % 100) / 100;
  const activeStage: 1 | 2 | 3 | 4 | 5 =
    cyc < 0.2 ? 1 : cyc < 0.38 ? 2 : cyc < 0.58 ? 3 : cyc < 0.76 ? 4 : 5;

  return {
    activeStage,
    showFetchPulse: cyc < 0.26,
    showDecodePulse: cyc >= 0.16 && cyc < 0.44,
    showAluInPulse: cyc >= 0.34 && cyc < 0.62,
    isAluActive: cyc >= 0.54 && cyc < 0.8,
    showAluOutPulse: cyc >= 0.66 && cyc < 0.86,
    showWbPulse: cyc >= 0.72,
    aluDone: cyc >= 0.68,
    pFetch: Math.max(0, Math.min(1, cyc / 0.24)),
    pDecode: Math.max(0, Math.min(1, (cyc - 0.16) / 0.24)),
    pAluIn: Math.max(0, Math.min(1, (cyc - 0.34) / 0.26)),
    pAluOut: Math.max(0, Math.min(1, (cyc - 0.66) / 0.18)),
    pWb: Math.max(0, Math.min(1, (cyc - 0.72) / 0.26)),
  };
}

interface DatapathDiagramSVGProps {
  frame: number;
  duration?: number;
  style?: React.CSSProperties;
}

export const DatapathDiagramSVG: React.FC<DatapathDiagramSVGProps> = ({
  frame,
  style,
}) => {
  const pathFetch: Point[] = [[241, 187], [322, 187]];
  const pathDecodeCtrl: Point[] = [[427, 246], [427, 287]];
  const pathRegToAlu: Point[] = [[528, 320], [560, 320], [560, 211], [592, 211]];
  const pathAluToSel: Point[] = [[822, 211], [882, 211]];
  const pathWbReturn: Point[] = [[1061, 239], [1042, 239], [1042, 392], [427, 392], [427, 375]];

  const st = getDatapathState(frame);

  const posFetch = getPointOnPolyline(pathFetch, st.pFetch);
  const posDecode = getPointOnPolyline(pathDecodeCtrl, st.pDecode);
  const posAluIn = getPointOnPolyline(pathRegToAlu, st.pAluIn);
  const posAluOut = getPointOnPolyline(pathAluToSel, st.pAluOut);
  const posWb = getPointOnPolyline(pathWbReturn, st.pWb);

  const dashFlow = -frame * 2.2;
  const dashFlowWb = -frame * 3.0;

  const pLsuDown = ((frame * 1.5) % 60) / 60;
  const pLsuUp = ((frame * 1.5 + 30) % 60) / 60;

  const regWriteHighlight = st.showWbPulse && st.pWb > 0.72;
  const aluIsGreen = st.aluDone;
  const aluActiveOrDone = st.isAluActive || aluIsGreen;

  const stagePills = [
    {id: 1 as const, label: '1. IF Fetch', green: false},
    {id: 2 as const, label: '2. Decode 0x0B', green: false},
    {id: 3 as const, label: '3. Read rs1', green: false},
    {id: 4 as const, label: '4. ALU ISQRT', green: false},
    {id: 5 as const, label: '5. Writeback rd', green: true},
  ];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 1200 640"
      style={{display: 'block', overflow: 'visible', ...style}}
    >
      <defs>
        <marker id="dp-arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0 0L9 4L0 8Z" fill="#315f78" />
        </marker>
        <marker id="dp-arrow-cyan" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0 0L9 4L0 8Z" fill="#0284c7" />
        </marker>
        <marker id="dp-arrow-green" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0 0L9 4L0 8Z" fill="#059669" />
        </marker>

        <filter id="alu-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.35" />
        </filter>
        <filter id="alu-glow-green" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#059669" floodOpacity="0.38" />
        </filter>
        <filter id="packet-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main Studio White Canvas */}
      <rect width="1200" height="640" rx="14" fill="#ffffff" />

      {/* Header Titles */}
      <text
        x="600"
        y="28"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="21"
        fontWeight="700"
        fill="#0f172a"
      >
        CVE2 core datapath and ISQRT integration
      </text>
      <text
        x="600"
        y="50"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="14.5"
        fill="#475569"
      >
        Two-stage RV32IMC core : ISQRT uses the existing decode, ALU and writeback path
      </text>

      {/* 5-Stage Live Status Pill Bar */}
      <g>
        {stagePills.map((pill, idx) => {
          const w = 212;
          const gap = 23;
          const x = 24 + idx * (w + gap);
          const y = 64;
          const isCurrent = st.activeStage === pill.id;
          const isPassed = st.activeStage > pill.id;

          const fill = isCurrent
            ? pill.green
              ? '#ecfdf5'
              : '#e0f2fe'
            : isPassed
              ? '#f8fafc'
              : '#ffffff';
          const stroke = isCurrent
            ? pill.green
              ? '#059669'
              : '#0284c7'
            : isPassed
              ? '#94a3b8'
              : '#cbd5e1';
          const textColor = isCurrent
            ? pill.green
              ? '#059669'
              : '#0369a1'
            : isPassed
              ? '#334155'
              : '#64748b';

          return (
            <g key={pill.id}>
              <rect
                x={x}
                y={y + 3}
                width={w}
                height="30"
                rx="8"
                fill={isCurrent ? (pill.green ? '#a7f3d0' : '#bae6fd') : '#e2e8f0'}
              />
              <rect
                x={x}
                y={y}
                width={w}
                height="30"
                rx="8"
                fill={fill}
                stroke={stroke}
                strokeWidth={isCurrent ? 2 : 1.2}
              />
              <text
                x={x + w / 2}
                y={y + 19.5}
                textAnchor="middle"
                fontFamily={mono}
                fontSize="12.5"
                fontWeight={isCurrent ? '700' : '600'}
                fill={textColor}
              >
                {pill.label}
              </text>
              {idx < stagePills.length - 1 && (
                <path
                  d={`M ${x + w + 5} ${y + 15} H ${x + w + gap - 6}`}
                  stroke={isPassed ? (idx === 3 ? '#059669' : '#0284c7') : '#94a3b8'}
                  strokeWidth="1.8"
                  markerEnd={isPassed ? (idx === 3 ? 'url(#dp-arrow-green)' : 'url(#dp-arrow-cyan)') : 'url(#dp-arrow)'}
                />
              )}
            </g>
          );
        })}
      </g>

      {/* Main Datapath Circuitry Group (cleanly shifted by +18px below status pill bar) */}
      <g transform="translate(0, 18)">
        {/* STAGE 1: IF / FETCH */}
        <rect
          x="24"
          y="94"
          width="246"
          height="332"
          rx="12"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
        <text
          x="147"
          y="122"
          textAnchor="middle"
          fontFamily={sans}
          fontSize="14.5"
          fontWeight="700"
          letterSpacing="1.1"
          fill="#0284c7"
        >
          IF / FETCH
        </text>

        {/* PC + prefetch buffer (with 3D bevel) */}
        <rect x="53" y="153" width="188" height="78" rx="8" fill="#cbd5e1" />
        <rect
          x="53"
          y="148"
          width="188"
          height="78"
          rx="8"
          fill={st.activeStage === 1 ? '#f0f9ff' : '#ffffff'}
          stroke={st.activeStage === 1 ? '#0284c7' : '#315f78'}
          strokeWidth="2"
        />
        <text x="147" y="180" textAnchor="middle" fontFamily={sans} fontSize="20" fontWeight="700" fill="#0f172a">
          PC + prefetch
        </text>
        <text x="147" y="205" textAnchor="middle" fontFamily={sans} fontSize="17" fill="#334155">
          buffer
        </text>

        {/* Compressed instruction decode (with 3D bevel) */}
        <rect x="53" y="284" width="188" height="78" rx="8" fill="#cbd5e1" />
        <rect
          x="53"
          y="279"
          width="188"
          height="78"
          rx="8"
          fill="#ffffff"
          stroke="#315f78"
          strokeWidth="2"
        />
        <text x="147" y="311" textAnchor="middle" fontFamily={sans} fontSize="20" fontWeight="700" fill="#0f172a">
          Compressed
        </text>
        <text x="147" y="336" textAnchor="middle" fontFamily={sans} fontSize="17" fill="#334155">
          instruction decode
        </text>

        {/* Internal IF wire */}
        <path d="M147 226V276" fill="none" stroke="#315f78" strokeWidth="2.4" markerEnd="url(#dp-arrow)" />
        <text x="147" y="393" textAnchor="middle" fontFamily={sans} fontSize="14.5" fill="#475569">
          Instruction memory interface
        </text>

        {/* STAGE 2: ID / EX */}
        <rect
          x="294"
          y="94"
          width="882"
          height="332"
          rx="12"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
        <text
          x="735"
          y="122"
          textAnchor="middle"
          fontFamily={sans}
          fontSize="14.5"
          fontWeight="700"
          letterSpacing="1.1"
          fill="#0284c7"
        >
          ID / EX : DECODE, EXECUTE AND WRITEBACK
        </text>

        {/* Instruction decoder (with floating pill + 3D bevel) */}
        {(st.showDecodePulse || st.activeStage === 2) && (
          <g>
            <rect x="332" y="131" width="190" height="22" rx="11" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.2" />
            <text x="427" y="146" textAnchor="middle" fontFamily={mono} fontSize="11" fontWeight="700" fill="#0369a1">
              isqrt x11, x10 (0x0B)
            </text>
          </g>
        )}
        <rect
          x="326"
          y="166"
          width="202"
          height="84"
          rx="8"
          fill={st.activeStage === 2 ? '#bae6fd' : '#cbd5e1'}
        />
        <rect
          x="326"
          y="161"
          width="202"
          height="84"
          rx="8"
          fill={st.activeStage === 2 ? '#f0f9ff' : '#ffffff'}
          stroke={st.activeStage === 2 ? '#0284c7' : '#315f78'}
          strokeWidth={st.activeStage === 2 ? 2.4 : 2}
        />
        <text x="427" y="194" textAnchor="middle" fontFamily={sans} fontSize="20" fontWeight="700" fill="#0f172a">
          Instruction decoder
        </text>
        <text x="427" y="221" textAnchor="middle" fontFamily={sans} fontSize="17" fill="#334155">
          custom-0 + legality
        </text>

        {/* Register file (with 3D bevel + emerald highlight on writeback) */}
        <rect
          x="326"
          y="296"
          width="202"
          height="80"
          rx="8"
          fill={regWriteHighlight ? '#a7f3d0' : st.activeStage === 3 ? '#bae6fd' : '#cbd5e1'}
        />
        <rect
          x="326"
          y="291"
          width="202"
          height="80"
          rx="8"
          fill={regWriteHighlight ? '#ecfdf5' : st.activeStage === 3 ? '#f0f9ff' : '#ffffff'}
          stroke={regWriteHighlight ? '#059669' : st.activeStage === 3 ? '#0284c7' : '#315f78'}
          strokeWidth={regWriteHighlight ? 2.6 : 2}
        />
        <text
          x="427"
          y="323"
          textAnchor="middle"
          fontFamily={sans}
          fontSize="20"
          fontWeight="700"
          fill={regWriteHighlight ? '#065f46' : '#0f172a'}
        >
          Register file
        </text>
        <text
          x="427"
          y="349"
          textAnchor="middle"
          fontFamily={mono}
          fontSize="14.5"
          fontWeight={regWriteHighlight ? '700' : '500'}
          fill={regWriteHighlight ? '#059669' : '#334155'}
        >
          {regWriteHighlight ? 'x11 <- 45,678 (0xB26E)' : 'read rs1 : write rd'}
        </text>

        {/* ALU [NEW] Box with Sky-Blue & Emerald-Green Accent and 3D Bevel */}
        {aluActiveOrDone && (
          <g>
            <rect
              x="616"
              y="133"
              width="186"
              height="22"
              rx="11"
              fill={aluIsGreen ? '#ecfdf5' : '#e0f2fe'}
              stroke={aluIsGreen ? '#059669' : '#0284c7'}
              strokeWidth="1.2"
            />
            <text
              x="709"
              y="148"
              textAnchor="middle"
              fontFamily={mono}
              fontSize="11"
              fontWeight="700"
              fill={aluIsGreen ? '#059669' : '#0369a1'}
            >
              {aluIsGreen ? 'rd = 45,678 (0x0000B26E)' : 'ALU_ISQRT : 16 stages'}
            </text>
          </g>
        )}
        <rect
          x="596"
          y="169"
          width="226"
          height="96"
          rx="8"
          fill={aluIsGreen ? '#a7f3d0' : '#bae6fd'}
        />
        <rect
          x="596"
          y="164"
          width="226"
          height="96"
          rx="8"
          fill={aluIsGreen ? '#ecfdf5' : '#f0f9ff'}
          stroke={aluIsGreen ? '#059669' : '#0284c7'}
          strokeWidth={aluActiveOrDone ? 2.8 : 2.2}
          filter={
            aluIsGreen
              ? 'url(#alu-glow-green)'
              : st.isAluActive
                ? 'url(#alu-glow-cyan)'
                : undefined
          }
        />
        {/* Pill NEW badge */}
        <rect
          x="766"
          y="174"
          width="44"
          height="24"
          rx="12"
          fill={aluIsGreen ? '#059669' : '#0284c7'}
        />
        <text x="788" y="191" textAnchor="middle" fontFamily={sans} fontSize="13.5" fontWeight="700" fill="#ffffff">
          NEW
        </text>
        <text x="709" y="207" textAnchor="middle" fontFamily={sans} fontSize="22" fontWeight="700" fill="#0f172a">
          ALU
        </text>
        <text
          x="709"
          y="234"
          textAnchor="middle"
          fontFamily={sans}
          fontSize="16.5"
          fontWeight={aluActiveOrDone ? '600' : '500'}
          fill={aluIsGreen ? '#059669' : '#0369a1'}
        >
          ISQRT : 16 restoring steps
        </text>

        {/* Multiply / divide (with 3D bevel) */}
        <rect x="596" y="299" width="226" height="68" rx="8" fill="#cbd5e1" />
        <rect x="596" y="294" width="226" height="68" rx="8" fill="#ffffff" stroke="#315f78" strokeWidth="2" />
        <text x="709" y="323" textAnchor="middle" fontFamily={sans} fontSize="20" fontWeight="700" fill="#0f172a">
          Multiply / divide
        </text>
        <text x="709" y="347" textAnchor="middle" fontFamily={sans} fontSize="14.5" fill="#475569">
          existing execution unit
        </text>

        {/* Result selection (with 3D bevel) */}
        <rect
          x="886"
          y="169"
          width="142"
          height="96"
          rx="8"
          fill={aluIsGreen ? '#a7f3d0' : '#cbd5e1'}
        />
        <rect
          x="886"
          y="164"
          width="142"
          height="96"
          rx="8"
          fill={aluIsGreen ? '#ecfdf5' : '#ffffff'}
          stroke={aluIsGreen ? '#059669' : '#315f78'}
          strokeWidth={aluIsGreen ? 2.4 : 2}
        />
        <text x="957" y="201" textAnchor="middle" fontFamily={sans} fontSize="20" fontWeight="700" fill="#0f172a">
          Result
        </text>
        <text x="957" y="229" textAnchor="middle" fontFamily={sans} fontSize="17" fill="#334155">
          selection
        </text>

        {/* Write back (with 3D bevel) */}
        <rect
          x="1061"
          y="169"
          width="91"
          height="96"
          rx="8"
          fill={st.showWbPulse ? '#a7f3d0' : '#cbd5e1'}
        />
        <rect
          x="1061"
          y="164"
          width="91"
          height="96"
          rx="8"
          fill={st.showWbPulse ? '#ecfdf5' : '#ffffff'}
          stroke={st.showWbPulse ? '#059669' : '#315f78'}
          strokeWidth={st.showWbPulse ? 2.4 : 2}
        />
        <text x="1106" y="201" textAnchor="middle" fontFamily={sans} fontSize="20" fontWeight="700" fill="#0f172a">
          Write
        </text>
        <text x="1106" y="229" textAnchor="middle" fontFamily={sans} fontSize="17" fill="#334155">
          back
        </text>

        {/* WIRES & SIGNALS */}

        {/* 1. PC -> Decoder */}
        <path d="M241 187H322" fill="none" stroke="#315f78" strokeWidth="2.4" markerEnd="url(#dp-arrow)" />
        <path
          d="M241 187H322"
          fill="none"
          stroke="#0284c7"
          strokeWidth="3.2"
          strokeDasharray="14 16"
          strokeDashoffset={dashFlow}
          opacity={st.showFetchPulse ? 0.95 : 0.25}
        />

        {/* 2. Decoder -> RegFile Control (Dashed Sky-Blue) */}
        <path
          d="M427 246V287"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2.2"
          strokeDasharray="8 6"
          markerEnd="url(#dp-arrow-cyan)"
        />
        <path
          d="M427 246V287"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="3.0"
          strokeDasharray="6 6"
          strokeDashoffset={dashFlow}
          opacity={st.showDecodePulse ? 1.0 : 0.25}
        />

        {/* 3. RegFile -> ALU */}
        <path d="M528 320H560V211H592" fill="none" stroke="#315f78" strokeWidth="2.4" markerEnd="url(#dp-arrow)" />
        <path
          d="M528 320H560V211H592"
          fill="none"
          stroke="#0284c7"
          strokeWidth="3.2"
          strokeDasharray="16 18"
          strokeDashoffset={dashFlow}
          opacity={st.showAluInPulse ? 0.95 : 0.3}
        />

        {/* 4. RegFile -> Multiply / divide */}
        <path
          d="M528 339H560V328H592"
          fill="none"
          stroke="#315f78"
          strokeWidth="2.0"
          opacity="0.55"
          markerEnd="url(#dp-arrow)"
        />

        {/* 5. ALU -> Result selection */}
        <path
          d="M822 211H882"
          fill="none"
          stroke={aluIsGreen ? '#059669' : '#315f78'}
          strokeWidth="2.4"
          markerEnd={aluIsGreen ? 'url(#dp-arrow-green)' : 'url(#dp-arrow)'}
        />
        <path
          d="M822 211H882"
          fill="none"
          stroke={aluIsGreen ? '#10b981' : '#0284c7'}
          strokeWidth="3.2"
          strokeDasharray="14 14"
          strokeDashoffset={dashFlow}
          opacity={st.showAluOutPulse ? 1.0 : 0.35}
        />

        {/* 6. Multiply / divide -> Result selection */}
        <path
          d="M822 328H852V242H882"
          fill="none"
          stroke="#315f78"
          strokeWidth="2.0"
          opacity="0.55"
          markerEnd="url(#dp-arrow)"
        />

        {/* 7. Result selection -> Write back */}
        <path
          d="M1028 211H1057"
          fill="none"
          stroke={aluIsGreen ? '#059669' : '#315f78'}
          strokeWidth="2.4"
          markerEnd={aluIsGreen ? 'url(#dp-arrow-green)' : 'url(#dp-arrow)'}
        />
        <path
          d="M1028 211H1057"
          fill="none"
          stroke="#10b981"
          strokeWidth="3.2"
          strokeDasharray="12 12"
          strokeDashoffset={dashFlowWb}
          opacity={st.showWbPulse ? 1.0 : 0.35}
        />

        {/* 8. Full Register Writeback Bus (Emerald Green) */}
        <path
          d="M 1061 239 H 1042 V 392 H 427 V 375"
          fill="none"
          stroke="#059669"
          strokeWidth="2.8"
          markerEnd="url(#dp-arrow-green)"
        />
        <path
          d="M 1061 239 H 1042 V 392 H 427 V 375"
          fill="none"
          stroke="#10b981"
          strokeWidth="3.4"
          strokeDasharray="16 20"
          strokeDashoffset={dashFlowWb}
          opacity={st.showWbPulse ? 0.95 : 0.3}
        />
        <text
          x="704"
          y="378"
          textAnchor="middle"
          fontFamily={sans}
          fontSize="14.5"
          fontWeight={st.showWbPulse ? '700' : '500'}
          fill={st.showWbPulse ? '#059669' : '#475569'}
        >
          32-bit result returned to rd at the closing edge
        </text>

        {/* LOAD / STORE UNIT (with 3D bevel) */}
        <rect x="886" y="459" width="266" height="62" rx="8" fill="#cbd5e1" />
        <rect x="886" y="454" width="266" height="62" rx="8" fill="#ffffff" stroke="#315f78" strokeWidth="2" />
        <text x="1019" y="481" textAnchor="middle" fontFamily={sans} fontSize="20" fontWeight="700" fill="#0f172a">
          Load / store unit
        </text>
        <text x="1019" y="504" textAnchor="middle" fontFamily={sans} fontSize="14.5" fill="#475569">
          data memory interface
        </text>

        {/* LSU Memory Interface Wires */}
        <path d="M990 260V448" fill="none" stroke="#315f78" strokeWidth="2.2" markerEnd="url(#dp-arrow)" />
        <path
          d="M990 260V448"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2.6"
          strokeDasharray="8 12"
          strokeDashoffset={-frame * 1.8}
          opacity="0.75"
        />
        <circle cx="990" cy={260 + 188 * pLsuDown} r="3.5" fill="#0284c7" opacity="0.85" />
        <text x="1002" y="435" textAnchor="start" fontFamily={sans} fontSize="13.5" fill="#475569">
          addr / wdata
        </text>

        <path d="M930 454V266" fill="none" stroke="#315f78" strokeWidth="2.2" markerEnd="url(#dp-arrow)" />
        <path
          d="M930 454V266"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2.6"
          strokeDasharray="8 12"
          strokeDashoffset={frame * 1.8}
          opacity="0.75"
        />
        <circle cx="930" cy={454 - 188 * pLsuUp} r="3.5" fill="#0284c7" opacity="0.85" />
        <text x="918" y="435" textAnchor="end" fontFamily={sans} fontSize="13.5" fill="#475569">
          rdata
        </text>

        {/* TRAVELING PACKET PARTICLES */}
        {st.showFetchPulse && (
          <g filter="url(#packet-glow)">
            <circle cx={posFetch[0]} cy={posFetch[1]} r="7" fill="#0284c7" opacity="0.3" />
            <circle cx={posFetch[0]} cy={posFetch[1]} r="4" fill="#0284c7" />
          </g>
        )}

        {st.showDecodePulse && (
          <g filter="url(#packet-glow)">
            <circle cx={posDecode[0]} cy={posDecode[1]} r="6.5" fill="#0284c7" opacity="0.3" />
            <circle cx={posDecode[0]} cy={posDecode[1]} r="3.5" fill="#38bdf8" />
          </g>
        )}

        {st.showAluInPulse && (
          <g filter="url(#packet-glow)">
            <circle cx={posAluIn[0]} cy={posAluIn[1]} r="7" fill="#0284c7" opacity="0.35" />
            <circle cx={posAluIn[0]} cy={posAluIn[1]} r="4" fill="#0284c7" />
          </g>
        )}

        {st.showAluOutPulse && (
          <g filter="url(#packet-glow)">
            <circle cx={posAluOut[0]} cy={posAluOut[1]} r="7.5" fill={aluIsGreen ? '#059669' : '#0284c7'} opacity="0.35" />
            <circle cx={posAluOut[0]} cy={posAluOut[1]} r="4" fill={aluIsGreen ? '#10b981' : '#0284c7'} />
          </g>
        )}

        {st.showWbPulse && (
          <g filter="url(#packet-glow)">
            <circle cx={posWb[0]} cy={posWb[1]} r="9" fill="#059669" opacity="0.35" />
            <circle cx={posWb[0]} cy={posWb[1]} r="4.5" fill="#10b981" />
          </g>
        )}

        {/* LEGEND CONTAINER */}
        <rect x="24" y="534" width="1152" height="78" rx="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="145" y1="562" x2="201" y2="562" stroke="#315f78" strokeWidth="2.5" markerEnd="url(#dp-arrow)" />
        <text x="213" y="568" fontFamily={sans} fontSize="14.5" fill="#475569">
          operand / result
        </text>

        <line
          x1="466"
          y1="562"
          x2="522"
          y2="562"
          stroke="#0284c7"
          strokeWidth="2.2"
          strokeDasharray="8 6"
          markerEnd="url(#dp-arrow-cyan)"
        />
        <text x="534" y="568" fontFamily={sans} fontSize="14.5" fill="#475569">
          decode control
        </text>

        <line x1="790" y1="562" x2="846" y2="562" stroke="#059669" strokeWidth="2.8" markerEnd="url(#dp-arrow-green)" />
        <text x="858" y="568" fontFamily={sans} fontSize="14.5" fill="#059669" fontWeight="600">
          register writeback
        </text>

        <text x="600" y="596" textAnchor="middle" fontFamily={sans} fontSize="14.5" fill="#475569">
          ISQRT adds combinational ALU logic; the existing register file captures the result without a new pipeline stage.
        </text>
      </g>
    </svg>
  );
};
