import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Header, Footnote, Panel, reveal, ease, progress} from '../components/Motion';
import {DatapathDiagramSVG, getDatapathState} from '../components/DatapathDiagramSVG';
import {C, mono} from '../styles/theme';

export const Architecture: React.FC<{duration: number; short?: boolean}> = ({duration, short}) => {
  const f = useCurrentFrame();
  const t = f * (short ? 2 : 1);
  const a = ease(progress(t, 4, 24));
  const st = getDatapathState(t);

  const encodingFields = [
    {bits: '31:25', name: 'funct7', val: '0000000', tone: 'neutral' as const},
    {bits: '24:20', name: 'rs2', val: '00000', tone: 'neutral' as const},
    {bits: '19:15', name: 'rs1', val: 'x10 (01010)', tone: 'cyan' as const},
    {bits: '14:12', name: 'funct3', val: '000', tone: 'neutral' as const},
    {bits: '11:7', name: 'rd', val: 'x11 (01011)', tone: 'green' as const},
    {bits: '6:0', name: 'opcode', val: '0001011', tone: 'cyan' as const},
  ];

  const integrationTiles = [
    {label: 'Pipeline Depth', value: '2 Stages', sub: 'IF, ID / EX', green: false},
    {label: 'Latency Penalty', value: '0 Stall Cycles', sub: 'Single-cycle EX', green: true},
    {label: 'Execution Path', value: 'Unrolled Cone', sub: '16 stages in cve2_alu', green: false},
    {label: 'Result Capture', value: 'rf_we_wb', sub: 'Shared rd writeback', green: true},
  ];

  const activeStageLabels: Record<number, string> = {
    1: 'Stage 1/5 : IF Fetch',
    2: 'Stage 2/5 : Decode 0x0B',
    3: 'Stage 3/5 : Read rs1',
    4: 'Stage 4/5 : ALU ISQRT',
    5: 'Stage 5/5 : Writeback rd',
  };

  const resultReady = st.aluDone || st.showWbPulse;

  return (
    <>
      <Header number="02" title="Architecture and Datapath" />

      {/* Title */}
      <div style={{position: 'absolute', left: 110, top: 120, ...reveal(t, 4)}}>
        <h1 style={{fontSize: 50, letterSpacing: -1, fontWeight: 600, margin: 0, lineHeight: 1.1, color: C.white}}>
          Two-Stage Pipeline and ISQRT Integration
        </h1>
        <p style={{fontSize: 22, color: C.muted, margin: '10px 0 0'}}>
          Two-stage RV32IMC core. The ISQRT unit uses the existing ALU and register writeback path.
        </p>
      </div>

      {/* Main 1700px Two-Column Grid */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 232,
          width: 1700,
          height: 706,
          display: 'flex',
          gap: 24,
        }}
      >
        {/* Left Card: Interactive Animated Vector SVG Datapath Diagram */}
        <div
          style={{
            width: 1196,
            height: 706,
            background: '#ffffff',
            borderRadius: 14,
            border: `1px solid ${C.line}`,
            boxShadow: '0 6px 24px rgba(15, 23, 42, 0.05)',
            padding: 12,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: a,
            transform: `translateY(${16 * (1 - a)}px)`,
            overflow: 'hidden',
          }}
        >
          <DatapathDiagramSVG frame={t} duration={duration} />
        </div>

        {/* Right Column: Three Clean White Technical Cards */}
        <div
          style={{
            width: 480,
            height: 706,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Card 1: R-Type Instruction Encoding (custom-0) */}
          <Panel
            style={{
              padding: '18px 20px',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              ...reveal(t, 12),
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: 17, fontWeight: 700, color: C.white}}>
                R-Type Encoding
              </span>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.cyan,
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  padding: '3px 10px',
                  borderRadius: 6,
                }}
              >
                custom-0 (0x0B)
              </span>
            </div>

            {/* 32-bit Field Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.15fr 0.85fr 1.15fr 0.72fr 1.15fr 1.25fr',
                gap: 5,
              }}
            >
              {encodingFields.map((fld) => {
                const isCyan = fld.tone === 'cyan';
                const isGreen = fld.tone === 'green';
                return (
                  <div
                    key={fld.name}
                    style={{
                      background: isGreen ? '#ecfdf5' : isCyan ? '#f0f9ff' : '#f8fafc',
                      border: `1px solid ${isGreen ? '#a7f3d0' : isCyan ? '#bae6fd' : C.borderSubtle}`,
                      borderRadius: 7,
                      padding: '7px 5px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{fontFamily: mono, fontSize: 9.5, color: C.muted}}>
                      [{fld.bits}]
                    </div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isGreen ? C.green : isCyan ? '#0369a1' : C.white,
                        marginTop: 2,
                      }}
                    >
                      {fld.name}
                    </div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 9.5,
                        color: isGreen ? '#047857' : isCyan ? C.cyan : C.muted,
                        marginTop: 3,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fld.val}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                border: `1px solid ${C.borderSubtle}`,
                borderRadius: 8,
                padding: '9px 12px',
                fontFamily: mono,
                fontSize: 13.5,
              }}
            >
              <span style={{color: C.white, fontWeight: 700}}>isqrt x11, x10</span>
              <span style={{color: C.cyan, fontWeight: 600}}>Word: 0x0005058B</span>
            </div>
          </Panel>

          {/* Card 2: Single-Cycle Pipeline Integration */}
          <Panel
            style={{
              padding: '18px 20px',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              ...reveal(t, 20),
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: 17, fontWeight: 700, color: C.white}}>
                Single-Cycle Integration
              </span>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.green,
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '3px 10px',
                  borderRadius: 6,
                }}
              >
                0 Stalls
              </span>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
              {integrationTiles.map((tile) => (
                <div
                  key={tile.label}
                  style={{
                    background: tile.green ? '#ecfdf5' : '#f8fafc',
                    border: `1px solid ${tile.green ? '#a7f3d0' : C.borderSubtle}`,
                    borderRadius: 9,
                    padding: '10px 12px',
                  }}
                >
                  <div style={{fontSize: 12, fontWeight: 600, color: tile.green ? '#047857' : C.muted}}>
                    {tile.label}
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 16.5,
                      fontWeight: 700,
                      color: tile.green ? C.green : C.white,
                      marginTop: 4,
                    }}
                  >
                    {tile.value}
                  </div>
                  <div style={{fontSize: 12, color: tile.green ? '#059669' : C.muted, marginTop: 2}}>
                    {tile.sub}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Card 3: Live Datapath Signal Trace */}
          <Panel
            style={{
              flex: 1,
              padding: '18px 20px',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              ...reveal(t, 28),
            }}
          >
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: 17, fontWeight: 700, color: C.white}}>
                Live Datapath Signal Trace
              </span>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: resultReady ? C.green : C.cyan,
                  background: resultReady ? '#ecfdf5' : '#f0f9ff',
                  border: `1px solid ${resultReady ? '#a7f3d0' : '#bae6fd'}`,
                  padding: '3px 9px',
                  borderRadius: 6,
                }}
              >
                {activeStageLabels[st.activeStage]}
              </span>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: 9, marginTop: 8}}>
              {/* Row 1: Instruction */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: st.activeStage <= 2 ? '#f0f9ff' : '#f8fafc',
                  border: `1px solid ${st.activeStage <= 2 ? '#7dd3fc' : C.borderSubtle}`,
                }}
              >
                <div>
                  <div style={{fontSize: 12, fontWeight: 600, color: C.muted}}>Instruction</div>
                  <div style={{fontFamily: mono, fontSize: 12.5, color: C.textSecondary}}>isqrt x11, x10</div>
                </div>
                <span style={{fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.white}}>
                  0x0005058B
                </span>
              </div>

              {/* Row 2: Operand rs1 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: st.activeStage === 3 || st.activeStage === 4 ? '#f0f9ff' : '#f8fafc',
                  border: `1px solid ${st.activeStage === 3 || st.activeStage === 4 ? '#7dd3fc' : C.borderSubtle}`,
                }}
              >
                <div>
                  <div style={{fontSize: 12, fontWeight: 600, color: C.muted}}>Operand rs1 (x10)</div>
                  <div style={{fontFamily: mono, fontSize: 12.5, color: C.textSecondary}}>32-bit unsigned</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.cyan}}>
                    2,086,479,684
                  </div>
                  <div style={{fontFamily: mono, fontSize: 11.5, color: C.muted}}>0x7C5D2F44</div>
                </div>
              </div>

              {/* Row 3: Result rd (Emerald Green highlight on completion) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: resultReady ? '#ecfdf5' : '#f8fafc',
                  border: `1.5px solid ${resultReady ? '#059669' : C.borderSubtle}`,
                }}
              >
                <div>
                  <div style={{fontSize: 12, fontWeight: 700, color: resultReady ? '#047857' : C.muted}}>
                    Result rd (x11)
                  </div>
                  <div style={{fontFamily: mono, fontSize: 12, color: resultReady ? '#059669' : C.muted}}>
                    {resultReady ? 'rf_we_wb committed' : 'awaiting writeback'}
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 16.5,
                      fontWeight: 700,
                      color: resultReady ? C.green : C.white,
                    }}
                  >
                    45,678
                  </div>
                  <div style={{fontFamily: mono, fontSize: 11.5, color: resultReady ? '#047857' : C.muted}}>
                    0x0000B26E
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Footnote>
        The ISQRT operation integrates into cve2_alu. It adds combinational logic without adding pipeline stages or stall cycles.
      </Footnote>
    </>
  );
};
