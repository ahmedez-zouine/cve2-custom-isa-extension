import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, progress} from './Motion';
export const SceneTransition:React.FC<{children:React.ReactNode;duration:number}> = ({children,duration})=>{
  const f=useCurrentFrame();
  const enter=progress(f,0,18), leave=progress(f,duration-18,duration);
  return <AbsoluteFill style={{opacity:Math.min(enter,1-leave),transform:`translateY(${18*(1-ease(enter))-12*ease(leave)}px)`}}>{children}</AbsoluteFill>;
};
