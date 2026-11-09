import sys, time, json, shutil
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8811/'
D=json.load(open('data/news.json')); S=D['stories']
def find(f):
    return next((s for s in S if f(s)),None)
picks={
 'company-nvidia': find(lambda s:(s.get('me') or {}).get('id')=='nvidia' and s['topic']=='tech') or find(lambda s:(s.get('me') or {}).get('t')=='company'),
 'company-markets': find(lambda s:(s.get('me') or {}).get('t')=='company' and s['topic']=='markets') or find(lambda s:(s.get('me') or {}).get('id')=='nvidia' and s['topic']=='markets'),
 'country': find(lambda s:(s.get('me') or {}).get('t')=='country' and s['topic'] in ('war','disaster')),
 'person': find(lambda s:(s.get('me') or {}).get('id') in ('hegseth','trump') and s['topic'] in ('legal','politics','election')),
 'crypto': find(lambda s:(s.get('me') or {}).get('t')=='crypto'),
 'sport': find(lambda s:(s.get('me') or {}).get('t')=='sport'),
}
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for dev,(w,h) in {'iphone15':(393,852),'iphone16promax':(440,956)}.items():
        ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2,is_mobile=True,has_touch=True)
        pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        pg.goto(U+'?v=3'); pg.wait_for_selector('.card'); time.sleep(1.2)
        if dev=='iphone15':
            pg.screenshot(path='shots/v3-feed.png')
            for k,s in picks.items():
                if not s: print('none',k); continue
                pg.evaluate("s=>{playIntro(s,JSON.parse(localStorage.getItem('nr-cache')),{dur:7000})}", s)
                time.sleep(2.7); pg.screenshot(path=f'shots/v3-intro-{k}.png'); print(k, s['title'][:60], s['me']['n'])
                pg.evaluate("document.querySelector('.intro').click()"); time.sleep(.6)
            # recap + playlist
            pg.click('.tb[data-tab=recap]'); time.sleep(.6); pg.screenshot(path='shots/v3-recap.png')
            pg.click('#playall'); time.sleep(2.6); pg.screenshot(path='shots/v3-recap-playing.png')
            pg.evaluate("document.querySelector('.intro').click()"); time.sleep(2.6); pg.screenshot(path='shots/v3-recap-playing2.png')
            pg.evaluate("document.querySelector('.intro .plx').click()"); time.sleep(.6)
            print('after stop intro?', pg.evaluate("!!document.querySelector('.intro')"))
            pg.click('.tb[data-tab=feed]'); time.sleep(.4)
            sid=picks['company-nvidia']['id']; pg.evaluate(f"location.hash=''"); 
            pg.click(f'.card[data-id="{sid}"]'); time.sleep(4.6); pg.screenshot(path='shots/v3-story.png'); pg.click('[data-x=back]'); time.sleep(.5)
        # full-screen check: scroll down, simulate notch safe areas, play
        pg.evaluate("scrollTo(0,1500)"); time.sleep(.3)
        pg.add_style_tag(content='.intro{--st:59px!important;--sb:34px!important}')
        s=picks['company-nvidia']
        pg.evaluate("s=>{playIntro(s,JSON.parse(localStorage.getItem('nr-cache')),{dur:7000})}", s); time.sleep(2.7)
        r=pg.evaluate("(()=>{const r=document.querySelector('.intro').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,dock:getComputedStyle(document.querySelector('.dock')).visibility}})()")
        print(dev,'intro rect',r)
        pg.screenshot(path=f'shots/v3-fullscreen-{dev}.png')
        ctx.close()
    b.close()
shutil.copy('icon-512.png','shots/v3-icon.png')
print('errors',errs)
