import React from 'react';
import {C} from '../styles/theme';
export type Point = [number,number];
export const AnimatedDataPath:React.FC<{points:Point[];frame:number;delay?:number;color?:string;speed?:number;active?:boolean}> = ({points,frame,delay=0,color=C.cyan,speed=90,active=true})=>{
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 const total=lengths.reduce((a,b)=>a+b,0);
 const phase=((Math.max(0,frame-delay)%speed)/speed);
 let distance=phase*total, index=0;
 while(index<lengths.length-1 && distance>lengths[index]){distance-=lengths[index]; index++;}
 const p=points[index],q=points[index+1],t=distance/lengths[index];
 const x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;
 const last=points[points.length-1],before=points[points.length-2];
 const angle=Math.atan2(last[1]-before[1],last[0]-before[0])*180/Math.PI;
 return <g>
  <polyline points={points.map(p=>p.join(',')).join(' ')} fill="none" stroke={active?color:C.line} strokeWidth="2.5" opacity={active?.58:1} strokeLinejoin="round"/>
  <path d="M -10 -5 L 0 0 L -10 5" fill="none" stroke={active?color:C.line} strokeWidth="2" transform={`translate(${last.join(' ')}) rotate(${angle})`}/>
  {active&&frame>=delay&&<g><circle cx={x} cy={y} r="11" fill={color} opacity=".1"/><circle cx={x} cy={y} r="4" fill={color}/></g>}
 </g>;
};
