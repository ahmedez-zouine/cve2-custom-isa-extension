import React from 'react';
import {C,mono,sans} from '../styles/theme';
import {AnimatedDataPath} from './AnimatedDataPath';
import {progress} from './Motion';
const Block:React.FC<{x:number;y:number;w:number;h:number;title:string;sub:string;accent?:boolean;small?:boolean}> = ({x,y,w,h,title,sub,accent=false,small=false})=><g>
 <rect x={x} y={y} width={w} height={h} rx="10" fill={accent?'#f0f9ff':'#ffffff'} stroke={accent?C.cyan:C.line} strokeWidth={accent?2:1.2}/>
 <rect x={x+1} y={y+16} width="3" height={h-32} fill={accent?C.cyan:C.blue} opacity={accent?1:.7}/>
 <text x={x+20} y={y+(small?35:43)} fontSize={small?24:29} fontFamily={sans} fill={accent?'#0369a1':C.white} fontWeight="600">{title}</text>
 <text x={x+20} y={y+(small?65:77)} fontSize={small?18:20} fontFamily={mono} fill={C.muted}>{sub}</text>
</g>;
export const ArchitectureDiagram:React.FC<{frame:number;compact?:boolean}> = ({frame,compact=false})=><svg width="1700" height="620" viewBox="0 0 1700 620" style={{overflow:'visible'}}>
 <rect x="0" y="55" width="430" height="465" rx="16" fill="#f8fafc" stroke={C.line}/>
 <rect x="465" y="55" width="1230" height="465" rx="16" fill="#f8fafc" stroke={C.line}/>
 <text x="24" y="33" fill={C.muted} fontSize="24" fontFamily={sans} fontWeight="500">01 / Instruction fetch</text>
 <text x="490" y="33" fill={C.muted} fontSize="24" fontFamily={sans} fontWeight="500">02 / Instruction decode &amp; execute</text>
 <AnimatedDataPath points={[[40,245],[75,245]]} frame={frame}/>
 <Block x={70} y={185} w={290} h={115} title="Fetch & prefetch" sub="cve2_if_stage"/>
 <Block x={70} y={345} w={290} h={96} title="Instruction FIFO" sub="cve2_fetch_fifo" small/>
 <AnimatedDataPath points={[[215,300],[215,345]]} frame={frame} delay={12}/>
 <AnimatedDataPath points={[[360,393],[400,393],[400,245],[510,245]]} frame={frame} delay={24}/>
 <Block x={510} y={185} w={280} h={115} title="Decode & control" sub="cve2_decoder"/>
 <Block x={510} y={355} w={280} h={110} title="Register file" sub="cve2_register_file_ff"/>
 <rect x="880" y="116" width="800" height="350" rx="12" fill="#f1f5f9" stroke="#94a3b8" strokeDasharray="6 6"/>
 <text x="905" y="152" fill={C.muted} fontFamily={mono} fontSize="20">cve2_ex_block / alu_i</text>
 <Block x={920} y={185} w={380} h={105} title="ALU operations" sub="cve2_alu"/>
 <Block x={920} y={335} w={380} h={105} title="ISQRT" sub="isqrt_comb · 16 steps" accent/>
 <AnimatedDataPath points={[[790,245],[920,245]]} frame={frame} delay={36} color={C.blue}/>
 <AnimatedDataPath points={[[650,300],[650,355]]} frame={frame} delay={30} color={C.blue}/>
 <AnimatedDataPath points={[[790,410],[855,410],[855,387],[920,387]]} frame={frame} delay={40}/>
 <text x="805" y="452" fill={C.muted} fontFamily={mono} fontSize="17">operand_a_i</text>
 <Block x={1410} y={335} w={250} h={105} title="Result select" sub="ALU_ISQRT" accent/>
 <AnimatedDataPath points={[[1300,387],[1410,387]]} frame={frame} delay={55}/>
 <AnimatedDataPath points={[[1300,235],[1535,235],[1535,335]]} frame={frame} delay={55} color={C.blue}/>
 <AnimatedDataPath points={[[1535,440],[1535,550],[650,550],[650,465]]} frame={frame} delay={65}/>
 <text x="1030" y="585" fill={C.cyan} fontFamily={mono} fontSize="23" fontWeight="600">writeback → rd</text>
 {!compact&&<g opacity={progress(frame,70,100)}><text x="28" y="594" fill={C.muted} fontSize="21" fontFamily={sans}>Focused datapath; memory, branch and multiply/divide paths omitted.</text></g>}
</svg>;
