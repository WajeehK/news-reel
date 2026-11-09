#!/usr/bin/env python3
"""News Reel Web Push sender (runs in the GitHub Action after fetch_news.py; no AI, no paid services).
Phones register by POSTing an RSA-OAEP+AES-GCM encrypted message to a public ntfy.sh topic (no account).
Only this script (holding PUSH_RSA_PRIV from GitHub secrets) can read them. Device list + dedupe state is kept
AES-GCM encrypted in data/push.bin (deployed with the site, restored each run). Pushes are signed with VAPID_PRIVATE."""
import json, os, re, sys, time, base64, hashlib, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pywebpush import webpush, WebPushException
from py_vapid import Vapid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
TOPIC = 'nr-sub-d935823194ac2ba1130ce017'
SUB_CLAIM = 'mailto:WajeehK@users.noreply.github.com'
PUSH_HOSTS = re.compile(r'^https://([a-z0-9-]+\.)*(push\.apple\.com|fcm\.googleapis\.com|googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)(/|$)')
MAX_PER_HOUR, MAX_DEVICES = 3, 12
LON = ZoneInfo('Europe/London')
b64d = lambda s: base64.b64decode(s + '=' * (-len(s) % 4))

def keys():
    rsa_pem = os.environ['PUSH_RSA_PRIV'].encode(); vap = os.environ['VAPID_PRIVATE'].encode()
    return serialization.load_pem_private_key(rsa_pem, None), AESGCM(hashlib.sha256(rsa_pem + b'|nr-state').digest()), Vapid.from_pem(vap)

def load_state(aes):
    try:
        raw = open(os.path.join(DATA, 'push.bin'), 'rb').read()
        return json.loads(aes.decrypt(raw[:12], raw[12:], None))
    except Exception as e:
        print('push: fresh state', type(e).__name__, file=sys.stderr); return {'dev': {}, 'since': '12h'}

def save_state(aes, st):
    iv = os.urandom(12); open(os.path.join(DATA, 'push.bin'), 'wb').write(iv + aes.encrypt(iv, json.dumps(st, separators=(',', ':')).encode(), None))

def inbox(rsa, since):
    url = f'https://ntfy.sh/{TOPIC}/json?poll=1&since={since}'
    try: lines = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'NewsReel push'}), timeout=20).read().decode().splitlines()
    except Exception as e: print('push: ntfy read fail', e, file=sys.stderr); return [], since
    out, last = [], since
    for ln in lines:
        try:
            m = json.loads(ln)
            if m.get('event') != 'message': continue
            last = m['id']; env = json.loads(m['message'])
            k = rsa.decrypt(b64d(env['k']), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
            msg = json.loads(AESGCM(k).decrypt(b64d(env['iv']), b64d(env['c']), None)); msg['_t'] = m.get('time', 0); out.append(msg)
        except Exception: continue  # junk / undecryptable posts on the public topic are ignored
    return out, last

def kwset(s): return set(s.get('kw') or [])
def similar(s, sent_kw): return any(len(kwset(s) & set(k)) >= 4 for k in sent_kw)

def main():
    if not os.environ.get('VAPID_PRIVATE') or not os.environ.get('PUSH_RSA_PRIV'):
        print('push: no secrets, skipping', file=sys.stderr); return
    rsa, aes, vapid = keys(); st = load_state(aes)
    D = json.load(open(os.path.join(DATA, 'news.json')))
    try: CAL = json.load(open(os.path.join(DATA, 'calendar.json')))['events']
    except Exception: CAL = []
    now = time.time(); lon = datetime.now(LON); hm = lon.hour * 60 + lon.minute
    quiet = 30 <= hm < 450  # 00:30-07:30 UK
    msgs, st['since'] = inbox(rsa, st.get('since') or '12h')
    welcome = set()
    for m in sorted(msgs, key=lambda m: m['_t']):
        did = str(m.get('id', ''))[:40]
        if not did: continue
        if m.get('off'): st['dev'].pop(did, None); continue
        sub = m.get('sub') or {}
        if not PUSH_HOSTS.match(str(sub.get('endpoint', ''))) or not (sub.get('keys') or {}).get('p256dh'): continue
        d = st['dev'].get(did)
        if not d:
            d = st['dev'][did] = {'sent': [], 'kwsent': [], 'log': [], 'brief': ''}
            d['sent'] = [s['id'] for s in D['stories']][:400]  # don't flood a new device with the current backlog
            welcome.add(did)
        if m.get('test'): welcome.add(did)
        d.update({'sub': {'endpoint': sub['endpoint'], 'keys': sub['keys']}, 'kw': [str(k)[:40] for k in (m.get('kw') or [])][:30],
                  'brk': bool(m.get('brk', True)), 'morning': bool(m.get('brief', True)), 'seen': int(now)})
    if len(st['dev']) > MAX_DEVICES:  # keep the most recently seen devices
        for k in sorted(st['dev'], key=lambda k: st['dev'][k].get('seen', 0))[:len(st['dev']) - MAX_DEVICES]: st['dev'].pop(k)
    sent_n = 0
    def send(did, d, payload, urgent=False):
        nonlocal sent_n
        try:
            webpush(d['sub'], json.dumps(payload), vapid_private_key=vapid, vapid_claims={'sub': SUB_CLAIM}, ttl=4 * 3600,
                    headers={'Urgency': 'high' if urgent else 'normal'}, timeout=15)
            sent_n += 1; return True
        except WebPushException as e:
            code = getattr(e.response, 'status_code', 0)
            print('push: send fail', code, file=sys.stderr)
            if code in (404, 410): st['dev'].pop(did, None)
            return False
        except Exception as e:
            print('push: send error', type(e).__name__, file=sys.stderr); return False
    top = sorted([s for s in D['stories'] if now - s['t'] < 12 * 3600], key=lambda s: -s['score'])
    for did, d in list(st['dev'].items()):
        if did in welcome:
            kw = ', '.join(d['kw'][:5])
            send(did, d, {'title': '🔔 News Reel alerts are on', 'body': 'You\u2019ll get breaking news' + (f' and alerts for {kw}' if kw else '') + (' plus a 7:30 briefing.' if d['morning'] else '.'), 'tag': 'nr-welcome', 'url': './'})
            continue
        d['log'] = [t for t in d['log'] if now - t < 3600]
        rx = re.compile(r'\b(' + '|'.join(re.escape(k) for k in d['kw']) + ')', re.I) if d['kw'] else None
        cands = []
        for s in D['stories']:
            if s['id'] in d['sent'] or now - s.get('first', s['t']) > 5400: continue
            txt = s['title'] + ' ' + (s.get('summary') or '') + ' ' + ' '.join(s.get('ents') or []) + ' ' + ((s.get('me') or {}).get('n') or '')
            hit = rx.search(txt) if rx else None
            if hit: cands.append((2, s, hit.group(1)))
            elif d['brk'] and s.get('brk'): cands.append((1, s, None))
        cands.sort(key=lambda c: (-c[0], -c[1]['score']))
        for pri, s, k in cands:
            huge = s.get('brk') and s.get('n', 1) >= 8
            if quiet and not huge: continue
            if len(d['log']) >= MAX_PER_HOUR: break
            d['sent'].append(s['id'])
            if similar(s, d['kwsent']): continue  # same story re-clustered under a new id
            title = (f'🔔 {k}' if k else '🔴 Breaking') + ' · ' + {'legal': 'Legal', 'war': 'Conflict', 'markets': 'Markets', 'crypto': 'Crypto', 'election': 'Election', 'politics': 'Politics', 'tech': 'Tech', 'disaster': 'Disaster', 'sport': 'Sport', 'science': 'Science'}.get(s['topic'], 'News')
            if send(did, d, {'title': title, 'body': s['title'], 'tag': s['id'], 'url': './#s/' + s['id']}, urgent=pri == 1 or huge):
                d['log'].append(now); d['kwsent'].append(sorted(kwset(s)))
        # morning briefing ~07:30 UK (first run after 07:30, until 10:00)
        day = lon.strftime('%Y-%m-%d')
        if d['morning'] and 450 <= hm < 600 and d.get('brief') != day and top:
            mk = {m['n']: m for m in D.get('mkt') or []}
            mtxt = ', '.join(f"{n} {'+' if mk[n]['ch'] >= 0 else ''}{mk[n]['ch']:.1f}%" for n in ('S&P 500', 'Bitcoin') if n in mk)
            evs = [e for e in CAL if datetime.fromtimestamp(e['ts'], LON).strftime('%Y-%m-%d') == day and e['imp'] == 'H']
            etxt = ('Today: ' + ', '.join(f"{e['ccy']} {e['title']} {datetime.fromtimestamp(e['ts'], LON):%H:%M}" for e in evs[:2]) + '. ') if evs else ''
            if send(did, d, {'title': '☀️ Your morning briefing', 'body': f"{top[0]['title']}. {etxt}{mtxt}".strip(), 'tag': 'nr-brief', 'url': './#brief'}):
                d['brief'] = day
        d['sent'] = d['sent'][-600:]; d['kwsent'] = d['kwsent'][-60:]
    save_state(aes, st)
    print(f'push: devices {len(st["dev"])}, new msgs {len(msgs)}, sent {sent_n}, quiet {quiet}', file=sys.stderr)

if __name__ == '__main__':
    main()
