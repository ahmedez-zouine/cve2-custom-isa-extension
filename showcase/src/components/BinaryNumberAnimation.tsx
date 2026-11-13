import React from 'react';
import {C,mono} from '../styles/theme';
import {progress} from './Motion';
export const BinaryNumberAnimation:React.FC<{value:number;frame:number;activePair:number}> = ({value,frame,activePair})=>{
 const pairs=value.toString(2).padStart(32,'0').match(/.{2}/g)!;
 return <div style={{display:'flex',gap:10,fontFamily:mono}}>{pairs.map((p,i)=><div key={i} style={{width:75,height:64,display:'flex',alignItems:'center',justifyContent:'center',fontSize:27,fontWeight:i===activePair?600:400,borderRadius:6,border:`1px solid ${i===activePair?C.cyan:C.line}`,background:i===activePair?'#e0f2fe':'#ffffff',color:i===activePair?'#0369a1':(i<activePair?C.white:C.muted),boxShadow:i===activePair?'0 2px 8px rgba(2,132,199,0.15)':'none',opacity:progress(frame,i*1.2,18+i*1.2)}}>{p}</div>)}</div>;
};
