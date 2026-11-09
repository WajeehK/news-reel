// News Reel app v6
(function(){
const V=6, $=s=>document.querySelector(s), E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(_){return d}}, SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const {COL,LABEL,lum}=window.INTRO_META;const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOPICS=['all','legal','politics','war','election','markets','crypto','tech','sport','disaster','science','general'];
let D=LS('nr-cache',null), topic='all', tab='feed', saved=LS('nr-saved',{}), kws=LS('nr-kw',[]), aff=LS('nr-aff',{}), seen=new Set(LS('nr-seen',[]));
const ago=t=>{const s=Date.now()/1e3-t;return s<90?'Just now':s<3600?Math.round(s/60)+'m ago':s<86400?Math.round(s/3600)+'h ago':Math.round(s/86400)+'d ago'};
const hm=t=>new Date(t*1e3).toLocaleString('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});
const byId=id=>(D&&D.stories.find(s=>s.id===id))||saved[id];
const kwRx=()=>kws.length?new RegExp('\\b('+kws.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','i'):null;
const matches=s=>{const r=kwRx();return r&&r.test(s.title+' '+s.summary+' '+(s.ents||[]).join(' ')+' '+((s.me||{}).n||''))};
const vib=n=>{if(navigator.vibrate&&navigator.userActivation&&navigator.userActivation.hasBeenActive)try{navigator.vibrate(n)}catch(_){}};
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

const goodImg=s=>s.img&&!s.img_lo;
function logoI(e){if(e.mono){const h=e.c||'ffffff';return `<i style="-webkit-mask-image:url(${e.logo});mask-image:url(${e.logo});background:${lum(h)>.22?'#'+h:'#fff'}"></i>`}return `<span class="pn"><img src="${e.logo}" alt=""></span>`}
function badge(m){if(!m)return '';if(m.t==='person'&&m.face)return `<span class="badge round"><img src="${m.face}" alt=""></span>`;
  if(m.t==='country'&&m.cc)return `<span class="badge"><img src="assets/flags/${m.cc}.svg" alt=""></span>`;
  const e=m.logo?m:(m.org&&m.org.logo?m.org:null);if(!e)return '';return e.mono?`<span class="badge">${logoI(e)}</span>`:`<span class="badge pn"><img src="${e.logo}" alt=""></span>`}
function fallback(s){const m=s.me,c=COL[s.topic]||'#888';
  if(m&&m.t==='person'&&m.face)return `<div class="fill face" style="--c:#${m.c||'888'}"><img src="${m.face}" alt="" loading="lazy"></div>`;
  if(m&&m.t==='country'&&m.cc)return `<div class="fill flag"><img src="assets/flags/${m.cc}.svg" alt="" loading="lazy"></div>`;
  const e=m&&(m.logo?m:(m.org&&m.org.logo?m.org:null));
  if(e)return `<div class="fill" style="--c:#${e.c||m.c||'888'}"><div class="lt2">${logoI(e)}</div></div>`;
  if(m&&m.t!=='country')return `<div class="fill" style="--c:#${m.c||'888'}"><div class="lt2"><b>${E(m.n.split(/[ -]/).map(w=>w[0]).join('').slice(0,2))}</b></div></div>`;
  const k=s.topic==='markets'&&s.p&&s.p.dir==='down'?'marketsdn':(TH[s.topic]?s.topic:'general');
  return `<div class="fill" style="--c:${c}"><svg viewBox="0 0 100 100">${TH[k]}</svg></div>`}
window.nrFb=img=>{const s=byId(img.dataset.id);const m=img.closest('.media,.v-hero');if(s&&m)m.innerHTML=fallback(s)};
function media(s,cls){return `<div class="media ${cls||''}">${goodImg(s)?`<img class="ph" src="${E(s.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-id="${s.id}" onerror="nrFb(this)"><div class="shade"></div>${badge(s.me)}`:fallback(s)}</div>`}
function kick(s){return `<div class="kick" style="--c:${COL[s.topic]}">${s.brk?'<span class="bk">Breaking</span>':''}${E(LABEL[s.topic])}<span class="src">· ${E((s.srcs[0]||{}).src||'')}</span></div>`}
function meta(s){return `<div class="meta"><span>${ago(s.t)}</span><span>·</span><span>${s.n} source${s.n>1?'s':''}</span>${matches(s)?'<span class="bell">● Alert</span>':''}${window.NR6?NR6.mini(s):''}</div>`}
const hero=s=>`<div class="hero" data-id="${s.id}">${media(s)}${kick(s)}<h2>${E(s.title)}</h2>${s.summary?`<p>${E(s.summary)}</p>`:''}${meta(s)}</div>`;
const row=(s,i)=>`<div class="row" data-id="${s.id}" style="animation-delay:${Math.min(i||0,10)*25}ms">${i!=null&&i<0?'':''}<div class="tx">${kick(s)}<h3>${E(s.title)}</h3>${meta(s)}</div>${media(s)}</div>`;
function rank(list){return list.map(s=>({s,r:s.score*(1+(aff[s.topic]||0)*.04)*(matches(s)?3:1)*(seen.has(s.id)?.6:1)*(goodImg(s)?1.15:1)})).sort((a,b)=>b.r-a.r).map(x=>x.s)}
function renderChips(){const cnt={};(D?D.stories:[]).forEach(s=>cnt[s.topic]=(cnt[s.topic]||0)+1);
  $('#chips').innerHTML=TOPICS.filter(t=>t==='all'||cnt[t]).map(t=>`<button class="chip press${t===topic?' on':''}" data-t="${t}">${t==='all'?'All':`<i style="background:${COL[t]}"></i>${LABEL[t]}`}</button>`).join('')}
const today=()=>new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/London'});
let brkI=0,brkT=0;
function render(){
  if(!D)return;renderChips();$('#date').textContent=today();$('#recapdate').textContent=today();
  let L=rank(D.stories.filter(s=>topic==='all'||s.topic===topic));
  const h=L.find(goodImg)||L[0];
  $('#feed').innerHTML=L.length?hero(h)+L.filter(s=>s!==h).slice(0,80).map((s,i)=>row(s,i)).join(''):'<div class="empty">No stories here right now.</div>';
  const B=(D.breaking||[]).map(byId).filter(Boolean);$('#brk').hidden=!B.length;clearInterval(brkT);
  if(B.length){const set=()=>{const s=B[brkI%B.length];$('#btxt').textContent=s.title;$('#brk').dataset.id=s.id};set();
    brkT=setInterval(()=>{const t=$('#btxt');t.classList.add('sw');setTimeout(()=>{brkI++;set();t.classList.remove('sw')},350)},4500)}
  const R=(D.recap||[]).map(byId).filter(Boolean);
  $('#rail').innerHTML=R.map((s,i)=>`<div class="rb${seen.has(s.id)?' seen':''}" data-ri="${i}"><div class="ring"><div>${media(s)}</div></div><small>${E((s.me&&s.me.n)||LABEL[s.topic])}</small></div>`).join('');
  $('#recap').innerHTML=R.map((s,i)=>row(s,i).replace('<div class="tx">',`<span class="rn">${String(i+1).padStart(2,'0')}</span><div class="tx">`)).join('')||'<div class="empty">The recap builds through the day.</div>';
  $('#playall').innerHTML=`<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.5l9 5.5-9 5.5z" fill="currentColor"/></svg> Play all ${R.length}`;
  $('#recapsub').textContent=`${R.length} major and breaking stories from the last 24 hours.`;
  const SV=Object.values(saved).sort((a,b)=>b.savedAt-a.savedAt);
  $('#saved').innerHTML=SV.length?SV.map((s,i)=>row(s,i)).join(''):'<div class="empty">Tap the bookmark on any story to save it here.</div>';
  $('#kws').innerHTML=kws.map((k,i)=>`<button class="kw press" data-i="${i}">${E(k)}<b>✕</b></button>`).join('')||'<span class="fine">No alerts yet.</span>';
  const M=D.stories.filter(matches);$('#matches').innerHTML=M.length?M.map((s,i)=>row(s,i)).join(''):'<div class="empty">'+(kws.length?'Nothing matching right now.':'Add a keyword above.')+'</div>';
  $('#upd').textContent='Updated '+ago(D.generated).toLowerCase();
  $('#foot').innerHTML=`${D.stories.length} stories from BBC, Guardian, Reuters, AP, Sky News, NPR, Al Jazeera, CBS and more.<br>Refreshes about every 15 minutes.`;
  notifNote();
}
let loading=null;
async function load(){if(loading)return loading;loading=(async()=>{try{
  const r=await fetch('data/news.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const d=await r.json();
  const fresh=!D||d.generated!==D.generated;D=d;SS('nr-cache',d);if(fresh){render();checkAlerts()}document.dispatchEvent(new Event('nr-data'))}catch(_){if(D)render()}finally{loading=null}})();return loading}
// ---- story view ----
let cur=null;
async function openStory(id,{intro=true}={}){let s=byId(id);if(!s){await load();s=byId(id)}if(!s)return toast('That story has rolled off the feed.');
  seen.add(id);SS('nr-seen',[...seen].slice(-400));aff[s.topic]=Math.min(30,(aff[s.topic]||0)+1);SS('nr-aff',aff);
  if(intro)await playIntro(s,D);showView(s)}
function entCard(s){const m=s.me;if(!m)return '';const q=m.q||(m.org&&m.org.q);
  const role=m.role||({company:'Company',country:'Country',crypto:'Cryptocurrency',sport:'Sport',org:'Organisation',person:'Person'})[m.t];
  return `<div class="v-ent"><div class="media${m.t==='person'?' round':''}">${fallback({...s,img:null})}</div><div><b>${E(m.n)}</b><small>${E(role)}${m.tk&&m.t!=='crypto'?' · '+E(m.tk):''}</small></div>${q?`<div class="q ${q.ch>=0?'g':'r'}">${q.ch>=0?'▲':'▼'} ${Math.abs(q.ch).toFixed(2)}%<small style="display:block;color:var(--tx3)">${q.p>=1000?Math.round(q.p).toLocaleString('en-US'):q.p} ${E(q.cur||'')}</small></div>`:''}</div>`}
function showView(s){closeView(true);const v=document.createElement('div');v.className='view';v.style.setProperty('--c',COL[s.topic]);cur=v;
  const det=(s.details||[]).filter(Boolean);const ph=goodImg(s);
  v.innerHTML=`<div class="v-bar"><button class="v-btn press" data-x="back" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><span class="v-sp"></span>
  <button class="v-btn press" data-x="replay" aria-label="Replay intro"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg></button>
  <button class="v-btn press" data-x="share" aria-label="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/></svg></button>
  <button class="v-btn press${saved[s.id]?' on':''}" data-x="save" aria-label="Save"><svg viewBox="0 0 24 24" fill="${saved[s.id]?'currentColor':'none'}" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/></svg></button></div>
  <div class="v-body"><div class="v-hero">${ph?`<img class="ph" src="${E(s.img)}" alt="" referrerpolicy="no-referrer" data-id="${s.id}" onerror="nrFb(this)">`:fallback(s)}<div class="topshade"></div><div class="shade"></div></div>
  ${ph?`<div class="v-cred">Image: ${E((s.srcs.find(x=>!/google/i.test(x.src))||s.srcs[0]||{}).src||'')}</div>`:''}
  <div class="v-in">${kick(s)}<div class="v-h">${E(s.title)}</div><div class="v-meta"><span>${ago(s.t)}</span><span>·</span><span>${s.n} source${s.n>1?'s':''}</span><span>·</span><span>First seen ${hm(s.first)}</span></div>
  ${entCard(s)}
  ${s.summary?`<div class="v-sec"><div class="v-sum">${E(s.summary)}</div></div>`:''}
  ${det.length?`<div class="v-sec"><h4>Key details</h4><ul class="v-det">${det.map(d=>`<li>${E(d)}</li>`).join('')}</ul></div>`:''}
  ${(s.ents||[]).length?`<div class="v-sec"><h4>People &amp; places</h4><div class="ents">${s.ents.map(e=>`<span class="ent">${E(e)}</span>`).join('')}</div></div>`:''}
  ${(s.timeline||[]).length?`<div class="v-sec"><h4>Timeline</h4><div class="tl"><a><small>${hm(s.t)} · Now</small><span>${E(s.title)}</span></a>${s.timeline.map(t=>`<a href="${E(t.link)}" target="_blank" rel="noopener"><small>${hm(t.t)} · ${E(t.src)}</small><span>${E(t.title)}</span></a>`).join('')}</div></div>`:''}
  ${window.NR6?NR6.meter(s):''}
  <div class="v-sec srcs"><h4>Read the full story</h4>${(s.srcs||[]).map(x=>`<a href="${E(x.link)}" target="_blank" rel="noopener">${E(x.src)}<small>${ago(x.t)} ↗</small></a>`).join('')}</div></div></div>`;
  const body=v.querySelector('.v-body'),bar=v.querySelector('.v-bar');body.addEventListener('scroll',()=>bar.classList.toggle('sc',body.scrollTop>120),{passive:true});
  v.addEventListener('click',async e=>{const b=e.target.closest('[data-x]');if(!b)return;const x=b.dataset.x;
    if(x==='back'){location.hash?history.back():closeView()}
    if(x==='replay')playIntro(s,D);
    if(x==='save'){if(saved[s.id])delete saved[s.id];else saved[s.id]={...s,savedAt:Date.now()};SS('nr-saved',saved);b.classList.toggle('on');b.querySelector('svg').setAttribute('fill',saved[s.id]?'currentColor':'none');render();vib(8)}
    if(x==='share'){const url=(s.srcs[0]||{}).link||location.href;try{await navigator.share({title:s.title,url})}catch(_){try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(__){}}}});
  document.body.appendChild(v);if(location.hash!=='#s/'+s.id)history.pushState(null,'','#s/'+s.id)}
function closeView(instant){const v=cur;if(!v)return;cur=null;if(instant){v.remove();return}v.classList.add('out');setTimeout(()=>v.remove(),280)}
addEventListener('popstate',()=>{const m=location.hash.match(/^#s\/(\w+)/);if(m){if(!cur)openStory(m[1],{intro:false})}else closeView()});
// ---- recap player ----
async function playRecap(start){const L=(D.recap||[]).map(byId).filter(Boolean);if(!L.length)return;L.forEach(s=>seen.add(s.id));SS('nr-seen',[...seen].slice(-400));await playStories(L,D,start||0);render()}
$('#playall').onclick=()=>playRecap(0);
// ---- liquid-glass dock (spring physics, stretch while moving, drag to scrub) ----
const TABS=['feed','live','map','recap','alerts'],dock=$('#dock'),bub=$('#bubble'),tbs=[...document.querySelectorAll('.tb')];
function spring(o){const s={x:0,v:0,target:0,k:o.k,c:o.c,on:o.on,raf:0,set(t,instant){s.target=t;if(instant||RM){s.x=t;s.v=0;s.on(s.x,0);return}
  if(!s.raf){let last=performance.now();const f=now=>{const dt=Math.min(.032,(now-last)/1000);last=now;const a=-s.k*(s.x-s.target)-s.c*s.v;s.v+=a*dt;s.x+=s.v*dt;s.on(s.x,s.v);
  if(Math.abs(s.v)<2&&Math.abs(s.x-s.target)<.3){s.x=s.target;s.v=0;s.on(s.x,0);s.raf=0;return}s.raf=requestAnimationFrame(f)};s.raf=requestAnimationFrame(f)}}};return s}
let bw=0,press=1;
const slotX=i=>tbs[i].offsetLeft;
function paint(x,v){bub.style.opacity=TABS.includes(tab)?1:0;const st=RM?0:Math.min(.34,Math.abs(v)/2400);bub.style.transform=`translate3d(${x.toFixed(2)}px,0,0) scale(${((1+st)*press).toFixed(3)},${((1-st*.42)*press).toFixed(3)})`;
  const c=x+bw/2;tbs.forEach(b=>b.classList.toggle('on',TABS.includes(tab)&&c>=b.offsetLeft&&c<b.offsetLeft+b.offsetWidth))}
const bs=spring({k:380,c:26,on:paint});
function sizeBubble(){bw=tbs[0].offsetWidth;bub.style.width=bw+'px';bs.set(slotX(Math.max(0,TABS.indexOf(tab))),true)}
const rubber=x=>{const a=slotX(0),b=slotX(tbs.length-1);return x<a?a-Math.pow(a-x,.7):x>b?b+Math.pow(x-b,.7):x};
const nearest=x=>{let best=0,d=1e9;tbs.forEach((b,i)=>{const dd=Math.abs(b.offsetLeft-x);if(dd<d){d=dd;best=i}});return best};
function go(t){const prev=tab;tab=t;if(TABS.includes(t))bs.set(slotX(TABS.indexOf(t)));else paint(bs.x,0);document.body.dataset.tab=t;$('#hsav').classList.toggle('on',t==='saved');if(prev!==t){vib(6);document.querySelectorAll('[data-view]').forEach(el=>el.hidden=el.dataset.view!==t);scrollTo(0,0);document.dispatchEvent(new CustomEvent('nr-tab',{detail:t}))}}
let drag=null;
dock.addEventListener('pointerdown',e=>{dock.setPointerCapture(e.pointerId);const r=dock.getBoundingClientRect();drag={x0:e.clientX,left:r.left};press=1.08;dock.classList.add('drag');bs.set(rubber(e.clientX-r.left-bw/2))});
dock.addEventListener('pointermove',e=>{if(drag)bs.set(rubber(e.clientX-drag.left-bw/2))});
const endDrag=()=>{if(!drag)return;const i=nearest(bs.target);drag=null;press=1;dock.classList.remove('drag');go(TABS[i])};
dock.addEventListener('pointerup',endDrag);dock.addEventListener('pointercancel',endDrag);
addEventListener('resize',sizeBubble);window.__dock={go,bs};
window.__nr={D:()=>D,openStory:id=>openStory(id),go,kws:()=>kws};
$('#hsav').onclick=()=>go(tab==='saved'?'feed':'saved');
addEventListener('scroll',()=>$('#top').classList.toggle('sc',scrollY>8),{passive:true});
// ---- clicks ----
document.addEventListener('click',e=>{if(e.target.closest('.view,.intro,.player'))return;
  const c=e.target.closest('.hero[data-id],.row[data-id],.brk[data-id]');if(c){openStory(c.dataset.id);return}
  const rb=e.target.closest('.rb[data-ri]');if(rb){playRecap(+rb.dataset.ri);return}
  const ch=e.target.closest('.chip[data-t]');if(ch){topic=ch.dataset.t;render();scrollTo({top:0,behavior:'smooth'});ch.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'})}
  const k=e.target.closest('.kw[data-i]');if(k){kws.splice(+k.dataset.i,1);SS('nr-kw',kws);render();document.dispatchEvent(new Event('nr-kw'))}});
$('#credbtn').onclick=async()=>{const el=$('#credits');if(!el.hidden){el.hidden=true;return}try{const c=await (await fetch('assets/faces/credits.json')).json();
  el.innerHTML=Object.values(c).map(x=>`<div>${E(x.title)}: ${x.file?`<a href="${E(x.file)}" target="_blank" rel="noopener">${E(x.artist||'Wikimedia Commons')}</a>`:'Wikimedia Commons'}${x.license?' · '+E(x.license):''}</div>`).join('');el.hidden=false}catch(_){}};
$('#kwform').onsubmit=e=>{e.preventDefault();const v=$('#kwin').value.trim();if(v&&!kws.some(k=>k.toLowerCase()===v.toLowerCase())){kws.push(v);SS('nr-kw',kws);
  const al=LS('nr-alerted',[]);D&&D.stories.filter(matches).forEach(s=>al.push(s.id));SS('nr-alerted',al.slice(-500))}$('#kwin').value='';render();document.dispatchEvent(new Event('nr-kw'))};
// ---- alerts ----
function toast(msg,id){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);if(id)t.onclick=()=>{t.remove();openStory(id)};setTimeout(()=>t.remove(),5000)}
async function checkAlerts(){if(!kws.length||!D)return;const al=new Set(LS('nr-alerted',[]));const fresh=D.stories.filter(s=>matches(s)&&!al.has(s.id));if(!fresh.length)return;
  fresh.forEach(s=>al.add(s.id));SS('nr-alerted',[...al].slice(-500));const s=fresh[0];const k=(kwRx().exec(s.title+' '+s.summary+' '+s.ents.join(' ')+' '+((s.me||{}).n||''))||[])[1]||'';
  if(!(window.NR6&&NR6.pushOn())&&'Notification' in window&&Notification.permission==='granted'&&navigator.serviceWorker){const reg=await navigator.serviceWorker.ready;
    for(const x of fresh.slice(0,3))reg.showNotification('🔔 '+(k||'News Reel'),{body:x.title,tag:x.id,icon:'icon-192.png',badge:'icon-192.png',data:{url:'./#s/'+x.id}})}
  else toast('🔔 '+k+': '+s.title,s.id)}
function notifNote(){return;const n=$('#notifnote'),b=$('#notif');const ok='Notification' in window;b.hidden=!ok||Notification.permission==='granted';
  n.textContent=!ok?'On iPhone, add News Reel to your Home Screen to allow notifications.':Notification.permission==='granted'?'Notifications are on. You\u2019ll be alerted about new matching stories whenever the app refreshes.':Notification.permission==='denied'?'Notifications are blocked in Settings.':'Get a notification when a new story matches your alerts.'}
$('#notif').onclick=async()=>{try{await Notification.requestPermission()}catch(_){}notifNote()};
// ---- boot ----
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js?v='+V).catch(()=>{});
navigator.serviceWorker&&navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='pushed'){(window.__pushes=window.__pushes||[]).push(e.data.d)}if(e.data&&e.data.type==='open'){const u=String(e.data.url);const m=u.match(/#s\/(\w+)/);if(m)openStory(m[1]);else if(/#brief/.test(u))NR6.focusBrief()}});
const t0=Date.now();render();sizeBubble();
load().then(async()=>{await new Promise(r=>setTimeout(r,Math.max(0,900-(Date.now()-t0))));$('#boot').classList.add('hide');setTimeout(()=>$('#boot').remove(),500);
  const m=location.hash.match(/^#s\/(\w+)/);if(m)openStory(m[1]);else if(location.hash==='#brief'){history.replaceState(null,'',location.pathname);NR6.focusBrief()}});
setInterval(()=>{if(!document.hidden)load()},120000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
setInterval(()=>{if(D)$('#upd').textContent='Updated '+ago(D.generated).toLowerCase()},30000);
})();
