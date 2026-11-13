import React from 'react';
import {AbsoluteFill,Composition,Still} from 'remotion';
import {Video} from './Video';
import {Background} from './components/Motion';
import {Finale} from './scenes/Finale';
import {C,sans} from './styles/theme';

const Poster:React.FC=()=><AbsoluteFill style={{background:C.bg,fontFamily:sans,color:C.white}}><Background frame={1680}/><Finale duration={240} stillFrame={120}/></AbsoluteFill>;

export const RemotionRoot:React.FC=()=> <>
 <Composition id="CVE2-ISQRT" component={Video} durationInFrames={2490} fps={30} width={1920} height={1080}/>
 <Composition id="CVE2-ISQRT-Short" component={Video} defaultProps={{short:true}} durationInFrames={540} fps={30} width={1920} height={1080}/>
 <Still id="CVE2-ISQRT-Poster" component={Poster} width={1920} height={1080}/>
</>;
