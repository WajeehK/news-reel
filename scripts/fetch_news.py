#!/usr/bin/env python3
"""News Reel fetcher: free RSS -> dedupe -> cluster -> keyword-classify -> data/news.json.
Stdlib only, no LLM, no paid APIs. Keeps a rolling 3-day archive for timelines."""
import json, re, time, html, hashlib, os, sys, urllib.request, concurrent.futures as cf
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
 ('markets', r"stock\w*|shares|market\w*|dow|nasdaq|s&p|ftse|economy|economic|inflation|interest rates?|fed|federal reserve|bank of england|gdp|recession|tariff\w*|earnings|profit\w*|investors?|bonds?|yields?|oil price\w*|budget|tax\w*|jobs report|unemployment|wall street|ipo"),
 ('tech', r"ai|a\.i\.|artificial intelligence|openai|google|apple|microsoft|meta|amazon|nvidia|tesla|chip\w*|semiconductor\w*|iphone|software|cyber\w*|hack\w*|app|apps|robot\w*|tech\w*|startup\w*|data|smartphone\w*|chatgpt|x\.com|elon musk|spacex"),
 ('sport', r"football|premier league|champions league|goal\w*|match|cup|nfl|nba|mlb|nhl|tennis|golf|cricket|rugby|f1|formula one|grand prix|olympic\w*|world cup|coach|manager|striker|quarterback|wins|beat|defeat\w*|title|league|season|transfer|wimbledon|boxing|ufc|arsenal|chelsea|liverpool|man(?:chester)? (?:city|united)|tottenham|real madrid|barcelona|sport\w*"),
 ('disaster', r"earthquake\w*|quake|hurricane\w*|typhoon\w*|cyclone\w*|storm\w*|flood\w*|wildfire\w*|fire\w*|blaze|tornado\w*|tsunami|volcano\w*|eruption|landslide\w*|heatwave|drought|weather|snow|evacuat\w*|crash\w*|derail\w*|explosion|shooting|gunman|collapse\w*|death toll|rescue\w*|outbreak|met office|warning"),
 ('science', r"science|scientists?|study|research\w*|nasa|space|rocket|moon|mars|planet\w*|asteroid|telescope|climate|species|fossil\w*|dinosaur\w*|vaccine\w*|cancer|disease|health|medical|doctors?|nhs|genetic\w*|physics|discover\w*|astronaut\w*|universe"),
 ('politics', r"president|prime minister|pm|minister\w*|government|parliament|congress|senate|senators?|house speaker|white house|trump|biden|starmer|labour|tory|tories|conservative\w*|republican\w*|democrat\w*|policy|bill|law|cabinet|mp|mps|downing street|governor|mayor|resign\w*|sanction\w*|diplomat\w*|summit|treaty|shutdown"),
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

def classify(text):
    best, bs = 'general', 0
    for i, (t, rx) in enumerate(TOPIC_RX):
        n = len(rx.findall(text))
        w = n * (1.6 if t in ('legal', 'disaster', 'crypto', 'election') else 1.0)
        if w > bs: best, bs = t, w
    return best

def params(topic, title, text):
    p = {}
    if topic in ('markets', 'crypto'):
        u, d = len(UP_RX.findall(title)), len(DOWN_RX.findall(title))
        p['dir'] = 'up' if u > d else 'down' if d > u else ('up' if len(UP_RX.findall(text)) >= len(DOWN_RX.findall(text)) else 'down')
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

def build():
    now = int(time.time())
    with cf.ThreadPoolExecutor(10) as ex:
        items = [i for r in ex.map(lambda f: parse(*f), FEEDS) for i in r]
    items = [i for i in items if now - i['t'] < 36 * 3600 and i['t'] <= now + 600]
    print('items', len(items), file=sys.stderr)
    stories = []
    for c in cluster(items):
        arts = sorted(c['arts'], key=lambda a: (a['desc'] == '', a['t']))
        lead = arts[0]
        srcs = []
        for a in sorted(c['arts'], key=lambda a: a['t']):
            if a['src'] not in [s['src'] for s in srcs]: srcs.append({'src': a['src'], 'link': a['link'], 't': a['t']})
        alltext = ' '.join(a['title'] + ' ' + a['desc'] for a in c['arts'])
        topic = classify(lead['title'] + ' ' + lead['title'] + ' ' + alltext)
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
            'srcs': srcs[:8], 'n': nsrc, 'first': first, 't': last, 'score': score, 'brk': brk,
        })
    stories.sort(key=lambda s: -s['score'])
    stories = stories[:160]
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
    # crypto prices (free, keyless; optional)
    prices = None
    try:
        prices = json.loads(get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true'))
    except Exception as e:
        print('prices fail', e, file=sys.stderr)
    # daily recap: top 5 of last 24h by sources, one per topic preference
    day = [s for s in stories if now - s['t'] < 86400]
    day.sort(key=lambda s: -(s['n'] * 2 + s['score']))
    recap, used = [], set()
    for s in day:
        if len(recap) >= 5: break
        if s['topic'] in used and len(day) > 12 and len(used) < 4: continue
        recap.append(s['id']); used.add(s['topic'])
    for s in day:
        if len(recap) >= 5: break
        if s['id'] not in recap: recap.append(s['id'])
    brk_ids = [s['id'] for s in stories if s['brk']][:5]
    for s in stories: s['brk'] = s['id'] in brk_ids
    out = {'generated': now, 'stories': stories, 'recap': recap, 'prices': prices,
           'breaking': brk_ids}
    os.makedirs(DATA, exist_ok=True)
    json.dump(out, open(os.path.join(DATA, 'news.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    json.dump(arch, open(ap, 'w'), separators=(',', ':'), ensure_ascii=False)
    from collections import Counter
    print('stories', len(stories), Counter(s['topic'] for s in stories), 'breaking', len(out['breaking']), file=sys.stderr)

if __name__ == '__main__':
    build()
