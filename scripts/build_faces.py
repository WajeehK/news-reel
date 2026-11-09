#!/usr/bin/env python3
"""Download a portrait for every person entity from Wikipedia/Wikimedia Commons (free REST API), crop to a 512px square
focused on the face area, and record the credit/licence in assets/faces/credits.json. Run locally when the entity list changes."""
import json, os, io, re, urllib.request, urllib.parse, concurrent.futures as cf
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'NewsReel/1.0 (https://wajeehk.github.io/news-reel/; personal news app)'}
WIKI = {'trump': 'Donald Trump', 'vance': 'JD Vance', 'rfk': 'Robert F. Kennedy Jr.', 'aoc': 'Alexandria Ocasio-Cortez', 'mamdani': 'Zohran Mamdani',
        'johnson_speaker': 'Mike Johnson', 'kingcharles': 'Charles III', 'princewilliam': 'William, Prince of Wales', 'harry': 'Prince Harry, Duke of Sussex',
        'andrew': 'Andrew Mountbatten-Windsor', 'xi': 'Xi Jinping', 'erdogan': 'Recep Tayyip Erdoğan', 'mbs': 'Mohammed bin Salman', 'lula': 'Luiz Inácio Lula da Silva',
        'maduro': 'Nicolás Maduro', 'orban': 'Viktor Orbán', 'popeleo': 'Pope Leo XIV', 'combs': 'Sean Combs', 'patel': 'Kash Patel', 'stephenmiller': 'Stephen Miller (political advisor)',
        'carney': 'Mark Carney', 'reeves': 'Rachel Reeves', 'kane': 'Harry Kane', 'hamilton': 'Lewis Hamilton', 'norris': 'Lando Norris', 'salah': 'Mohamed Salah'}
def get(u, raw=False):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20) as r:
        b = r.read(); return b if raw else json.loads(b)
def one(i, e):
    out = os.path.join(R, f'assets/faces/{i}.jpg')
    title = WIKI.get(i, e['n'])
    try:
        sm = get('https://en.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(title.replace(' ', '_')))
        src = (sm.get('originalimage') or sm.get('thumbnail') or {}).get('source')
        if not src: return i, None
        # prefer an 800px rendition (thumbnail URL pattern) to keep downloads small
        m = re.search(r'/commons/(?:thumb/)?([0-9a-f]/[0-9a-f]{2})/([^/]+)', src)
        fn = urllib.parse.unquote(m.group(2)) if m else None
        if m and not fn.lower().endswith('.svg'):
            src = f'https://upload.wikimedia.org/wikipedia/commons/thumb/{m.group(1)}/{m.group(2)}/800px-{m.group(2)}'
        try: b = get(src, True)
        except Exception: b = get((sm.get('originalimage') or sm.get('thumbnail'))['source'], True)
        im = Image.open(io.BytesIO(b)).convert('RGB'); w, h = im.size
        s = min(w, h)
        if h > w: top = int(min(h - s, h * 0.04)); box = (0, top, s, top + s)   # portraits: keep head near top
        else: left = (w - s) // 2; box = (left, 0, left + s, s)
        im = im.crop(box).resize((512, 512), Image.LANCZOS); im.save(out, quality=86, optimize=True, progressive=True)
        cred = {'title': title, 'page': sm.get('content_urls', {}).get('desktop', {}).get('page')}
        if fn:
            try:
                ii = get('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=File:' + urllib.parse.quote(fn))
                md = next(iter(ii['query']['pages'].values()))['imageinfo'][0]['extmetadata']
                strip = lambda x: re.sub(r'<[^>]+>', '', (md.get(x) or {}).get('value', '')).strip()
                cred.update(file='https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(fn), artist=strip('Artist')[:120], license=strip('LicenseShortName'))
            except Exception: pass
        return i, cred
    except Exception as ex:
        print('fail', i, title, ex); return i, None
ents = json.load(open(os.path.join(R, 'entities.json')))
people = {i: e for i, e in ents.items() if e['t'] == 'person'}
with cf.ThreadPoolExecutor(6) as ex: res = dict(ex.map(lambda kv: one(*kv), people.items()))
cr = {i: c for i, c in res.items() if c}
json.dump(cr, open(os.path.join(R, 'assets/faces/credits.json'), 'w'), indent=0, ensure_ascii=False)
print('faces', len(cr), '/', len(people), 'missing', [i for i in people if i not in cr])
