import time, json, glob, os, shutil
from playwright.sync_api import sync_playwright
D=json.load(open('data/news.json')); pick={}
for s in D['stories']: pick.setdefault(s['topic'],s)
os.makedirs('/tmp/nrvid',exist_ok=True)
for f in glob.glob('/tmp/nrvid/*'): os.remove(f)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,record_video_dir='/tmp/nrvid',record_video_size={'width':390,'height':844})
    pg=ctx.new_page(); pg.goto('http://localhost:8811/'); pg.wait_for_selector('.card'); time.sleep(2)
    for t in ['legal','markets','war','crypto']:
        s=pick.get(t)
        if s: pg.evaluate("s=>playIntro(s,JSON.parse(localStorage.getItem('nr-cache')))", s); time.sleep(4.1)
    pg.click('.card.hero'); time.sleep(5.5)
    ctx.close(); b.close()
v=glob.glob('/tmp/nrvid/*.webm')[0]
os.system(f'ffmpeg -y -loglevel error -i {v} -c:v libx264 -pix_fmt yuv420p -crf 26 shots/intros.mp4 && cp {v} shots/intros.webm')
print(os.path.getsize('shots/intros.mp4'))
