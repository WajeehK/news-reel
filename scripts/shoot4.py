import sys, time, json, copy
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8811/'
D=json.load(open('data/news.json')); S=D['stories']; ENTS=json.load(open('entities.json'))
def rec(i):
    e=ENTS[i]; r={'id':i,'t':e['t'],'n':e['n'],'c':e.get('c',''),'logo':e.get('logo'),'mono':e.get('mono'),'cc':e.get('cc'),'role':e.get('role'),'tk':e.get('tk'),'face':e.get('face')}
    return {k:v for k,v in r.items() if v}
def find(f): return next((s for s in S if f(s)),None)
base=find(lambda s:s['topic']=='crypto') or S[0]
def synth(eid,topic,title):
    s=copy.deepcopy(base); s['id']='t_'+eid+topic; s['topic']=topic; s['me']=rec(eid); s['title']=title; s['brk']=False; return s
trump=find(lambda s:(s.get('me') or {}).get('id')=='trump') or synth('trump','politics','Trump says something')
cb=find(lambda s:(s.get('me') or {}).get('id')=='coinbase') or synth('coinbase','crypto','Coinbase wins full federal trust charter from OCC')
bn=find(lambda s:(s.get('me') or {}).get('id')=='binance') or synth('binance','crypto','North Korea is minting meme coins to launder the Binance hack')
img=find(lambda s:s.get('img') and not s.get('img_lo') and 'bbci' in s['img']) or find(lambda s:s.get('img') and not s.get('img_lo'))
# overlap grid: every template x entity type, long name
grid=[]
LONG={'person':'andrew','company':'jlr','country':'cd','none':None}
for t in ['legal','war','markets','crypto','election','tech','sport','disaster','science','politics','general']:
    for k,eid in LONG.items():
        s=copy.deepcopy(base); s['id']=f'g_{t}_{k}'; s['topic']=t; s['brk']=True; s['title']='A very long headline that runs to several lines to test the clamp and spacing of the lower third, really long indeed here'
        s['p']={'toll':'1,234','stamp':'INDICTED','dir':'down'} if t in('disaster','legal','markets') else {}
        s['me']=rec(eid) if eid else None
        if not eid: s['ents']=['Democratic Republic of the Congo Health Ministry']
        grid.append(s)
errs=[]
GRID_ONLY=sys.argv[2].split(',') if len(sys.argv)>2 else []
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=b.new_context(viewport={'width':393,'height':852},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.goto(U+'?v=4'); pg.wait_for_selector('.hero'); time.sleep(1.5)
    pg.screenshot(path='shots/v4-feed.png')
    def intro(s,name,wait=2.8):
        pg.evaluate("s=>{playIntro(s,JSON.parse(localStorage.getItem('nr-cache')),{dur:9000})}", s); time.sleep(wait); pg.screenshot(path=name)
        pg.evaluate("document.querySelector('.intro')&&document.querySelector('.intro').click()"); time.sleep(.5)
    intro(trump,'shots/v4-intro-trump.png'); intro(cb,'shots/v4-intro-coinbase.png'); intro(bn,'shots/v4-intro-binance.png')
    for s in grid:
        if s['id'] in GRID_ONLY or not GRID_ONLY: intro(s,f'/tmp/g/{s["id"]}.png',2.6)
    # story page with sharp image
    pg.evaluate("s=>{const d=JSON.parse(localStorage.getItem('nr-cache'));}",None)
    pg.evaluate(f"location.hash='#s/{img['id']}'"); time.sleep(2.5); pg.screenshot(path='shots/v4-story-image.png')
    pg.evaluate("history.back()"); time.sleep(.6)
    # tab bar mid transition
    bx=pg.eval_on_selector('.tb[data-tab=alerts]','e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}'); pg.mouse.click(*bx); time.sleep(.09); pg.screenshot(path='shots/v4-tabbar-moving.png', clip={'x':0,'y':852-110,'width':393,'height':110})
    time.sleep(.8); bx=pg.eval_on_selector('.tb[data-tab=recap]','e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}'); pg.mouse.click(*bx); time.sleep(.8); pg.screenshot(path='shots/v4-recap.png')
    pg.click('#playall'); time.sleep(2.2); pg.screenshot(path='shots/v4-recap-story1.png')
    pg.mouse.click(330,500); time.sleep(.22); pg.screenshot(path='shots/v4-recap-transition.png'); time.sleep(1.8); pg.screenshot(path='shots/v4-recap-story2.png')
    pg.mouse.click(40,500); time.sleep(.9); print('after prev', pg.evaluate("document.querySelector('.pl-n').textContent"))
    pg.evaluate("document.querySelector('.plx').click()"); time.sleep(.6); print('player closed', not pg.evaluate("!!document.querySelector('.player')"))
    b.close()
print('errors',errs)
