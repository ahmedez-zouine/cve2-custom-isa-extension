import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import {C, sans, mono} from '../styles/theme';

export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => Easing.bezier(0.22, 1, 0.36, 1)(clamp(n));
export const progress = (f: number, start: number, end: number) => clamp((f-start)/(end-start));
export const mix = (a: number, b: number, p: number) => a + (b-a)*p;
export const reveal = (f: number, start = 0, duration = 24): React.CSSProperties => ({
  opacity: progress(f, start, start+duration), transform: `translateY(${24*(1-ease(progress(f,start,start+duration)))}px)`,
});
export const Background: React.FC<{frame: number}> = ({frame}) => <AbsoluteFill
  style={{
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    fontFamily: sans,
    color: C.white
  }}
>
  <AbsoluteFill style={{background: `radial-gradient(ellipse at ${65+Math.sin(frame/400)*5}% 40%, rgba(2,132,199,0.04) 0%, transparent 65%)`}}/>
  <svg width="1920" height="1080" style={{position:'absolute',opacity:.8}}>
    <defs><pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M 80 0 L 0 0 0 80" fill="none" stroke="#e2e8f0" strokeWidth="1"/></pattern></defs>
    <rect width="1920" height="1080" fill="url(#grid)"/>
    {[0,1,2,3].map(i=><path key={i} d={`M ${900+i*150} 0 V ${150+i*50} L ${1350+i*100} ${600+i*70} V 1080`} stroke={C.cyan} opacity=".12" strokeWidth="1.5" fill="none"/>)}
  </svg>
</AbsoluteFill>;
export const Header: React.FC<{number: string; title: string}> = ({number,title}) => <div style={{position:'absolute',left:100,right:100,top:50,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:21,color:C.muted}}>
  <div style={{display:'flex',gap:16,alignItems:'center'}}><span style={{width:10,height:10,background:C.cyan,borderRadius:2,display:'inline-block'}}/><span style={{fontWeight:600,color:C.white}}>CVE2</span><span style={{color:C.dim}}>/</span><span style={{color:C.cyan,fontWeight:600}}>ISQRT</span></div>
  <div style={{fontFamily:mono,fontSize:18,color:C.muted}}>{number} <span style={{color:C.dim,margin:'0 14px'}}>/</span> {title}</div>
</div>;
export const Heading: React.FC<{title:string; subtitle:string; frame:number}> = ({title,subtitle,frame}) => <div style={{position:'absolute',left:110,top:134,...reveal(frame,6,24)}}>
  <h1 style={{fontSize:58,letterSpacing:-1.5,fontWeight:600,margin:0,lineHeight:1.12,color:C.white}}>{title}</h1>
  <p style={{fontSize:27,color:C.muted,margin:'20px 0 0'}}>{subtitle}</p>
</div>;
export const Footnote:React.FC<{children:React.ReactNode}> = ({children})=><div style={{position:'absolute',bottom:65,left:110,right:110,fontSize:21,lineHeight:1.5,color:C.muted}}>{children}</div>;
export const Panel:React.FC<{children:React.ReactNode;style?:React.CSSProperties}> = ({children,style})=><div style={{background:'#ffffff',border:`1px solid ${C.line}`,borderRadius:16,boxShadow:'0 4px 20px rgba(0,0,0,0.06)',...style}}>{children}</div>;
export const Rule:React.FC<{y:number}> = ({y})=><div style={{position:'absolute',left:110,right:110,top:y,height:1,background:C.line}}/>;
