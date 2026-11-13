import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Header,Heading,Footnote} from '../components/Motion';
import {ISQRTVisualization} from '../components/ISQRTVisualization';
export const Execution:React.FC<{duration:number;short?:boolean}> = ({duration,short})=>{
 const f=useCurrentFrame();
 return <><Header number="03" title="Algorithm and Execution"/><Heading frame={f*(short?2:1)} title="Hardware Execution: sqrt(144) = 12" subtitle="16 restoring recurrence steps unrolled into combinational logic."/>
  <ISQRTVisualization frame={f} duration={duration}/>
  <Footnote>Mathematical execution example. In hardware, all 16 steps evaluate combinationally within the single clock cycle.</Footnote>
 </>;
};
