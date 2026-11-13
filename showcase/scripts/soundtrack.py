"""Original deterministic ambient score. No external recordings or samples."""
from pathlib import Path
import math, wave, array
ROOT = Path(__file__).resolve().parents[1]
SR = 44100
def render(seconds, name, cues):
    out = array.array('h')
    frequencies = [65.406, 130.813, 195.998, 261.626, 293.665]
    for i in range(SR*seconds):
        t=i/SR
        fade=min(1,t/2,(seconds-t)/2)
        # Low-level C/G/D pad with slow, phase-locked amplitude motion.
        pad=sum(math.sin(2*math.pi*f*t + .12*math.sin(t*.3+j)) * (.022 if j<2 else .009) * (0.75+.25*math.sin(t*.21+j)) for j,f in enumerate(frequencies))
        pulse=0
        for cue in cues:
            d=t-cue
            if 0<=d<1.7:
                pulse+=(math.sin(2*math.pi*523.25*d)+.35*math.sin(2*math.pi*1046.5*d))*.035*math.exp(-d*4)*min(1,d/.018)
        sample=(pad+pulse)*fade
        left=int(max(-1,min(1,sample))*32767)
        right=int(max(-1,min(1,sample+.003*math.sin(2*math.pi*196.2*t)*fade))*32767)
        out.extend([left,right])
    with wave.open(str(ROOT/'public'/name),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(out.tobytes())
    print(name, seconds, 'seconds; original synthesis')
render(83,'soundtrack.wav',[1.5,9.0,24.0,42.0,56.0,71.0,80.0])
render(18,'soundtrack-short.wav',[.5,2.5,5.5,9.5,12.5,15.5])
