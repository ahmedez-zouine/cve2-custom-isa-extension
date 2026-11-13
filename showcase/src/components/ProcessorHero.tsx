import React from 'react';
import {C,mono} from '../styles/theme';
import {ease,progress} from './Motion';
export const ProcessorHero:React.FC<{frame:number;size?:number;id?:string}> = ({frame,size=800,id='hero'})=>{
 const a=ease(progress(frame,0,60));
 return <svg width={size} height={size} viewBox="0 0 800 800" style={{overflow:'visible'}}>
  <defs>
   <linearGradient id={`${id}substrate`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f8fafc"/><stop offset=".5" stopColor="#e2e8f0"/><stop offset="1" stopColor="#cbd5e1"/></linearGradient>
   <linearGradient id={`${id}die`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#334155"/><stop offset="1" stopColor="#1e293b"/></linearGradient>
   <radialGradient id={`${id}light`}><stop stopColor={C.cyan} stopOpacity=".08"/><stop offset="1" stopColor={C.cyan} stopOpacity="0"/></radialGradient>
   <filter id={`${id}shadow`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="20" floodOpacity=".12"/></filter>
  </defs>
  <circle cx="400" cy="400" r="380" fill={`url(#${id}light)`}/>
  {Array.from({length:12},(_,i)=>{const p=185+i*39;return <g key={i} fill="none" stroke={i%3===0?C.cyan:C.dim} strokeWidth={i%3===0?1.5:1} opacity={a*(i%3===0?.6:.3)}>
   <path d={`M ${p} 165 V ${110-i%3*16} L ${p-45} ${70-i%3*16} V 0`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-a}/>
   <path d={`M ${p} 635 V ${690+i%3*16} L ${p+45} ${730+i%3*16} V 800`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-a}/>
   <path d={`M 165 ${p} H ${110-i%3*16} L ${70-i%3*16} ${p+35} H 0`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-a}/>
   <path d={`M 635 ${p} H ${690+i%3*16} L ${730+i%3*16} ${p-35} H 800`} pathLength="1" strokeDasharray="1" strokeDashoffset={1-a}/>
  </g>})}
  <g filter={`url(#${id}shadow)`} opacity={a}>
   <rect x="159" y="176" width="482" height="482" rx="20" fill="#cbd5e1"/>
   {Array.from({length:16},(_,i)=>[<rect key={`t${i}`} x={190+i*26} y="146" width="12" height="39" rx="2" fill="#d97706"/>,<rect key={`b${i}`} x={190+i*26} y="615" width="12" height="39" rx="2" fill="#d97706"/>,<rect key={`l${i}`} y={190+i*26} x="146" height="12" width="39" rx="2" fill="#d97706"/>,<rect key={`r${i}`} y={190+i*26} x="615" height="12" width="39" rx="2" fill="#d97706"/>])}
   <rect x="170" y="170" width="460" height="460" rx="16" fill={`url(#${id}substrate)`} stroke="#94a3b8" strokeWidth="1.5"/>
   <rect x="193" y="193" width="414" height="414" rx="8" fill="#f1f5f9" stroke="#cbd5e1"/>
   <rect x="224" y="228" width="352" height="338" rx="4" fill={`url(#${id}die)`} stroke="#475569"/>
   {Array.from({length:6},(_,row)=>Array.from({length:10},(_,col)=><rect key={`${row}${col}`} x={239+col*31} y={244+row*22} width="25" height="15" fill={(row+col)%3===0?'#475569':'#334155'} stroke="#64748b" strokeWidth=".5"/>))}
   <rect x="239" y="389" width="122" height="157" fill="#334155" stroke="#475569"/>
   {Array.from({length:12},(_,i)=><line key={i} x1="250" x2="350" y1={402+i*11} y2={402+i*11} stroke="#475569"/>)}
   <rect x="375" y="389" width="185" height="87" fill="#334155" stroke="#475569"/>
   <text x="467" y="440" textAnchor="middle" fill="#f8fafc" fontSize="24" fontFamily={mono} fontWeight="600">CVE2</text>
   <rect x="375" y="488" width="185" height="58" fill="#0369a1" stroke={C.cyan} strokeWidth="2" rx="4"/>
   <text x="468" y="525" textAnchor="middle" fill="#ffffff" fontSize="23" fontFamily={mono} fontWeight="600">ISQRT</text>
   <circle cx="198" cy="598" r="5" fill="#d97706"/>
   <path d="M 205 210 H 590" stroke="#cbd5e1" opacity=".6"/>
  </g>
  <rect x="375" y="488" width="185" height="58" rx="4" fill={C.cyan} opacity={.04+.06*(1+Math.sin(frame/15))}/>
 </svg>;
};
