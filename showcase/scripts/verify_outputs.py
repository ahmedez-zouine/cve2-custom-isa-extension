"""Check encoded deliverables and create contact sheets from the MP4 frames."""
from pathlib import Path
import subprocess, json, hashlib, platform, os, struct, zlib, math, array
ROOT=Path(__file__).resolve().parents[1]
arch='arm64' if platform.machine() in ('arm64','aarch64') else 'x64'
osname={'Darwin':'darwin','Linux':'linux','Windows':'win32'}[platform.system()]
binary=ROOT/'node_modules'/'@remotion'/f'compositor-{osname}-{arch}'
ffprobe=binary/'ffprobe'
ffmpeg=ROOT/'node_modules'/'ffmpeg-static'/('ffmpeg.exe' if osname=='win32' else 'ffmpeg')
# Remotion's macOS binaries resolve their adjacent dynamic libraries at runtime.
if platform.system()=='Darwin':
    os.environ['DYLD_LIBRARY_PATH']=str(binary)
out=ROOT/'out'
(out/'review').mkdir(exist_ok=True)

def contact_sheet(video, samples, width, height, cols, name):
    """Use decoded RGB frames; no optional FFmpeg select/tile filters required."""
    rows=math.ceil(len(samples)/cols)
    canvas=bytearray(width*cols*height*rows*3)
    stride=width*cols*3
    for index,n in enumerate(samples):
        rgb=subprocess.check_output([str(ffmpeg),'-v','error','-ss',f'{n/30:.8f}','-i',str(video),'-frames:v','1','-vf',f'scale={width}:{height}','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
        assert len(rgb)==width*height*3
        x,y=(index%cols)*width,(index//cols)*height
        for r in range(height):
            start=(y+r)*stride+x*3
            canvas[start:start+width*3]=rgb[r*width*3:(r+1)*width*3]
    def chunk(kind,data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    scanlines=b''.join(b'\x00'+canvas[r*stride:(r+1)*stride] for r in range(height*rows))
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width*cols,height*rows,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(scanlines))+chunk(b'IEND',b'')
    (out/'review'/name).write_bytes(png)

results=[]
for suffix,seconds,frames in [('60s',60,1800),('15s',15,450)]:
    path=out/f'CVE2-ISQRT-{suffix}.mp4'
    info=json.loads(subprocess.check_output([str(ffprobe),'-v','error','-count_frames','-show_streams','-show_format','-of','json',str(path)]))
    video=next(s for s in info['streams'] if s['codec_type']=='video')
    audio=next(s for s in info['streams'] if s['codec_type']=='audio')
    assert (video['width'],video['height'])==(1920,1080)
    assert video['r_frame_rate']=='30/1'
    assert int(video['nb_read_frames'])==frames
    assert abs(float(video['duration'])-seconds)<.04
    assert video['codec_name']=='h264' and video['pix_fmt']=='yuv420p'
    assert audio['codec_name']=='aac'
    assert abs(float(info['format']['duration'])-seconds)<.1
    subprocess.run([str(ffmpeg),'-v','error','-i',str(path),'-f','null','-'],check=True)
    samples=[120,360,835,1050,1390,1680] if seconds==60 else [35,100,205,260,340,420]
    contact_sheet(path,samples,640,360,3,f'{suffix}-contact.png')
    if seconds==60:
        # Before, at and after each scene boundary; two rows per transition.
        boundary_frames=[n+d for n in [210,510,900,1200,1560] for d in [-20,-8,0,8,20,35]]
        contact_sheet(path,boundary_frames,480,270,6,'transitions.png')
    pcm=array.array('f',subprocess.check_output([str(ffmpeg),'-v','error','-i',str(path),'-vn','-ac','1','-ar','8000','-f','f32le','pipe:1']))
    peak=max(abs(v) for v in pcm)
    assert .001 < peak < .99, 'Audio must be present and unclipped'
    results.append({'file':path.name,'duration_seconds':float(video['duration']),'frames':frames,'width':1920,'height':1080,'fps':30,'video_codec':video['codec_name'],'pixel_format':video['pix_fmt'],'color_space':video.get('color_space'),'audio_codec':audio['codec_name'],'audio_peak_dbfs':round(20*math.log10(peak),2),'full_decode':'passed','bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    print(f'{path.name}: {frames} frames, {seconds}s, H.264/AAC, complete decode passed')
poster=out/'CVE2-ISQRT-poster.png'
png=poster.read_bytes()
assert png[:8]==b'\x89PNG\r\n\x1a\n'
assert (int.from_bytes(png[16:20],'big'),int.from_bytes(png[20:24],'big'))==(1920,1080)
results.append({'file':poster.name,'width':1920,'height':1080,'bytes':len(png),'sha256':hashlib.sha256(png).hexdigest()})
(out/'quality-report.json').write_text(json.dumps(results,indent=2)+'\n')
print('Wrote out/quality-report.json and encoded-video review sheets.')
