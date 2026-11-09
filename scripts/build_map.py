#!/usr/bin/env python3
"""Build the Map tab's static world: Natural Earth (public domain) 1:110m countries via world-atlas -> assets/world.svg + assets/geo.json
(projected country label points + city points). Run once on a dev machine; the app never fetches map tiles."""
import json, math, os, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = 1000
def ne(lon, lat):  # Natural Earth I projection, scaled to width W
    l, p = math.radians(lon), math.radians(lat); p2 = p * p; p4 = p2 * p2
    x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)))
    y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
    k = W / (2 * 0.8707 * math.pi)
    return (x * k + W / 2, -y * k)
get = lambda u: json.loads(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'NewsReel build'}), timeout=30).read())
topo = get('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
iso = {r['country-code']: r['alpha-2'].lower() for r in get('https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json')}
iso.update({'-99': None})
sx, sy = topo['transform']['scale']; tx, ty = topo['transform']['translate']
arcs = []
for a in topo['arcs']:
    x = y = 0; pts = []
    for dx, dy in a: x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)
def ring(idx):
    pts = []
    for i in idx:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts
top = ne(0, 84)[1]; paths = []; geo = {'w': W}
cc = {}
for g in topo['objects']['countries']['geometries']:
    if g.get('id') == '010' or g.get('type') is None: continue  # drop Antarctica
    polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
    d = []; best = (0, None)
    for poly in polys:
        for ri, r in enumerate(poly):
            pts = [ne(lo, max(-58, la)) for lo, la in ring(r)]
            d.append('M' + 'L'.join(f'{x:.1f},{y - top:.1f}' for x, y in pts) + 'Z')
            if ri == 0:
                A = cx = cy = 0
                for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
                    f = x1 * y2 - x2 * y1; A += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
                if abs(A) > abs(best[0]): best = (A, (cx / (3 * A), cy / (3 * A) - top))
    code = iso.get(g.get('id', '-99')) or {'Kosovo': 'xk', 'N. Cyprus': None, 'Somaliland': None}.get(g['properties']['name'])
    paths.append((code, ''.join(d)))
    if code and best[1]: cc[code] = [round(best[1][0], 1), round(best[1][1], 1)]
H = round(ne(0, -58)[1] - top, 1)
cc.update({'hk': [round(ne(114.17, 22.3)[0], 1), round(ne(114.17, 22.3)[1] - top, 1)], 'sg': [round(ne(103.8, 1.35)[0], 1), round(ne(103.8, 1.35)[1] - top, 1)]})
cities = {}
for line in open(os.path.join(ROOT, 'scripts', 'cities.txt')):
    if not line.strip() or line.startswith('#'): continue
    k, words, la, lo, c = line.strip().split('|')
    x, y = ne(float(lo), float(la)); cities[k] = {'x': round(x, 1), 'y': round(y - top, 1), 'n': words.split(',')[0].title(), 'cc': c}
geo.update({'h': H, 'cc': cc, 'city': cities})
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">' + ''.join(f'<path{f" data-cc={chr(34)}{c}{chr(34)}" if c else ""} d="{d}"/>' for c, d in paths) + '</svg>'
open(os.path.join(ROOT, 'assets', 'world.svg'), 'w').write(svg)
json.dump(geo, open(os.path.join(ROOT, 'assets', 'geo.json'), 'w'), separators=(',', ':'))
print('countries', len(paths), 'points', len(cc), 'cities', len(cities), 'svg bytes', len(svg), 'H', H)
