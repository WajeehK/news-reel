// News Reel app
(function(){
const V=2, $=s=>document.querySelector(s), E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(_){return d}}, SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const {COL,LABEL}=window.INTRO_META;
const TOPICS=['all','legal','politics','war','election','markets','crypto','tech','sport','disaster','science','general'];
let D=LS('nr-cache',null), topic='all', tab='feed', saved=LS('nr-saved',{}), kws=LS('nr-kw',[]), aff=LS('nr-aff',{}), seen=new Set(LS('nr-seen',[]));
const ago=t=>{const s=Date.now()/1e3-t;return s<90?'just now':s<3600?Math.round(s/60)+'m ago':s<86400?Math.round(s/3600)+'h ago':Math.round(s/86400)+'d ago'};
const hm=t=>new Date(t*1e3).toLocaleString('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit'});
const byId=id=>D&&D.stories.find(s=>s.id===id);
const kwRx=()=>kws.length?new RegExp('\\b('+kws.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','i'):null;
const matches=s=>{const r=kwRx();return r&&r.test(s.title+' '+s.summary+' '+(s.ents||[]).join(' '))};
// ---- mini animated thumbnails (SVG) ----
const TH={
 legal:`<path class="a-dr" d="M20 78h60M28 70h44M34 70V46M44 70V46M56 70V46M66 70V46M26 46h48L50 30z" stroke="#e8d9b0" stroke-width="2.4" fill="none"/><g class="a-sw"><rect x="56" y="34" width="26" height="12" rx="3" fill="#c79a5b"/><rect x="66" y="44" width="5" height="26" rx="2" fill="#9b6b34"/></g>`,
 war:`<circle cx="50" cy="50" r="34" stroke="rgba(255,90,80,.4)" fill="none"/><circle cx="50" cy="50" r="20" stroke="rgba(255,90,80,.3)" fill="none"/><path class="a-sp2" d="M50 50L50 16A34 34 0 0 1 80 36z" fill="rgba(255,69,58,.35)"/><circle class="a-bl" cx="62" cy="40" r="4" fill="#ff3b30"/><circle class="a-bl" style="animation-delay:.4s" cx="38" cy="60" r="3" fill="#ff3b30"/>`,
 markets:`<path class="a-dr" d="M12 72L28 60L40 66L54 44L66 50L88 24" stroke="#30d158" stroke-width="3.5" fill="none" stroke-linejoin="round"/><path d="M80 24h8v8" stroke="#30d158" stroke-width="3.5" fill="none"/>`,
 marketsdn:`<path class="a-dr" d="M12 28L28 40L40 34L54 56L66 50L88 76" stroke="#ff453a" stroke-width="3.5" fill="none" stroke-linejoin="round"/><path d="M80 76h8v-8" stroke="#ff453a" stroke-width="3.5" fill="none"/>`,
 crypto:`<g class="a-cy"><circle cx="50" cy="50" r="24" fill="#f7931a" stroke="#ffc163" stroke-width="3"/><text x="50" y="61" text-anchor="middle" font-size="30" font-weight="900" fill="#fff" font-family="system-ui">₿</text></g>`,
 election:`<rect class="a-pu" x="24" y="40" width="14" height="36" rx="2" fill="#0a84ff"/><rect x="43" y="52" width="14" height="24" rx="2" fill="#ff453a"/><rect x="62" y="30" width="14" height="46" rx="2" fill="#5ac8fa" class="a-bo"/>`,
 tech:`<rect x="34" y="34" width="32" height="32" rx="6" stroke="#64d2ff" stroke-width="2.4" fill="#04121a"/><rect class="a-pu" x="42" y="42" width="16" height="16" rx="3" fill="#64d2ff"/><path class="a-dr" d="M50 10v24M50 66v24M10 50h24M66 50h24" stroke="#64d2ff" stroke-width="2"/>`,
 sport:`<g class="a-bo"><circle cx="50" cy="46" r="18" fill="#e7e9ea"/><path d="M50 36l8 6-3 9h-10l-3-9z" fill="#222"/></g><ellipse cx="50" cy="82" rx="18" ry="4" fill="rgba(48,209,88,.4)"/>`,
 disaster:`<path class="a-bl" d="M50 18L84 78H16z" fill="none" stroke="#ff9f0a" stroke-width="4" stroke-linejoin="round"/><path d="M50 40v18M50 66v3" stroke="#ff9f0a" stroke-width="5" stroke-linecap="round"/>`,
 science:`<circle cx="50" cy="50" r="10" fill="#bf5af2"/><g class="a-sp"><ellipse cx="50" cy="50" rx="34" ry="12" stroke="#e1beff" fill="none" stroke-width="1.6"/><circle cx="84" cy="50" r="3.5" fill="#fff"/></g><g class="a-sp" style="animation-duration:4s"><ellipse cx="50" cy="50" rx="12" ry="34" stroke="#e1beff" fill="none" stroke-width="1.2" opacity=".6"/></g>`,
 politics:`<path d="M22 34h56L50 20z" fill="#5b5e78"/><path d="M28 38v34M40 38v34M52 38v34M64 38v34M74 38v34" stroke="#7d7aff" stroke-width="4"/><path d="M18 76h64" stroke="#7d7aff" stroke-width="4"/><circle class="a-bl" cx="50" cy="28" r="2.5" fill="#fff"/>`,
 general:`<circle cx="50" cy="50" r="28" fill="none" stroke="#e7e9ea" stroke-width="2"/><g class="a-cy"><ellipse cx="50" cy="50" rx="12" ry="28" fill="none" stroke="#e7e9ea" stroke-width="1.4" opacity=".6"/></g><path d="M22 50h56M26 36h48M26 64h48" stroke="#e7e9ea" stroke-width="1" opacity=".4"/>`
};
function thumb(s,photo){const k=s.topic==='markets'&&s.p&&s.p.dir==='down'?'marketsdn':(TH[s.topic]?s.topic:'general');
  return `<div class="th" style="--c:${COL[s.topic]||'#888'}">${photo&&s.img?`<img class="ph" loading="lazy" src="${E(s.img)}" alt="" onerror="this.remove()">`:''}<svg viewBox="0 0 100 100">${TH[k]}</svg></div>`}
function card(s,hero){const m=matches(s);
  return `<div class="card${hero?' hero':''}" data-id="${s.id}" style="--c:${COL[s.topic]}">${m?'<span class="bell">🔔</span>':''}${thumb(s,hero)}
  <div class="cb">${hero?'<div style="height:8px"></div>':''}<div class="cm" style="margin:0 0 5px">${s.brk?'<span class="bk">BREAKING</span>':''}<span class="tag">${E(LABEL[s.topic])}</span></div>
  <div class="ct">${E(s.title)}</div><div class="cm"><span>${ago(s.t)}</span><span>·</span><span>${s.n} source${s.n>1?'s':''}</span>${s.timeline&&s.timeline.length?'<span>· ⏱ '+s.timeline.length+' earlier</span>':''}</div></div></div>`}
function rank(list){const now=Date.now()/1e3;return list.map(s=>({s,r:s.score*(1+(aff[s.topic]||0)*.04)*(matches(s)?3:1)*(seen.has(s.id)?.6:1)})).sort((a,b)=>b.r-a.r).map(x=>x.s)}
function renderChips(){const cnt={};(D?D.stories:[]).forEach(s=>cnt[s.topic]=(cnt[s.topic]||0)+1);
  $('#chips').innerHTML=TOPICS.filter(t=>t==='all'||cnt[t]).map(t=>`<button class="chip press${t===topic?' on':''}" data-t="${t}">${t==='all'?'For You':`<i style="background:${COL[t]}"></i>${LABEL[t]}`}</button>`).join('')}
function render(){
  if(!D)return;renderChips();
  let L=D.stories.filter(s=>topic==='all'||s.topic===topic);L=rank(L);
  $('#feed').innerHTML=L.length?L.slice(0,80).map((s,i)=>card(s,i===0)).join(''):'<div class="empty">No stories here right now.</div>';
  const B=(D.breaking||[]).map(byId).filter(Boolean);$('#brk').hidden=!B.length;
  const items=B.map(s=>`<a data-id="${s.id}">${E(s.title)}</a>`).join('');$('#btrack').innerHTML=items+items;
  const R=(D.recap||[]).map(byId).filter(Boolean);
  $('#recap').innerHTML=R.map((s,i)=>`<div class="rc"><div class="rn">${i+1}</div><div style="flex:1;min-width:0">${card(s)}</div></div>`).join('')||'<div class="empty">Recap builds through the day.</div>';
  $('#recapsub').textContent='The five biggest stories of the last 24 hours · '+new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const SV=Object.values(saved).sort((a,b)=>b.savedAt-a.savedAt);
  $('#saved').innerHTML=SV.length?SV.map(s=>card(s)).join(''):'<div class="empty">Tap the bookmark on any story to save it here.</div>';
  $('#kws').innerHTML=kws.map((k,i)=>`<button class="kw press" data-i="${i}">${E(k)}<b>✕</b></button>`).join('')||'<span class="fine">No alerts yet.</span>';
  const M=D.stories.filter(matches);$('#matches').innerHTML=M.length?M.map(s=>card(s)).join(''):'<div class="empty">'+(kws.length?'Nothing matching right now.':'Add a keyword above.')+'</div>';
  $('#upd').textContent='Updated '+ago(D.generated);
  $('#foot').innerHTML=`${D.stories.length} stories · BBC, Guardian, Reuters, AP, Sky, NPR, Al Jazeera, CBS & more · refreshes every ~15 min`;
  notifNote();
}
// ---- data ----
let loading=null;
async function load(){if(loading)return loading;loading=(async()=>{try{
  const r=await fetch('data/news.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const d=await r.json();
  const fresh=!D||d.generated!==D.generated;D=d;SS('nr-cache',d);if(fresh){render();checkAlerts()}}catch(_){if(D)render()}finally{loading=null}})();return loading}
// ---- story view ----
let cur=null;
async function openStory(id,{intro=true}={}){let s=byId(id)||saved[id];if(!s){await load();s=byId(id)||saved[id]}if(!s)return toast('That story has rolled off the feed.');
  seen.add(id);SS('nr-seen',[...seen].slice(-400));aff[s.topic]=Math.min(30,(aff[s.topic]||0)+1);SS('nr-aff',aff);
  if(intro)await playIntro(s,D);showView(s)}
function showView(s){closeView(true);const v=document.createElement('div');v.className='view';v.style.setProperty('--c',COL[s.topic]);cur=v;
  const det=(s.details||[]).filter(Boolean);
  v.innerHTML=`<div class="v-bar"><button class="v-btn press" data-x="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><span class="tag">${E(LABEL[s.topic])}</span><span class="v-sp"></span>
  <button class="v-btn press" data-x="replay" title="Replay intro">↻</button><button class="v-btn press" data-x="share" title="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/></svg></button>
  <button class="v-btn press${saved[s.id]?' on':''}" data-x="save" title="Save"><svg viewBox="0 0 24 24" fill="${saved[s.id]?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button></div>
  <div class="v-body"><div class="v-hero">${thumb(s,true)}</div><div class="v-in">
  <div class="cm" style="margin:0">${s.brk?'<span class="bk">BREAKING</span>':''}<span>${ago(s.t)}</span><span>·</span><span>${s.n} source${s.n>1?'s':''}</span><span>·</span><span>first seen ${hm(s.first)}</span></div>
  <div class="v-h">${E(s.title)}</div>${s.summary?`<div class="v-sum">${E(s.summary)}</div>`:''}
  ${det.length?`<div class="v-sec"><h3>Key details</h3><ul class="v-det" style="margin:0">${det.map(d=>`<li>${E(d)}</li>`).join('')}</ul></div>`:''}
  ${(s.ents||[]).length?`<div class="v-sec"><h3>People & places</h3><div class="ents">${s.ents.map(e=>`<span class="ent">${E(e)}</span>`).join('')}</div></div>`:''}
  ${(s.timeline||[]).length?`<div class="v-sec"><h3>Timeline</h3><div class="tl"><a><small>${hm(s.t)} · NOW</small><span>${E(s.title)}</span></a>${s.timeline.map(t=>`<a href="${E(t.link)}" target="_blank" rel="noopener"><small>${hm(t.t)} · ${E(t.src)}</small><span>${E(t.title)}</span></a>`).join('')}</div></div>`:''}
  <div class="v-sec srcs"><h3>Sources</h3>${(s.srcs||[]).map(x=>`<a href="${E(x.link)}" target="_blank" rel="noopener">${E(x.src)}<small>${ago(x.t)} ↗</small></a>`).join('')}</div></div></div>`;
  v.addEventListener('click',async e=>{const b=e.target.closest('[data-x]');if(!b)return;const x=b.dataset.x;
    if(x==='back'){history.length>1&&location.hash?history.back():closeView()}
    if(x==='replay')playIntro(s,D);
    if(x==='save'){if(saved[s.id])delete saved[s.id];else saved[s.id]={...s,savedAt:Date.now()};SS('nr-saved',saved);b.classList.toggle('on');b.querySelector('svg').setAttribute('fill',saved[s.id]?'currentColor':'none');render()}
    if(x==='share'){const url=location.origin+location.pathname+'#s/'+s.id;try{await navigator.share({title:s.title,url:(s.srcs[0]||{}).link||url})}catch(_){try{await navigator.clipboard.writeText((s.srcs[0]||{}).link||url);toast('Link copied')}catch(__){}}}});
  document.body.appendChild(v);if(location.hash!=='#s/'+s.id)history.pushState(null,'','#s/'+s.id)}
function closeView(instant){const v=cur;if(!v)return;cur=null;if(instant){v.remove();return}v.classList.add('out');setTimeout(()=>v.remove(),300)}
addEventListener('popstate',()=>{const m=location.hash.match(/^#s\/(\w+)/);if(m){if(!cur)openStory(m[1],{intro:false})}else closeView()});
// ---- play-all recap ----
$('#playall').onclick=async()=>{for(const id of (D.recap||[])){const s=byId(id);if(!s)continue;await playIntro(s,D,{dur:3400})}const f=byId((D.recap||[])[0]);f&&showView(f)};
// ---- tabs ----
function setTab(t){tab=t;document.querySelectorAll('[data-view]').forEach(el=>el.hidden=el.dataset.view!==t);
  const bs=[...document.querySelectorAll('.tb')],i=bs.findIndex(b=>b.dataset.tab===t);bs.forEach((b,j)=>b.classList.toggle('on',j===i));
  const bub=$('#bubble'),w=bs[0].offsetWidth;bub.style.width=w+'px';bub.style.transform=`translateX(${i*w}px)`;scrollTo(0,0);if(navigator.vibrate)navigator.vibrate(8)}
$('#dock').addEventListener('click',e=>{const b=e.target.closest('.tb');b&&setTab(b.dataset.tab)});
addEventListener('resize',()=>setTab(tab));
document.addEventListener('click',e=>{const c=e.target.closest('.card[data-id],.btrack a[data-id]');if(c&&!e.target.closest('.view')){e.preventDefault();openStory(c.dataset.id)}
  const ch=e.target.closest('.chip[data-t]');if(ch){topic=ch.dataset.t;render();scrollTo({top:0,behavior:'smooth'})}
  const k=e.target.closest('.kw[data-i]');if(k){kws.splice(+k.dataset.i,1);SS('nr-kw',kws);render()}});
$('#kwform').onsubmit=e=>{e.preventDefault();const v=$('#kwin').value.trim();if(v&&!kws.some(k=>k.toLowerCase()===v.toLowerCase())){kws.push(v);SS('nr-kw',kws);
  // mark currently matching as already alerted so we only alert on new ones
  const al=LS('nr-alerted',[]);D&&D.stories.filter(matches).forEach(s=>al.push(s.id));SS('nr-alerted',al.slice(-500))}$('#kwin').value='';render()};
// ---- alerts ----
function toast(msg,id){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);if(id)t.onclick=()=>{t.remove();openStory(id)};setTimeout(()=>t.remove(),5000)}
async function checkAlerts(){if(!kws.length||!D)return;const al=new Set(LS('nr-alerted',[]));const fresh=D.stories.filter(s=>matches(s)&&!al.has(s.id));if(!fresh.length)return;
  fresh.forEach(s=>al.add(s.id));SS('nr-alerted',[...al].slice(-500));const s=fresh[0];const k=(kwRx().exec(s.title+' '+s.summary+' '+s.ents.join(' '))||[])[1]||'';
  if('Notification' in window&&Notification.permission==='granted'&&navigator.serviceWorker){const reg=await navigator.serviceWorker.ready;
    for(const x of fresh.slice(0,3))reg.showNotification('🔔 '+(k||'News Reel'),{body:x.title,tag:x.id,icon:'icon-192.png',badge:'icon-192.png',data:{url:'./#s/'+x.id}})}
  else toast('🔔 '+k+': '+s.title,s.id)}
function notifNote(){const n=$('#notifnote'),b=$('#notif');const ok='Notification' in window;
  b.hidden=!ok||Notification.permission==='granted';
  n.textContent=!ok?'On iPhone, add News Reel to your Home Screen to allow notifications.':Notification.permission==='granted'?'Notifications are on. You\u2019ll be alerted about new matching stories whenever the app refreshes (open or recently used).':Notification.permission==='denied'?'Notifications are blocked in settings.':'Get a notification when a new story matches your alerts.'}
$('#notif').onclick=async()=>{try{await Notification.requestPermission()}catch(_){}notifNote()};
// ---- boot ----
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js?v='+V).catch(()=>{});
navigator.serviceWorker&&navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='open'){const m=String(e.data.url).match(/#s\/(\w+)/);m&&openStory(m[1])}});
const t0=Date.now();render();setTab('feed');
load().then(async()=>{await new Promise(r=>setTimeout(r,Math.max(0,900-(Date.now()-t0))));$('#boot').classList.add('hide');setTimeout(()=>$('#boot').remove(),500);
  const m=location.hash.match(/^#s\/(\w+)/);if(m)openStory(m[1])});
setInterval(()=>{if(!document.hidden)load()},120000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
setInterval(()=>{if(D)$('#upd').textContent='Updated '+ago(D.generated)},30000);
})();
