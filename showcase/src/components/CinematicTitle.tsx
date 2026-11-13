import React from 'react';
import {C,mono} from '../styles/theme';
import {reveal} from './Motion';
export const CinematicTitle:React.FC<{frame:number;final?:boolean}> = ({frame,final=false})=><div style={{position:'absolute',left:110,top:final?340:355,width:1050}}>
  <div style={{fontFamily:mono,fontSize:18,display:'inline-block',padding:'6px 14px',borderRadius:6,background:C.cyanLight,color:C.cyan,fontWeight:600,marginBottom:28,...reveal(frame,12,30)}}>{final?'RISC-V ISA Extension':'RV32IMC Core'}</div>
  <h1 style={{fontSize:104,fontWeight:600,letterSpacing:-3,lineHeight:1.05,margin:0,color:C.white,...reveal(frame,24,38)}}>CVE2<span style={{color:C.cyan}}>-</span>ISQRT</h1>
  <div style={{height:3,width:90,background:C.cyan,borderRadius:2,margin:'32px 0',...reveal(frame,40,30)}}/>
  <p style={{fontSize:34,lineHeight:1.35,fontWeight:500,margin:0,color:C.white,...reveal(frame,45,35)}}>{final?'Custom Integer Square Root Extension':'Extending RISC-V with Integer Square Root'}</p>
  <p style={{fontSize:23,lineHeight:1.6,color:C.muted,marginTop:24,...reveal(frame,58,35)}}>{final?'SystemVerilog RTL, Verilator simulation, and Artix-7 FPGA':'32-bit processor with a dedicated single-cycle arithmetic unit.'}</p>
</div>;
