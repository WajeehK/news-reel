#!/usr/bin/env python3
"""News Reel fetcher: free RSS -> dedupe -> cluster -> keyword-classify -> data/news.json.
Stdlib only, no LLM, no paid APIs. Keeps a rolling 3-day archive for timelines."""
import json, re, time, html, hashlib, os, sys, urllib.request, urllib.parse, concurrent.futures as cf
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
UA = 'Mozilla/5.0 (NewsReel RSS reader; +https://wajeehk.github.io/news-reel/)'
GN = 'https://news.google.com/rss'
FEEDS = [
 ('BBC', 'https://feeds.bbci.co.uk/news/rss.xml'),
 ('BBC', 'https://feeds.bbci.co.uk/news/world/rss.xml'),
 ('BBC', 'https://feeds.bbci.co.uk/news/business/rss.xml'),
 ('BBC', 'https://feeds.bbci.co.uk/news/technology/rss.xml'),
 ('BBC', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'),
 ('BBC Sport', 'https://feeds.bbci.co.uk/sport/rss.xml'),
 ('Guardian', 'https://www.theguardian.com/world/rss'),
 ('Guardian', 'https://www.theguardian.com/us-news/rss'),
 ('Guardian', 'https://www.theguardian.com/uk-news/rss'),
 ('Guardian', 'https://www.theguardian.com/business/rss'),
 ('Sky News', 'https://feeds.skynews.com/feeds/rss/home.xml'),
 ('NPR', 'https://feeds.npr.org/1001/rss.xml'),
 ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'),
 ('CBS News', 'https://www.cbsnews.com/latest/rss/main'),
 (None, GN + '?hl=en-GB&gl=GB&ceid=GB:en'),
 (None, GN + '?hl=en-US&gl=US&ceid=US:en'),
 (None, GN + '/search?q=site:reuters.com+when:1d&hl=en-US&gl=US&ceid=US:en'),
 (None, GN + '/search?q=site:apnews.com+when:1d&hl=en-US&gl=US&ceid=US:en'),
 (None, GN + '/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en'),
 (None, GN + '/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en'),
 (None, GN + '/search?q=bitcoin+OR+crypto+when:1d&hl=en-US&gl=US&ceid=US:en'),
]

TOPICS = [  # order = priority when scores tie
 ('legal', r"impeach\w*|indict\w*|charged|charges|convict\w*|sentenc\w*|verdict|murder trial|lawsuit|sued|sues|supreme court|judge|court|prosecut\w*|attorney general|doj|fbi|arrest\w*|subpoena|guilty|acquit\w*|ruling|appeal|jail|prison"),
 ('election', r"election\w*|vote[sd]?|voting|voters|ballot\w*|polls?|polling|campaign\w*|primar(?:y|ies)|candidate\w*|electoral|referendum|by-election|midterm\w*|landslide|exit poll"),
 ('war', r"war|wars|missile\w*|strike[sd]?|airstrike\w*|drone\w*|troops|military|army|invasion|invade\w*|ceasefire|gaza|ukraine|israel\w*|hamas|hezbollah|russia\w*|nato|bomb\w*|attack\w*|killed|shelling|frontline|idf|houthi\w*|pentagon|hegseth|defen[cs]e secretary|warship\w*|nuclear"),
 ('crypto', r"bitcoin|btc|ethereum|eth|crypto\w*|stablecoin\w*|blockchain|solana|xrp|dogecoin|coinbase|binance|token\w*|defi|memecoin\w*"),
 ('markets', r"stocks?|stock markets?|share prices?|shares (?:rose|fell|jumped|slumped|surged|plunged|tumbled|climbed)|markets|nasdaq|dow jones|s&p 500|ftse(?: 100| 250)?|wall street|investors?|bonds?|gilts?|yields?|inflation|interest rates?|rate (?:cut|hike|rise)s?|central bank|federal reserve|bank of england|gdp|recession|tariffs?|earnings|ipo|oil prices?|brent crude|sell-?off|market rally|stock rally|currency|sterling|dollar|valuation|trillion|billion deal|takeover|merger|profits? warning"),
 ('tech', r"ai|a\.i\.|artificial intelligence|openai|google|apple|microsoft|meta|amazon|nvidia|tesla|chip\w*|semiconductor\w*|iphone|software|cyber\w*|hack\w*|app|apps|robot\w*|tech\w*|startup\w*|data|smartphone\w*|chatgpt|x\.com|elon musk|spacex"),
 ('sport', r"football|premier league|champions league|goal\w*|match|cup|nfl|nba|mlb|nhl|tennis|golf|cricket|rugby|f1|formula one|grand prix|olympic\w*|world cup|coach|manager|striker|quarterback|wins|beat|defeat\w*|title|league|season|transfer|wimbledon|boxing|ufc|arsenal|chelsea|liverpool|man(?:chester)? (?:city|united)|tottenham|real madrid|barcelona|sport\w*"),
 ('disaster', r"earthquake\w*|quake|hurricane\w*|typhoon\w*|cyclone\w*|storm\w*|flood\w*|wildfire\w*|fire\w*|blaze|tornado\w*|tsunami|volcano\w*|eruption|landslide\w*|heatwave|drought|weather|snow|evacuat\w*|crash\w*|derail\w*|explosion|shooting|gunman|collapse\w*|death toll|rescue\w*|outbreak|met office|warning"),
 ('science', r"science|scientists?|study|research\w*|nasa|space|rocket|moon|mars|planet\w*|asteroid|telescope|climate|species|fossil\w*|dinosaur\w*|vaccine\w*|cancer|disease|health|medical|doctors?|nhs|genetic\w*|physics|discover\w*|astronaut\w*|universe"),
 ('politics', r"pope|vatican|church|archbishop|bishop|religious|catholic|faith leaders?|austerity|protest\w*|president|prime minister|pm|minister\w*|government|parliament|congress|senate|senators?|house speaker|white house|trump|biden|starmer|labour|tory|tories|conservative\w*|republican\w*|democrat\w*|policy|bill|law|cabinet|mp|mps|downing street|governor|mayor|resign\w*|sanction\w*|diplomat\w*|summit|treaty|shutdown"),
]
TOPIC_RX = [(t, re.compile(r'\b(?:' + rx + r')\b', re.I)) for t, rx in TOPICS]
UP_RX = re.compile(r'\b(soar\w*|surg\w*|jump\w*|rall\w*|rise[sn]?|rising|climb\w*|gain\w*|record high|rockets?|boom\w*|up \d|higher)\b', re.I)
DOWN_RX = re.compile(r'\b(plung\w*|crash\w*|tumbl\w*|slump\w*|fall\w*|fell|drop\w*|sink\w*|sank|slid\w*|slide|loss\w*|lower|down \d|sell-?off|rout|tank\w*|declin\w*)\b', re.I)
LEGAL_TAGS = [('IMPEACHED', r'impeach'), ('INDICTED', r'indict'), ('CHARGED', r'\bcharged\b|\bcharges\b'), ('GUILTY', r'guilty|convict'),
              ('SENTENCED', r'sentenc'), ('ARRESTED', r'arrest'), ('RULING', r'ruling|rules|verdict|court'), ('SUED', r'\bsue[sd]?\b|lawsuit')]
STOP = set("""a an the of to in on for and or but with at by from as is are was were be been it its this that these those after before over under
into about up down out new says said say will would could may might can not no yes has have had his her their they he she we you i our your
than then more most less amid via vs v live latest update updates news what why how who when where which just us uk""".split())
STOP_ENT = set("The A An In On At For After Before Live Watch Why How What Who When Where This That Breaking Exclusive New Analysis Opinion Review Video Pictures Photos Here Is Are".split())

def get(url, timeout=12):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def clean(s, n=None):
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))
    s = re.sub(r'\s+', ' ', s).strip()
    if n and len(s) > n:
        s = s[:n].rsplit(' ', 1)[0].rstrip(',;:') + '…'
    return s

def ts(s):
    try:
        return int(parsedate_to_datetime(s).timestamp())
    except Exception:
        try: return int(datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp())
        except Exception: return None

def parse(src, url):
    out = []
    try:
        root = ET.fromstring(get(url))
    except Exception as e:
        print('feed fail', url[:80], e, file=sys.stderr); return out
    M = '{http://search.yahoo.com/mrss/}'
    for it in root.iter('item'):
        title = clean(it.findtext('title'))
        link = (it.findtext('link') or '').strip()
        desc = it.findtext('description') or ''
        s = src
        if src is None:  # Google News: "Headline - Publisher"
            se = it.find('source')
            s = (se.text if se is not None else None) or 'Google News'
            if ' - ' in title: title = title.rsplit(' - ', 1)[0]
            desc = ''  # GN description is just a link list
        img = None
        for tag in (M + 'thumbnail', M + 'content'):
            el = it.find(tag)
            if el is not None and el.get('url'): img = el.get('url'); break
        if not img:
            enc = it.find('enclosure')
            if enc is not None and (enc.get('type') or '').startswith('image'): img = enc.get('url')
        t = ts(it.findtext('pubDate') or '') or int(time.time())
        if not title or not link: continue
        out.append({'title': title, 'link': link, 'src': s.strip(), 'desc': clean(desc, 420), 'img': img, 't': t})
    return out

def toks(s):
    return {w for w in re.findall(r"[a-z0-9']+", s.lower().replace("’", "'")) if w not in STOP and len(w) > 2}

GENERIC = set("""UK US USA EU UN CEO Will Hardline British American French German Chinese Russian Israeli Ukrainian Former Ex Senior Top
Mr Mrs Ms Dr Sir Lord Day Gunman Police Civil Steel Explosion Death Internal Judo Europe-bound Monday Tuesday Wednesday Thursday Friday Saturday Sunday
January February March April May June July August September October November December""".split())

def _titlecase(t):
    w = [x for x in re.findall(r"[A-Za-z][A-Za-z'’]*", t) if len(x) > 3]
    return len(w) >= 4 and sum(x[0].isupper() for x in w) / len(w) > 0.7

def entities(titles):
    from collections import Counter
    cnt = Counter()
    for title in titles:
        if _titlecase(title): continue
        for m in re.finditer(r"[A-Z][a-zA-Z'’\.-]+(?:\s+[A-Z][a-zA-Z'’\.-]+){0,3}", title):
            words = [w.strip("'’.-") for w in m.group(0).split()]
            words = [re.sub(r"['’]s$", '', w) for w in words]
            while words and (words[0] in GENERIC or words[0] in STOP_ENT): words = words[1:]
            while words and words[-1] in GENERIC: words = words[:-1]
            e = ' '.join(words)
            if len(e) < 3 or (m.start() == 0 and len(words) == 1 and e.lower() in STOP): continue
            cnt[e] += 1 + (len(words) >= 2)
    res = []
    for e, _ in cnt.most_common():
        if not any(e in r for r in res): res.append(e)
    return res[:6]

MKT_TITLE = re.compile(r"\b(stocks?|shares|markets?|nasdaq|dow|s&p|ftse|wall st(?:reet)?|investors?|bonds?|yields?|inflation|rates?|gdp|recession|tariffs?|earnings|ipo|oil|prices?|economy|sterling|pound|dollar|profits?|sales|revenue|valuation|deal|takeover)\b", re.I)
def classify(text, title=''):
    sc = []
    for i, (t, rx) in enumerate(TOPIC_RX):
        n = len(rx.findall(text))
        sc.append((n * (1.6 if t in ('legal', 'disaster', 'crypto', 'election') else 1.0), -i, t))
    sc.sort(reverse=True)
    best = sc[0][2] if sc[0][0] > 0 else 'general'
    # markets only when the headline is actually about markets/money moves
    if best == 'markets' and title and not MKT_TITLE.search(title):
        nxt = [x for x in sc[1:] if x[0] > 0]
        best = nxt[0][2] if nxt else 'general'
    return best

def params(topic, title, text):
    p = {}
    if topic in ('markets', 'crypto'):
        u, d = len(UP_RX.findall(title)), len(DOWN_RX.findall(title))
        if u != d: p['dir'] = 'up' if u > d else 'down'
        m = re.search(r'(\d+(?:\.\d+)?)\s?(?:%|per ?cent)', title)
        if m: p['pct'] = m.group(1)
    if topic == 'legal':
        for tag, rx in LEGAL_TAGS:
            if re.search(rx, text, re.I): p['stamp'] = tag; break
    m = re.search(r'\b(\d{1,3}(?:,\d{3})*|\d+)\s+(?:people\s+)?(?:dead|killed|died|deaths)\b', text, re.I)
    if m: p['toll'] = m.group(1)
    return p

def cluster(items):
    items.sort(key=lambda x: -x['t'])
    cl = []
    for it in items:
        tk = toks(it['title'])
        if len(tk) < 2: continue
        best, bj = None, 0
        for c in cl:
            inter = len(tk & c['tk'])
            j = inter / (len(tk | c['tk']) or 1)
            if (j > bj) and (j >= 0.34 or inter >= 4): best, bj = c, j
        if best:
            if any(a['link'] == it['link'] or a['title'] == it['title'] for a in best['arts']): continue
            best['arts'].append(it); best['tk'] |= tk if len(best['arts']) < 3 else set()
        else:
            cl.append({'tk': set(tk), 'arts': [it]})
    return cl

# ---------- entities ----------
ENTS = json.load(open(os.path.join(ROOT, 'entities.json'), encoding='utf-8'))
def _krx(k):
    cs = any(ch.isalpha() for ch in k) and k == k.upper()
    return re.compile(r'(?<![A-Za-z0-9])' + re.escape(k) + r'(?![A-Za-z0-9])', 0 if cs else re.I)
ENT_RX = {i: [_krx(k) for k in e['k']] for i, e in ENTS.items()}
TW = {'company': 1.35, 'person': 1.25, 'crypto': 1.2, 'sport': 1.2, 'org': 1.0, 'country': 0.55}
BOOST = {('tech', 'company'): 1.6, ('markets', 'company'): 1.5, ('crypto', 'crypto'): 2.2, ('sport', 'sport'): 1.6, ('sport', 'person'): 1.2,
         ('war', 'country'): 1.8, ('war', 'org'): 1.3, ('disaster', 'country'): 1.7, ('election', 'person'): 1.3, ('legal', 'person'): 1.3, ('politics', 'person'): 1.2}

def detect(arts, topic):
    sc = {}
    for a in arts:
        for txt, w in ((a['title'], 3.0), (a['desc'], 1.0)):
            if not txt: continue
            for i, rxs in ENT_RX.items():
                n = sum(len(r.findall(txt)) for r in rxs)
                if n: sc[i] = sc.get(i, 0) + w * min(n, 3)
    if not sc: return None, []
    ranked = sorted(sc, key=lambda i: -sc[i] * TW[ENTS[i]['t']] * BOOST.get((topic, ENTS[i]['t']), 1))
    return ranked[0], ranked[:5]

def ent_rec(i):
    e = ENTS[i]; r = {'id': i, 't': e['t'], 'n': e['n'], 'c': e.get('c', ''), 'logo': e.get('logo'), 'mono': e.get('mono'), 'cc': e.get('cc'), 'role': e.get('role'), 'tk': e.get('tk'), 'face': e.get('face')}
    o = e.get('org')
    if o and o in ENTS:
        oe = ENTS[o]; r['org'] = {k: v for k, v in {'id': o, 'n': oe['n'], 'logo': oe.get('logo'), 'mono': oe.get('mono'), 'c': oe.get('c'), 'tk': oe.get('tk')}.items() if v}
        if not r['tk'] and oe['t'] == 'company': r['tk'] = oe.get('tk')
    return {k: v for k, v in r.items() if v}

def quotes(syms):
    out = {}
    def one(sym):
        try:
            m = json.loads(get(f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?range=1d&interval=1d', 10))['chart']['result'][0]['meta']
            p = m.get('regularMarketPrice'); pc = m.get('chartPreviousClose') or m.get('previousClose')
            ch = m.get('regularMarketChangePercent')
            if ch is None and p and pc: ch = (p - pc) / pc * 100
            if p: out[sym] = {'p': round(p, 2), 'ch': round(ch or 0, 2), 'cur': m.get('currency', '')}
        except Exception as ex:
            print('quote fail', sym, ex, file=sys.stderr)
    with cf.ThreadPoolExecutor(8) as ex: list(ex.map(one, list(syms)[:60]))
    return out

BAD_IMG = re.compile(r'poster-|logo|placeholder|default|branded|favicon|sprite|1x1|blank|icon', re.I)
def upgrade_img(u):
    if not u: return u
    u = html.unescape(u.strip())
    u = re.sub(r'(ichef\.bbci\.co\.uk/(?:ace/standard|news|ace/ws|images/ic))/\d+(?:x\d+)?/', r'\1/976/', u)
    u = re.sub(r'(e3\.365dm\.com/.+?)/\d+x\d+/', r'\1/1600x900/', u)
    u = re.sub(r'(media\.npr\.org/.+?)\?s=\d+', r'\1?s=1400', u)
    return u
def og_image(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 'Accept': 'text/html'})
        with urllib.request.urlopen(req, timeout=8) as r:
            h = r.read(450000).decode('utf-8', 'ignore')
    except Exception:
        return None
    def meta(*names):
        for n in names:
            m = re.search(r'<meta[^>]+(?:property|name)=["\']' + re.escape(n) + r'["\'][^>]*content=["\']([^"\']+)', h, re.I) or \
                re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']' + re.escape(n) + r'["\']', h, re.I)
            if m: return m.group(1)
    img = meta('og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src')
    if not img or BAD_IMG.search(img.split('?')[0]): return None
    w = meta('og:image:width')
    try: w = int(w)
    except Exception: w = 1200 if re.search(r'1[0-9]{3}|2048|/976/', img) else 0
    return {'u': upgrade_img(urllib.parse.urljoin(url, img)), 'w': w}
def enrich_images(stories, n=160):
    jobs = []
    for s in stories[:n]:
        links = [x['link'] for x in s['srcs'] if 'news.google.com' not in x['link']][:3]
        for l in links: jobs.append((s['id'], l))
    with cf.ThreadPoolExecutor(16) as ex:
        res = list(ex.map(lambda j: (j[0], og_image(j[1])), jobs))
    best = {}
    for sid, r in res:
        if r and (sid not in best or r['w'] > best[sid]['w']): best[sid] = r
    for s in stories:
        b = best.get(s['id'])
        if b and b['w'] >= 600 or (b and not s.get('img')): s['img'] = b['u']; s['imgw'] = b['w']
        elif s.get('img'):
            s['img'] = upgrade_img(s['img']); s['imgw'] = 976 if '/976/' in s['img'] else 0
        if s.get('img') and s.get('imgw', 0) < 600 and not re.search(r'/976/|1600x900|s=1400', s['img']): s['img_lo'] = 1
    print('images', sum(1 for s in stories if s.get('img') and not s.get('img_lo')), 'hi-res of', len(stories), file=sys.stderr)

def merge_pass(cl):
    """Merge clusters about the same story: same main entity + topic + time window + shared words, or near-identical headlines."""
    for c in cl:
        c['topic'] = classify(' '.join(a['title'] + ' ' + a['title'] + ' ' + a['desc'] for a in c['arts']), ' '.join(a['title'] for a in c['arts'][:3]))
        c['me'], c['ents_all'] = detect(c['arts'], c['topic'])
        c['last'] = max(a['t'] for a in c['arts'])
        ew = set()
        for i in c['ents_all']:
            for k in ENTS[i]['k'] + [ENTS[i]['n']]: ew |= toks(k)
        c['atk'] = set(c['tk']) - ew
        c['eset'] = {i for i in c['ents_all'] if ENTS[i]['t'] != 'country'}
    out = []
    for c in sorted(cl, key=lambda c: -len(c['arts'])):
        tgt = None
        for o in out:
            sh = len(c['atk'] & o['atk']); jac = len(c['tk'] & o['tk']) / (len(c['tk'] | o['tk']) or 1)
            same = c['me'] and c['me'] == o['me'] and abs(c['last'] - o['last']) < 20 * 3600
            co = len((c['eset'] & o['eset']) - {c['me']})
            if jac >= 0.42 or (same and c['topic'] == o['topic'] and (sh >= (3 if ENTS[c['me']]['t'] == 'country' else 2) or co >= 1)) or (same and sh >= 4):
                tgt = o; break
        if tgt:
            links = {a['link'] for a in tgt['arts']}
            tgt['arts'] += [a for a in c['arts'] if a['link'] not in links]; tgt['last'] = max(tgt['last'], c['last'])
        else: out.append(c)
    return out

def build():
    now = int(time.time())
    with cf.ThreadPoolExecutor(10) as ex:
        items = [i for r in ex.map(lambda f: parse(*f), FEEDS) for i in r]
    items = [i for i in items if now - i['t'] < 36 * 3600 and i['t'] <= now + 600]
    print('items', len(items), file=sys.stderr)
    stories = []
    for c in merge_pass(cluster(items)):
        arts = sorted(c['arts'], key=lambda a: (a['desc'] == '', a['t']))
        lead = arts[0]
        srcs = []
        for a in sorted(c['arts'], key=lambda a: a['t']):
            if a['src'] not in [s['src'] for s in srcs]: srcs.append({'src': a['src'], 'link': a['link'], 't': a['t']})
        alltext = ' '.join(a['title'] + ' ' + a['desc'] for a in c['arts'])
        topic = classify(' '.join(a['title'] + ' ' + a['title'] + ' ' + a['desc'] for a in c['arts']), ' '.join(a['title'] for a in c['arts'][:3]))
        me, eall = detect(c['arts'], topic)
        first = min(a['t'] for a in c['arts']); last = max(a['t'] for a in c['arts'])
        descs = []
        for a in arts:
            if a['desc'] and a['desc'].lower() not in [d.lower() for d in descs] and a['desc'].lower() != a['title'].lower(): descs.append(a['desc'])
        nsrc = len(srcs)
        age_h = (now - last) / 3600
        score = round((1 + nsrc) ** 1.25 * (0.5 ** (age_h / 6)) * (1.3 if topic in ('legal', 'war', 'disaster', 'election') else 0.7 if topic == 'crypto' else 1), 3)
        brk = bool(re.search(r'\bbreaking\b|\blive:|just in', alltext, re.I)) and age_h < 3 or (nsrc >= 4 and age_h < 2.5)
        sid = hashlib.sha1((' '.join(sorted(list(c['tk']))[:8]) + str(first // 86400)).encode()).hexdigest()[:10]
        stories.append({
            'id': sid, 'topic': topic, 'title': lead['title'], 'summary': descs[0] if descs else '',
            'details': descs[1:4], 'ents': entities([a['title'] for a in c['arts'][:6]]), 'kw': sorted(c['tk'])[:14],
            'p': params(topic, lead['title'], alltext), 'img': next((a['img'] for a in arts if a['img']), None),
            'srcs': srcs[:8], 'me': ent_rec(me) if me else None, 'ex': [ent_rec(x) for x in eall[1:4] if ENTS[x]['t'] in ('country', 'company', 'person', 'org')][:3], 'n': nsrc, 'first': first, 't': last, 'score': score, 'brk': brk,
        })
    stories.sort(key=lambda s: -s['score'])
    stories = stories[:160]
    enrich_images(stories)
    # archive (rolling 3 days) for timelines
    ap = os.path.join(DATA, 'archive.json')
    try: arch = json.load(open(ap))
    except Exception: arch = []
    am = {a['id']: a for a in arch if now - a['t'] < 3 * 86400}
    for s in stories:
        am[s['id']] = {k: s[k] for k in ('id', 'topic', 'title', 't', 'kw', 'ents')} | {'link': s['srcs'][0]['link'], 'src': s['srcs'][0]['src']}
    arch = sorted(am.values(), key=lambda a: -a['t'])[:1500]
    for s in stories:
        kw, ents = set(s['kw']), {e.lower() for e in s['ents']}
        rel = []
        for a in arch:
            if a['id'] == s['id'] or a['t'] >= s['t']: continue
            ov = len(kw & set(a['kw'])) + 2 * len(ents & {e.lower() for e in a['ents']})
            if ov >= 4: rel.append((ov, a))
        rel.sort(key=lambda x: (-x[0], -x[1]['t']))
        s['timeline'] = sorted([{'title': a['title'], 't': a['t'], 'link': a['link'], 'src': a['src']} for _, a in rel[:5]], key=lambda a: -a['t'])
    brk_ids = [s['id'] for s in stories if s['brk']][:5]
    for s in stories: s['brk'] = s['id'] in brk_ids
    # prices: crypto (CoinGecko, keyless) + stocks for main entities (Yahoo chart, keyless)
    cg = {'bitcoin', 'ethereum', 'solana'} | {s['me']['tk'] for s in stories if s.get('me') and s['me']['t'] == 'crypto' and s['me'].get('tk')}
    prices = None
    try:
        prices = json.loads(get('https://api.coingecko.com/api/v3/simple/price?ids=' + ','.join(sorted(cg)) + '&vs_currencies=usd&include_24hr_change=true'))
    except Exception as e:
        print('prices fail', e, file=sys.stderr)
    q = quotes({s['me']['tk'] for s in stories[:120] if s.get('me') and s['me']['t'] != 'crypto' and s['me'].get('tk')})
    for s in stories:
        me = s.get('me')
        if not me or not me.get('tk'): continue
        if me['t'] == 'crypto' and prices and me['tk'] in prices:
            pr = prices[me['tk']]; me['q'] = {'p': pr.get('usd'), 'ch': round(pr.get('usd_24h_change') or 0, 2), 'cur': 'USD', 'sym': me['k'] if 'k' in me else me['n']}
        elif me['tk'] in q: me['q'] = q[me['tk']]
        if me.get('q') and s['topic'] in ('markets', 'tech', 'crypto') and 'dir' in s['p'] and not (UP_RX.search(s['title']) or DOWN_RX.search(s['title'])):
            s['p']['dir'] = 'up' if me['q']['ch'] >= 0 else 'down'
    # daily recap: every major / breaking story of the last 24h, most important first, one per main-entity+topic
    day = [s for s in stories if now - s['t'] < 86400 and (s['brk'] or s['n'] >= 3 or (s['n'] >= 2 and s['score'] >= 4.5))]
    day.sort(key=lambda s: -(s['n'] * 2 + s['score'] + (6 if s['brk'] else 0)))
    recap, used = [], set()
    for s in day:
        key = (s['me']['id'], s['topic']) if s.get('me') and s['me']['t'] != 'country' else None
        if key and key in used: continue
        if key: used.add(key)
        recap.append(s['id'])
        if len(recap) >= 30: break
    out = {'generated': now, 'stories': stories, 'recap': recap, 'prices': prices,
           'breaking': brk_ids}
    os.makedirs(DATA, exist_ok=True)
    json.dump(out, open(os.path.join(DATA, 'news.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    json.dump(arch, open(ap, 'w'), separators=(',', ':'), ensure_ascii=False)
    from collections import Counter
    print('stories', len(stories), Counter(s['topic'] for s in stories), 'breaking', len(out['breaking']), file=sys.stderr)

LIVE = [('AJ', 'https://www.aljazeera.com/xml/rss/all.xml'), ('FJ', 'https://www.financialjuice.com/feed.ashx?xy=rss')]

def live():
    """Live tab: raw headline squawk (AJ has no CORS, so it is baked here; FJ is also polled client-side)."""
    items = []
    for src, url in LIVE:
        try:
            root = ET.fromstring(get(url))
            for it in root.iter('item'):
                t = html.unescape((it.findtext('title') or '').strip())
                if src == 'FJ': t = re.sub(r'^FinancialJuice:\s*', '', t)
                link = (it.findtext('link') or '').strip()
                try: ts = int(parsedate_to_datetime(it.findtext('pubDate')).timestamp())
                except Exception: continue
                gid = (it.findtext('guid') or link).strip()
                if t: items.append({'id': src.lower() + hashlib.md5(gid.encode()).hexdigest()[:10] if src == 'AJ' else 'fj' + gid, 's': src, 't': t, 'u': link, 'ts': ts})
        except Exception as e:
            print('live fail', src, e, file=sys.stderr)
    items.sort(key=lambda x: -x['ts'])
    json.dump({'generated': int(time.time()), 'items': items[:200]}, open(os.path.join(DATA, 'live.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    print('live', len(items), file=sys.stderr)

if __name__ == '__main__':
    build()
    live()
