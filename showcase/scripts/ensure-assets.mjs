import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
if(!fs.existsSync('public/soundtrack.wav')||!fs.existsSync('public/soundtrack-short.wav')){
  execFileSync('python3',['scripts/soundtrack.py'],{stdio:'inherit'});
}
