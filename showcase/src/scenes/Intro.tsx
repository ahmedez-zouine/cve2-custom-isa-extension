import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CinematicTitle} from '../components/CinematicTitle';
import {ProcessorHero} from '../components/ProcessorHero';
import {Header,Footnote,ease,progress} from '../components/Motion';
export const Intro:React.FC<{duration:number;short?:boolean}> = ({duration,short})=>{
 const frame=useCurrentFrame(), t=frame*(short?2:1);
 return <><Header number="01" title="Processor Architecture"/>
  <div style={{position:'absolute',left:1110,top:140,transform:`perspective(1600px) rotateY(-16deg) rotateX(9deg) scale(${.86+.1*ease(progress(frame,0,duration))})`}}><ProcessorHero frame={t} size={760}/></div>
  <CinematicTitle frame={t+(short?35:0)}/>
  <Footnote>Ahmed Ez-Zouine (Mohammed V University in Rabat) - CVE2 custom ISA extension</Footnote>
 </>;
};
