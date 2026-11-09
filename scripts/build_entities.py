#!/usr/bin/env python3
"""Build entities.json from scripts/entities.txt and bundle logos/flags into assets/ (run locally when the list changes).
Logos: Simple Icons (CC0) via jsDelivr, else the site's favicon (Google s2, 128px). Flags: flag-icons (MIT)."""
import os, json, urllib.request, concurrent.futures as cf
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as r: return r.read()
    except Exception: return None
ents = {}
for line in open(os.path.join(R, 'scripts/entities.txt'), encoding='utf-8'):
    line = line.rstrip('\n')
    if not line.strip() or line.startswith('#'): continue
    f = (line.split('|') + [''] * 11)[:11]
    t, i, n, k, c, slug, dom, tk, cc, role, org = f
    ents[i] = {k2: v for k2, v in dict(t=t, n=n, k=[x.strip() for x in k.split(',') if x.strip()], c=c, slug=slug, dom=dom, tk=tk, cc=cc, role=role, org=org).items() if v}
def logo(i):
    e = ents[i]; L = os.path.join(R, 'assets/logos')
    for ext in ('svg', 'png'):
        if os.path.exists(f'{L}/{i}.{ext}'): e['logo'] = f'assets/logos/{i}.{ext}'; return
    if e.get('slug'):
        b = get(f"https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/{e['slug']}.svg")
        if b and b.startswith(b'<svg'): open(f'{L}/{i}.svg', 'wb').write(b); e['logo'] = f'assets/logos/{i}.svg'; e['mono'] = 1; return
    if e.get('dom'):
        b = get(f"https://www.google.com/s2/favicons?domain={e['dom']}&sz=128")
        if b and len(b) > 900:
            import io; from PIL import Image
            if Image.open(io.BytesIO(b)).size[0] >= 64: open(f'{L}/{i}.png', 'wb').write(b); e['logo'] = f'assets/logos/{i}.png'
def flag(cc):
    p = os.path.join(R, f'assets/flags/{cc}.svg')
    if not os.path.exists(p):
        b = get(f'https://cdn.jsdelivr.net/npm/flag-icons@7/flags/4x3/{cc}.svg')
        if b: open(p, 'wb').write(b)
os.makedirs(os.path.join(R, 'assets/logos'), exist_ok=True); os.makedirs(os.path.join(R, 'assets/flags'), exist_ok=True)
with cf.ThreadPoolExecutor(12) as ex:
    list(ex.map(logo, [i for i in ents if ents[i]['t'] != 'country']))
    list(ex.map(flag, sorted({e['cc'] for e in ents.values() if e.get('cc')})))
for e in ents.values():
    if os.path.exists(os.path.join(R, 'assets/logos', os.path.basename(e.get('logo', '')))) and e.get('logo', '').endswith('.svg'): e['mono'] = 1
    e.pop('slug', None); e.pop('dom', None)
json.dump(ents, open(os.path.join(R, 'entities.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
from collections import Counter
print(len(ents), Counter(e['t'] for e in ents.values()), 'logos', sum('logo' in e for e in ents.values()), 'flags', len(os.listdir(os.path.join(R, 'assets/flags'))))
print('no logo:', [i for i, e in ents.items() if e['t'] not in ('country', 'person') and 'logo' not in e])
