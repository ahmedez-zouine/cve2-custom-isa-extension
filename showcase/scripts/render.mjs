import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill,openBrowser} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
await import('./ensure-assets.mjs');
const mode=process.argv[2]??'all';
if(!['all','frames','full','short','poster','transitions'].includes(mode))throw new Error('Use all, frames, full, short, poster or transitions');
fs.mkdirSync('out/frames',{recursive:true});
const systemChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executable=process.env.CHROME_PATH||(fs.existsSync(systemChrome)?systemChrome:undefined);
console.log('Bundling project…');
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),onProgress:p=>{if(p===100)console.log('Bundle ready.');}});
const browser=await openBrowser('chrome',{browserExecutable:executable});
const options={serveUrl,puppeteerInstance:browser};
try {
 const full=await selectComposition({...options,id:'CVE2-ISQRT'});
 if(mode==='frames'||mode==='all'||mode==='transitions'){
  const frames=mode==='transitions'?[195,209,210,225,495,509,510,525,885,899,900,915,1185,1199,1200,1215,1545,1559,1560,1575,1780,1799]:[120,360,660,835,1050,1390,1680];
  for(const frame of frames){
   await renderStill({...options,composition:full,frame,output:`out/frames/frame-${String(frame).padStart(4,'0')}.png`,imageFormat:'png'});
   console.log(`Reviewed-frame candidate: ${frame}`);
  }
 }
 if(mode==='poster'||mode==='all'){
  const composition=await selectComposition({...options,id:'CVE2-ISQRT-Poster'});
  await renderStill({...options,composition,output:'out/CVE2-ISQRT-poster.png',imageFormat:'png'});
  console.log('Poster rendered.');
 }
 for(const [kind,id,out] of [['full','CVE2-ISQRT','CVE2-ISQRT-60s.mp4'],['short','CVE2-ISQRT-Short','CVE2-ISQRT-15s.mp4']]){
  if(mode!==kind&&mode!=='all')continue;
  const composition=await selectComposition({...options,id});
  let last=-1;
  await renderMedia({...options,composition,codec:'h264',audioCodec:'aac',crf:17,pixelFormat:'yuv420p',imageFormat:'png',colorSpace:'bt709',
   outputLocation:path.join(root,'out',out),concurrency:Number(process.env.RENDER_CONCURRENCY||4),
   onProgress:({progress})=>{const p=Math.floor(progress*100/5)*5;if(p>last){console.log(`${kind}: ${p}%`);last=p;}}
  });
  console.log(`Rendered ${out}`);
 }
}finally{await browser.close({silent:true});}
