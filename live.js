// News Reel v5: Live squawk. FinancialJuice RSS is CORS-open -> polled straight from the browser every 60s (its Cloudflare rate-limits faster browser polling) while the tab is open.
// Al Jazeera RSS blocks CORS -> comes from data/live.json, rebuilt by the GitHub Action every ~15 min (polled every 60s). No AI, no keys.
(function(){
const $=s=>document.querySelector(s),E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FJ='https://www.financialjuice.com/feed.ashx?xy=rss',YT='UCNye-wNBqNL5ZzHSJj3l8Bg';
const URG=/\b(breaking|urgent|flash|alert|emergency|explosions?|blasts?|attacks?|attacked|killed|dead|missiles?|strikes?|struck|airstrikes?|invasion|invades?|war|nuclear|assassinat\w*|coup|crash(?:es|ed)?|plunges?|halt(?:s|ed)?|default|lockdown|evacuat\w*|earthquake|shooting|hostages?)\b/i;
const MM=/\b(fed|fomc|powell|ecb|lagarde|boe|bailey|boj|ueda|pboc|snb|rba|rate (?:cut|hike|decision)s?|rates? unchanged|bps|basis points|cpi|ppi|pce|inflation|nfp|non-?farm|payrolls|jobless|unemployment|gdp|pmi|retail sales|actual|forecast|tariffs?|sanctions?|opec\+?|crude|oil|brent|wti|gold|hormuz|yields?|treasur(?:y|ies)|downgrade[sd]?|upgrade[sd]?|bitcoin|btc|s&p|nasdaq|dow|ftse|dax|nikkei|usd|eur|gbp|jpy|yuan|ceasefire|blockade)\b/i;
const st={items:[],ids:new Set(),f:'all',fjOk:null,fjAt:0,ajAt:0,timers:[],open:false,unread:0};
const cache=JSON.parse(localStorage.getItem('nr-live')||'null');if(cache){st.items=cache;cache.forEach(i=>st.ids.add(i.id))}
const hm=ts=>new Date(ts*1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
const ago=ts=>{const s=Math.max(0,Date.now()/1000-ts|0);return s<60?s+'s':s<3600?(s/60|0)+'m':(s/3600|0)+'h'};
function add(list,fresh){let n=0;for(const i of list){if(st.ids.has(i.id))continue;st.ids.add(i.id);i.n=fresh?1:0;st.items.push(i);n++}
  if(n){st.items.sort((a,b)=>b.ts-a.ts);st.items=st.items.slice(0,250);try{localStorage.setItem('nr-live',JSON.stringify(st.items.slice(0,150).map(({n,...x})=>x)))}catch(_){}}return n}
const row=i=>{const c=(URG.test(i.t)?' urg':MM.test(i.t)?' mm':'')+(i.n?' new':'');
  return `<a class="sq${c}" data-s="${i.s}" href="${E(i.u)}" target="_blank" rel="noopener"><time>${hm(i.ts)}</time><b class="sb ${i.s}">${i.s}</b><span>${E(i.t)}</span></a>`};
function render(){const L=st.items.filter(i=>st.f==='all'||i.s===st.f);const box=$('#squawk');if(!box)return;
  box.innerHTML=L.length?L.slice(0,160).map(row).join(''):'<div class="empty">Connecting to the wires…</div>';
  st.items.forEach(i=>i.n=0);status()}
function status(){const el=$('#lvstat');if(!el)return;
  el.innerHTML=`<span class="${st.fjOk===false?'warn':'ok'}"><i></i>FinancialJuice ${st.fjOk===false?'delayed (via 15-min refresh)':'live · every 60s'}${st.fjAt?' · '+ago(st.fjAt/1000)+' ago':''}</span><span class="ok aj"><i></i>Al Jazeera · ~15 min${st.ajGen?' · updated '+ago(st.ajGen)+' ago':''}</span>`}
async function pollFJ(){if(Date.now()-(st.fjTry||0)<55000)return 0;st.fjTry=Date.now();try{const r=await fetch(FJ+'&_='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const x=new DOMParser().parseFromString(await r.text(),'text/xml');
  const L=[...x.querySelectorAll('item')].map(it=>{const g=it.querySelector('guid')?.textContent.trim(),d=Date.parse(it.querySelector('pubDate')?.textContent||'');
    return g&&d?{id:'fj'+g,s:'FJ',t:(it.querySelector('title')?.textContent||'').replace(/^FinancialJuice:\s*/,'').trim(),u:(it.querySelector('link')?.textContent||'').trim(),ts:d/1000|0}:null}).filter(Boolean);
  st.fjOk=true;st.fjAt=Date.now();return add(L,st.items.length>0)}catch(_){st.fjOk=false;return 0}}
async function pollAJ(){try{const r=await fetch('data/live.json?_='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const d=await r.json();st.ajGen=d.generated;
  const L=st.fjOk?d.items.filter(i=>i.s==='AJ'):d.items;return add(L,st.items.length>0)}catch(_){return 0}}
async function tick(which){const n=(which!=='aj'?await pollFJ():0)+(which!=='fj'?await pollAJ():0);
  if(st.open){if(n||!$('#squawk .sq'))render();else status()}else if(n){st.unread+=n;badge()}}
function badge(){const b=document.querySelector('.tb[data-tab="live"]');b&&b.classList.toggle('dot',st.unread>0)}
function start(){stop();st.open=true;st.unread=0;badge();render();tick();st.timers=[setInterval(()=>!document.hidden&&tick(),60000),setInterval(status,5000)]}
function stop(){st.open=false;st.timers.forEach(clearInterval);st.timers=[]}
document.addEventListener('nr-tab',e=>e.detail==='live'?start():stop());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&st.open)tick()});
document.addEventListener('click',e=>{const c=e.target.closest('.lchip[data-f]');if(c){st.f=c.dataset.f;document.querySelectorAll('.lchip').forEach(x=>x.classList.toggle('on',x===c));render()}
  const p=e.target.closest('#lvplay');if(p){p.outerHTML=`<iframe id="lvframe" src="https://www.youtube-nocookie.com/embed/live_stream?channel=${YT}&autoplay=1&playsinline=1&rel=0" title="Al Jazeera English live" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`}});
setTimeout(()=>tick(),2500); // one quiet warm-up fetch so the tab opens instantly (and the badge can light)
window.__live=st;
})();
