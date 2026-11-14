import React from 'react';
import {C, mono} from '../styles/theme';
import {reveal} from './Motion';

export const CinematicTitle: React.FC<{frame: number; final?: boolean}> = ({
  frame,
  final = false,
}) => {
  const specs = [
    {
      label: 'ISA Extension',
      value: '0x0B (custom-0)',
      sub: 'isqrt rd, rs1',
      highlight: false,
    },
    {
      label: 'ALU Architecture',
      value: '16 Unrolled Stages',
      sub: '1-Cycle Combinational',
      highlight: false,
    },
    {
      label: 'Benchmark Gain',
      value: '10.7x Faster',
      sub: '23 vs 247 Cycles',
      highlight: true,
    },
  ];

  return (
    <div style={{position: 'absolute', left: 110, top: final ? 300 : 210, width: 880}}>
      <div
        style={{
          fontFamily: mono,
          fontSize: 17,
          display: 'inline-block',
          padding: '6px 14px',
          borderRadius: 6,
          background: C.cyanLight,
          color: C.cyan,
          fontWeight: 600,
          marginBottom: 24,
          ...reveal(frame, 10, 28),
        }}
      >
        {final ? 'RISC-V ISA Extension' : 'RV32IMC Core'}
      </div>

      <h1
        style={{
          fontSize: 100,
          fontWeight: 600,
          letterSpacing: -3,
          lineHeight: 1.04,
          margin: 0,
          color: C.white,
          ...reveal(frame, 20, 34),
        }}
      >
        CVE2<span style={{color: C.cyan}}>-</span>ISQRT
      </h1>

      <div
        style={{
          height: 4,
          width: 92,
          background: C.cyan,
          borderRadius: 2,
          margin: '28px 0',
          ...reveal(frame, 36, 28),
        }}
      />

      <p
        style={{
          fontSize: 34,
          lineHeight: 1.32,
          fontWeight: 600,
          margin: 0,
          color: C.white,
          ...reveal(frame, 42, 32),
        }}
      >
        {final ? 'Custom Integer Square Root Extension' : 'Extending RISC-V with Integer Square Root'}
      </p>

      <p
        style={{
          fontSize: 22,
          lineHeight: 1.55,
          color: C.muted,
          marginTop: 18,
          marginBottom: 0,
          ...reveal(frame, 52, 32),
        }}
      >
        {final
          ? 'SystemVerilog RTL, Verilator simulation, and Artix-7 FPGA'
          : '32-bit processor with a dedicated single-cycle arithmetic unit.'}
      </p>

      {!final && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 18,
            marginTop: 38,
          }}
        >
          {specs.map((spec, idx) => (
            <div
              key={spec.label}
              style={{
                background: spec.highlight ? '#ecfdf5' : '#ffffff',
                border: `1.5px solid ${spec.highlight ? '#a7f3d0' : C.line}`,
                borderRadius: 12,
                padding: '18px 20px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                ...reveal(frame, 62 + idx * 10, 26),
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: spec.highlight ? C.green : C.muted,
                  marginBottom: 8,
                }}
              >
                {spec.label}
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 21,
                  fontWeight: 700,
                  color: spec.highlight ? C.green : C.white,
                  lineHeight: 1.2,
                }}
              >
                {spec.value}
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 13.5,
                  color: spec.highlight ? '#047857' : C.muted,
                  marginTop: 6,
                }}
              >
                {spec.sub}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
