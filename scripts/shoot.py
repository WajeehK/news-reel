import sys, time, json
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8811/'
D=json.load(open('data/news.json'))
pick={}
for s in D['stories']:
    pick.setdefault(s['topic'],s)
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.goto(U); pg.wait_for_selector('.card'); time.sleep(1.5)
    pg.screenshot(path='shots/feed.png')
    for t in ['legal','war','markets','crypto','election','tech','sport','disaster','science','politics','general']:
        s=pick.get(t)
        if not s: print('no story for',t); continue
        pg.evaluate("s=>{window.__p=playIntro(s,JSON.parse(localStorage.getItem('nr-cache')),{dur:6000})}", s)
        time.sleep(2.6); pg.screenshot(path=f'shots/intro-{t}.png')
        pg.evaluate("document.querySelector('.intro').click()"); time.sleep(.5)
    sid=pick.get('legal',D['stories'][0])['id']
    pg.click(f'.card[data-id="{sid}"]') if pg.query_selector(f'.card[data-id="{sid}"]') else pg.evaluate(f"location.hash='#s/{sid}'")
    time.sleep(4.3); pg.screenshot(path='shots/story.png'); pg.screenshot(path='shots/story-full.png',full_page=True)
    pg.click('[data-x=back]'); time.sleep(.6)
    pg.click('.tb[data-tab=recap]'); time.sleep(.6); pg.screenshot(path='shots/recap.png')
    pg.click('.tb[data-tab=alerts]'); pg.fill('#kwin','Trump'); pg.click('#kwform button'); time.sleep(.5); pg.screenshot(path='shots/alerts.png')
    pg.click('.tb[data-tab=feed]'); pg.click('.chip[data-t=war]'); time.sleep(.6); pg.screenshot(path='shots/filter-war.png')
    b.close()
print('errors',errs)
