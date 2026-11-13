import React from 'react';
import {C, sans, mono} from '../styles/theme';

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

interface DatapathDiagramSVGProps {
  frame: number;
  duration?: number;
  style?: React.CSSProperties;
}

export const DatapathDiagramSVG: React.FC<DatapathDiagramSVGProps> = ({
  frame,
  duration = 300,
  style,
}) => {
  // Paths for signals
  const pathFetch: Point[] = [[241, 187], [322, 187]];
  const pathDecodeCtrl: Point[] = [[427, 246], [427, 287]];
  const pathRegToAlu: Point[] = [[528, 320], [560, 320], [560, 211], [592, 211]];
  const pathAluToSel: Point[] = [[822, 211], [882, 211]];
  const pathSelToWb: Point[] = [[1028, 211], [1057, 211]];
  const pathWriteback: Point[] = [[1061, 239], [1042, 239], [1042, 392], [427, 392], [427, 375]];

  // Sequential cycle timing across the scene
  // Cycle 1: Frames 20 to 140 (deliberate single-instruction execution walk)
  // Cycle 2: Continuous pipeline flow after frame 140
  const isContinuous = frame >= 140;
  const loopT = isContinuous ? ((frame - 140) % 90) / 90 : 0;

  // Pulse positions
  // Phase 1: Fetch
  const pFetch = isContinuous
    ? ((frame * 1.8) % 60) / 60
    : Math.max(0, Math.min(1, (frame - 20) / 25));
  const posFetch = getPointOnPolyline(pathFetch, pFetch);
  const showFetchPulse = isContinuous ? true : frame >= 20 && frame <= 50;

  // Phase 2: Decode Control
  const pDecode = isContinuous
    ? ((frame * 2.0 + 20) % 60) / 60
    : Math.max(0, Math.min(1, (frame - 42) / 22));
  const posDecode = getPointOnPolyline(pathDecodeCtrl, pDecode);
  const showDecodePulse = isContinuous ? true : frame >= 42 && frame <= 70;

  // Phase 3: RegFile -> ALU
  const pAluIn = isContinuous
    ? ((frame * 1.5 + 40) % 80) / 80
    : Math.max(0, Math.min(1, (frame - 65) / 35));
  const posAluIn = getPointOnPolyline(pathRegToAlu, pAluIn);
  const showAluInPulse = isContinuous ? true : frame >= 65 && frame <= 105;

  // Phase 4: ALU Computation Active
  const isAluActive = isContinuous
    ? Math.sin(frame / 6) > -0.2
    : frame >= 95 && frame <= 135;

  // Phase 5: ALU -> Result Select -> Write Back
  const pAluOut = isContinuous
    ? ((frame * 2.2 + 10) % 60) / 60
    : Math.max(0, Math.min(1, (frame - 110) / 25));
  const posAluOut = getPointOnPolyline(pathAluToSel, pAluOut);
  const showAluOutPulse = isContinuous ? true : frame >= 110 && frame <= 140;

  // Phase 6: Writeback Return
  const pWb = isContinuous
    ? ((frame * 1.6) % 100) / 100
    : Math.max(0, Math.min(1, (frame - 130) / 45));
  const posWb = getPointOnPolyline(pathWriteback, pWb);
  const showWbPulse = isContinuous ? true : frame >= 130 && frame <= 180;

  // Dashoffset for animated wire flows
  const dashFlow = -frame * 2.2;
  const dashFlowWb = -frame * 3.0;

  // Floating assembly instruction tags during hardware decode & execute
  const showDecodeTag = isContinuous ? (frame % 90 >= 10 && frame % 90 <= 50) : (frame >= 35 && frame <= 85);
  const showAluTag = isContinuous ? (frame % 90 >= 30 && frame % 90 <= 70) : (frame >= 85 && frame <= 140);

  // Smooth LSU data memory pulses
  const pLsuDown = ((frame * 1.5) % 60) / 60;
  const pLsuUp = ((frame * 1.5 + 30) % 60) / 60;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 1200 640"
      style={{display: 'block', overflow: 'visible', ...style}}
    >
      <defs>
        {/* Markers */}
        <marker id="dp-arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0 0L9 4L0 8Z" fill="#315f78" />
        </marker>
        <marker id="dp-arrow-green" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0 0L9 4L0 8Z" fill="#059669" />
        </marker>
        <marker id="dp-arrow-red" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M0 0L9 4L0 8Z" fill="#8b3447" />
        </marker>

        {/* Glow Filters */}
        <filter id="alu-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#8b3447" floodOpacity="0.45" />
        </filter>
        <filter id="wb-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#059669" floodOpacity="0.5" />
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
        y="36"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="22"
        fontWeight="700"
        fill="#1f3542"
      >
        CVE2 core datapath and ISQRT integration
      </text>
      <text
        x="600"
        y="62"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="16"
        fill="#607782"
      >
        Two-stage RV32IMC core : ISQRT uses the existing decode, ALU and writeback path
      </text>

      {/* STAGE 1: IF / FETCH */}
      <rect
        x="24"
        y="94"
        width="246"
        height="332"
        rx="12"
        fill="#f8fafc"
        stroke="#d5dfe3"
        strokeWidth="1.5"
      />
      <text
        x="147"
        y="122"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="15"
        fontWeight="700"
        letterSpacing="1.2"
        fill="#315f78"
      >
        IF / FETCH
      </text>

      {/* PC + prefetch buffer */}
      <rect
        x="53"
        y="148"
        width="188"
        height="78"
        rx="8"
        fill="#ffffff"
        stroke="#315f78"
        strokeWidth="2"
      />
      <text
        x="147"
        y="180"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="20"
        fontWeight="700"
        fill="#1f3542"
      >
        PC + prefetch
      </text>
      <text
        x="147"
        y="205"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="17"
        fill="#243c49"
      >
        buffer
      </text>

      {/* Compressed instruction decode */}
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
      <text
        x="147"
        y="311"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="20"
        fontWeight="700"
        fill="#1f3542"
      >
        Compressed
      </text>
      <text
        x="147"
        y="336"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="17"
        fill="#243c49"
      >
        instruction decode
      </text>

      {/* Internal IF wire */}
      <path d="M147 226V276" fill="none" stroke="#315f78" strokeWidth="2.4" markerEnd="url(#dp-arrow)" />
      <text
        x="147"
        y="393"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="15"
        fill="#607782"
      >
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
        stroke="#d5dfe3"
        strokeWidth="1.5"
      />
      <text
        x="735"
        y="122"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="15"
        fontWeight="700"
        letterSpacing="1.2"
        fill="#315f78"
      >
        ID / EX : DECODE, EXECUTE AND WRITEBACK
      </text>

      {/* Instruction decoder */}
      {showDecodeTag && (
        <g opacity={0.96}>
          <rect x="336" y="132" width="182" height="22" rx="11" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1" />
          <text x="427" y="147" textAnchor="middle" fontFamily={mono} fontSize="11" fontWeight="600" fill="#1d4ed8">
            isqrt x11, x10 (0x0B)
          </text>
        </g>
      )}
      <rect
        x="326"
        y="161"
        width="202"
        height="84"
        rx="8"
        fill="#ffffff"
        stroke="#315f78"
        strokeWidth="2"
      />
      <text
        x="427"
        y="194"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="20"
        fontWeight="700"
        fill="#1f3542"
      >
        Instruction decoder
      </text>
      <text
        x="427"
        y="221"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="17"
        fill="#243c49"
      >
        custom-0 + legality
      </text>

      {/* Register file */}
      <rect
        x="326"
        y="291"
        width="202"
        height="80"
        rx="8"
        fill={showWbPulse && pWb > 0.9 ? '#ecfdf5' : '#ffffff'}
        stroke={showWbPulse && pWb > 0.9 ? '#059669' : '#315f78'}
        strokeWidth="2"
        style={{transition: 'fill 0.2s, stroke 0.2s'}}
      />
      <text
        x="427"
        y="323"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="20"
        fontWeight="700"
        fill="#1f3542"
      >
        Register file
      </text>
      <text
        x="427"
        y="349"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="17"
        fill="#243c49"
      >
        read rs1 : write rd
      </text>

      {/* ALU [NEW] Box with Burgundy Accent and Glow */}
      {showAluTag && (
        <g opacity={0.96}>
          <rect x="626" y="134" width="166" height="22" rx="11" fill="#fef2f2" stroke="#ef4444" strokeWidth="1" />
          <text x="709" y="149" textAnchor="middle" fontFamily={mono} fontSize="11" fontWeight="600" fill="#b91c1c">
            ALU_ISQRT : unrolled
          </text>
        </g>
      )}
      <rect
        x="596"
        y="164"
        width="226"
        height="96"
        rx="8"
        fill={isAluActive ? '#fff5f5' : '#fbf4f5'}
        stroke="#8b3447"
        strokeWidth={isAluActive ? 3.0 : 2.4}
        filter={isAluActive ? 'url(#alu-glow)' : undefined}
      />
      {/* Pill NEW badge */}
      <rect
        x="766"
        y="174"
        width="44"
        height="24"
        rx="12"
        fill="#8b3447"
        opacity={isAluActive ? 1.0 : 0.85}
      />
      <text
        x="788"
        y="191"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="14"
        fontWeight="700"
        fill="#ffffff"
      >
        NEW
      </text>
      <text
        x="709"
        y="207"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="22"
        fontWeight="700"
        fill="#1f3542"
      >
        ALU
      </text>
      <text
        x="709"
        y="234"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="17"
        fontWeight={isAluActive ? '600' : '400'}
        fill={isAluActive ? '#8b3447' : '#243c49'}
      >
        ISQRT : 16 restoring steps
      </text>

      {/* Multiply / divide */}
      <rect
        x="596"
        y="294"
        width="226"
        height="68"
        rx="8"
        fill="#ffffff"
        stroke="#315f78"
        strokeWidth="2"
      />
      <text
        x="709"
        y="323"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="20"
        fontWeight="700"
        fill="#1f3542"
      >
        Multiply / divide
      </text>
      <text
        x="709"
        y="347"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="15"
        fill="#607782"
      >
        existing execution unit
      </text>

      {/* Result selection */}
      <rect
        x="886"
        y="164"
        width="142"
        height="96"
        rx="8"
        fill="#ffffff"
        stroke="#315f78"
        strokeWidth="2"
      />
      <text
        x="957"
        y="201"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="20"
        fontWeight="700"
        fill="#1f3542"
      >
        Result
      </text>
      <text
        x="957"
        y="229"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="17"
        fill="#243c49"
      >
        selection
      </text>

      {/* Write back */}
      <rect
        x="1061"
        y="164"
        width="91"
        height="96"
        rx="8"
        fill="#ffffff"
        stroke="#315f78"
        strokeWidth="2"
      />
      <text
        x="1106"
        y="201"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="20"
        fontWeight="700"
        fill="#1f3542"
      >
        Write
      </text>
      <text
        x="1106"
        y="229"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="17"
        fill="#243c49"
      >
        back
      </text>

      {/* WIRES & SIGNALS */}

      {/* 1. PC -> Decoder */}
      <path
        d="M241 187H322"
        fill="none"
        stroke="#315f78"
        strokeWidth="2.4"
        markerEnd="url(#dp-arrow)"
      />
      {/* Animated data flow along PC -> Decoder */}
      <path
        d="M241 187H322"
        fill="none"
        stroke="#0284c7"
        strokeWidth="3.2"
        strokeDasharray="14 16"
        strokeDashoffset={dashFlow}
        opacity={showFetchPulse ? 0.9 : 0.25}
      />

      {/* 2. Decoder -> RegFile Control (Dashed Red) */}
      <path
        d="M427 246V287"
        fill="none"
        stroke="#8b3447"
        strokeWidth="2.2"
        strokeDasharray="8 6"
        markerEnd="url(#dp-arrow-red)"
      />
      <path
        d="M427 246V287"
        fill="none"
        stroke="#e11d48"
        strokeWidth="3.0"
        strokeDasharray="6 6"
        strokeDashoffset={dashFlow}
        opacity={showDecodePulse ? 1.0 : 0.2}
      />

      {/* 3. RegFile -> ALU */}
      <path
        d="M528 320H560V211H592"
        fill="none"
        stroke="#315f78"
        strokeWidth="2.4"
        markerEnd="url(#dp-arrow)"
      />
      <path
        d="M528 320H560V211H592"
        fill="none"
        stroke="#0284c7"
        strokeWidth="3.2"
        strokeDasharray="16 18"
        strokeDashoffset={dashFlow}
        opacity={showAluInPulse ? 0.95 : 0.3}
      />

      {/* 4. RegFile -> Multiply / divide */}
      <path
        d="M528 339H560V328H592"
        fill="none"
        stroke="#315f78"
        strokeWidth="2.0"
        opacity="0.65"
        markerEnd="url(#dp-arrow)"
      />

      {/* 5. ALU -> Result selection */}
      <path
        d="M822 211H882"
        fill="none"
        stroke="#315f78"
        strokeWidth="2.4"
        markerEnd="url(#dp-arrow)"
      />
      <path
        d="M822 211H882"
        fill="none"
        stroke={isAluActive ? '#8b3447' : '#0284c7'}
        strokeWidth="3.2"
        strokeDasharray="14 14"
        strokeDashoffset={dashFlow}
        opacity={showAluOutPulse ? 1.0 : 0.3}
      />

      {/* 6. Multiply / divide -> Result selection */}
      <path
        d="M822 328H852V242H882"
        fill="none"
        stroke="#315f78"
        strokeWidth="2.0"
        opacity="0.65"
        markerEnd="url(#dp-arrow)"
      />

      {/* 7. Result selection -> Write back */}
      <path
        d="M1028 211H1057"
        fill="none"
        stroke="#315f78"
        strokeWidth="2.4"
        markerEnd="url(#dp-arrow)"
      />
      <path
        d="M1028 211H1057"
        fill="none"
        stroke="#059669"
        strokeWidth="3.2"
        strokeDasharray="12 12"
        strokeDashoffset={dashFlowWb}
        opacity={showWbPulse ? 1.0 : 0.3}
      />

      {/* 8. Full Register Writeback Bus (Green) matching reference architecture */}
      <path
        d="M 1061 239 H 1042 V 392 H 427 V 375"
        fill="none"
        stroke="#059669"
        strokeWidth="2.8"
        markerEnd="url(#dp-arrow-green)"
      />
      {/* Animated active writeback pulse flowing smoothly along bus */}
      <path
        d="M 1061 239 H 1042 V 392 H 427 V 375"
        fill="none"
        stroke="#10b981"
        strokeWidth="3.2"
        strokeDasharray="16 20"
        strokeDashoffset={dashFlowWb}
        opacity={showWbPulse ? 0.95 : 0.25}
      />
      <text
        x="704"
        y="375"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="15"
        fontWeight={showWbPulse ? '600' : '500'}
        fill={showWbPulse ? '#059669' : '#607782'}
        style={{transition: 'fill 0.2s'}}
      >
        32-bit result returned to rd at the closing edge
      </text>

      {/* LOAD / STORE UNIT (outside ID/EX stage) */}
      <rect
        x="886"
        y="454"
        width="266"
        height="62"
        rx="8"
        fill="#ffffff"
        stroke="#315f78"
        strokeWidth="2"
      />
      <text
        x="1019"
        y="481"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="20"
        fontWeight="700"
        fill="#1f3542"
      >
        Load / store unit
      </text>
      <text
        x="1019"
        y="504"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="15"
        fill="#607782"
      >
        data memory interface
      </text>

      {/* LSU Memory Interface Wires with Smooth Animated Data Flow */}
      {/* Downward addr/wdata wire */}
      <path
        d="M990 260V448"
        fill="none"
        stroke="#315f78"
        strokeWidth="2.2"
        markerEnd="url(#dp-arrow)"
      />
      <path
        d="M990 260V448"
        fill="none"
        stroke="#0284c7"
        strokeWidth="2.8"
        strokeDasharray="8 12"
        strokeDashoffset={-frame * 1.8}
        opacity="0.85"
      />
      <circle cx="990" cy={260 + 188 * pLsuDown} r="4" fill="#0284c7" opacity="0.9" />
      <text x="1002" y="435" textAnchor="start" fontFamily={sans} fontSize="14" fill="#607782">
        addr / wdata
      </text>

      {/* Upward rdata wire */}
      <path
        d="M930 454V266"
        fill="none"
        stroke="#315f78"
        strokeWidth="2.2"
        markerEnd="url(#dp-arrow)"
      />
      <path
        d="M930 454V266"
        fill="none"
        stroke="#0284c7"
        strokeWidth="2.8"
        strokeDasharray="8 12"
        strokeDashoffset={frame * 1.8}
        opacity="0.85"
      />
      <circle cx="930" cy={454 - 188 * pLsuUp} r="4" fill="#0284c7" opacity="0.9" />
      <text x="918" y="435" textAnchor="end" fontFamily={sans} fontSize="14" fill="#607782">
        rdata
      </text>

      {/* TRAVELING PACKET PARTICLES (Smooth Hardware Pulses) */}
      {showFetchPulse && (
        <g filter="url(#packet-glow)">
          <circle cx={posFetch[0]} cy={posFetch[1]} r="7" fill="#0284c7" opacity="0.3" />
          <circle cx={posFetch[0]} cy={posFetch[1]} r="4" fill="#0284c7" />
        </g>
      )}

      {showDecodePulse && (
        <g filter="url(#packet-glow)">
          <circle cx={posDecode[0]} cy={posDecode[1]} r="6" fill="#8b3447" opacity="0.3" />
          <circle cx={posDecode[0]} cy={posDecode[1]} r="3.5" fill="#e11d48" />
        </g>
      )}

      {showAluInPulse && (
        <g filter="url(#packet-glow)">
          <circle cx={posAluIn[0]} cy={posAluIn[1]} r="7" fill="#0284c7" opacity="0.35" />
          <circle cx={posAluIn[0]} cy={posAluIn[1]} r="4" fill="#0284c7" />
        </g>
      )}

      {showAluOutPulse && (
        <g filter="url(#packet-glow)">
          <circle cx={posAluOut[0]} cy={posAluOut[1]} r="7" fill="#8b3447" opacity="0.35" />
          <circle cx={posAluOut[0]} cy={posAluOut[1]} r="4" fill="#8b3447" />
        </g>
      )}

      {showWbPulse && (
        <g filter="url(#packet-glow)">
          <circle cx={posWb[0]} cy={posWb[1]} r="9" fill="#059669" opacity="0.35" />
          <circle cx={posWb[0]} cy={posWb[1]} r="4.5" fill="#10b981" />
        </g>
      )}

      {/* LEGEND CONTAINER */}
      <rect
        x="24"
        y="534"
        width="1152"
        height="78"
        rx="10"
        fill="#f8fafb"
        stroke="#d5dfe3"
        strokeWidth="1.5"
      />
      <line
        x1="145"
        y1="562"
        x2="201"
        y2="562"
        stroke="#315f78"
        strokeWidth="2.5"
        markerEnd="url(#dp-arrow)"
      />
      <text x="213" y="568" fontFamily={sans} fontSize="15" fill="#607782">
        operand / result
      </text>

      <line
        x1="466"
        y1="562"
        x2="522"
        y2="562"
        stroke="#8b3447"
        strokeWidth="2"
        strokeDasharray="8 6"
        markerEnd="url(#dp-arrow-red)"
      />
      <text x="534" y="568" fontFamily={sans} fontSize="15" fill="#607782">
        decode control
      </text>

      <line
        x1="790"
        y1="562"
        x2="846"
        y2="562"
        stroke="#059669"
        strokeWidth="2.8"
        markerEnd="url(#dp-arrow-green)"
      />
      <text x="858" y="568" fontFamily={sans} fontSize="15" fill="#607782">
        register writeback
      </text>

      <text
        x="600"
        y="596"
        textAnchor="middle"
        fontFamily={sans}
        fontSize="15"
        fill="#607782"
      >
        ISQRT adds combinational ALU logic; the existing register file captures the result without a new pipeline stage.
      </text>
    </svg>
  );
};

