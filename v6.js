// News Reel v6: coverage/bias meter, market strip, economic calendar, morning briefing (speech), world map, Web Push registration.
// Everything runs on-device or from free keyless sources. No AI, no accounts.
(function(){
const $=s=>document.querySelector(s),E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(_){return d}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const NR6=window.NR6={};const nr=()=>window.__nr||{};const D=()=>(nr().D&&nr().D())||null;
const LON={timeZone:'Europe/London'};const hhmm=ts=>new Date(ts*1000).toLocaleTimeString('en-GB',{...LON,hour:'2-digit',minute:'2-digit'});
const dayKey=ts=>new Date(ts*1000).toLocaleDateString('en-CA',LON);

// ================= 6. coverage & lean meter =================
// Approximate outlet lean, -2 left … +2 right, loosely following public AllSides / Ad Fontes style charts. Unrated outlets are ignored.
const LEAN={'guardian':-1,'npr':-1,'cbs news':-1,'nbc news':-1,'abc news':-1,'cnn':-1,'new york times':-1,'washington post':-1,'al jazeera':-1,'politico':-1,'independent':-1,'axios':-1,
 'bloomberg':-0.5,'time':-1,'the verge':-1,'mashable':-1,'vox':-2,'huffpost':-2,'msnbc':-2,'mirror':-2,'new statesman':-2,'the intercept':-2,'mother jones':-2,'vice':-1,'the atlantic':-1,'los angeles times':-1,'seattle times':-0.5,'evening standard':0,'london evening standard':0,
 'bbc':0,'bbc sport':0,'reuters':0,'ap news':-0.5,'associated press':-0.5,'sky news':0,'sky sports':0,'the hill':0,'cnbc':0,'forbes':0,'fortune':0,'yahoo finance':0,'yahoo news':0,"barron's":0,'financial times':0,'ft':0,'economist':-0.5,'wsj':0.5,'wall street journal':0.5,'newsweek':0,'deccan herald':0,'techcrunch':0,'investing.com':0,'benzinga':0,'seeking alpha':0,'marketwatch':0,'business insider':0,'usa today':-0.5,'france 24':0,'dw':0,'euronews':0,'the times':1,'times':1,
 'telegraph':1,'daily mail':1.5,'new york post':1.5,'washington examiner':1.5,'washington times':1.5,'spectator':1.5,'fox business':1,'national review':2,'gb news':2,'express':1.5,'the sun':1.5,'fox news':2,'breitbart':2,'daily wire':2,'the federalist':2,'newsmax':2,'daily caller':2,'the blaze':2,'epoch times':1,'washington free beacon':2,'reason':1,'the dispatch':1};
const nrm=n=>String(n||'').toLowerCase().replace(/^the\s+/,'').replace(/\.com$/,'').trim();
const lean=n=>{const k=nrm(n);return k in LEAN?LEAN[k]:('the '+k) in LEAN?LEAN['the '+k]:null};
NR6.coverage=s=>{const c={L:[],C:[],R:[],U:[]},seen=new Set();for(const x of s.srcs||[]){if(seen.has(x.src))continue;seen.add(x.src);const v=lean(x.src);(v==null?c.U:v<=-1?c.L:v>=1?c.R:c.C).push(x.src)}
  c.rated=c.L.length+c.C.length+c.R.length;c.blind=c.rated>=2&&!c.C.length&&(!c.L.length||!c.R.length)?(c.L.length?'right':'left'):null;return c};
const bar=(c,h)=>{const t=c.rated||1;return `<span class="lbar" style="height:${h}px"><i class="L" style="flex:${c.L.length/t}"></i><i class="C" style="flex:${c.C.length/t}"></i><i class="R" style="flex:${c.R.length/t}"></i></span>`};
NR6.mini=s=>{const c=NR6.coverage(s);if(!c.rated)return '';return `${bar(c,4)}${c.blind?'<span class="blind">Blindspot</span>':''}`};
NR6.meter=s=>{const c=NR6.coverage(s);const all=[...c.L.map(n=>[n,'L']),...c.C.map(n=>[n,'C']),...c.R.map(n=>[n,'R']),...c.U.map(n=>[n,'U'])];
  return `<div class="v-sec"><h4>Coverage &amp; lean</h4>${c.rated?`<div class="meter">${bar(c,8)}<div class="mlab"><span class="L">Left ${c.L.length}</span><span class="C">Centre ${c.C.length}</span><span class="R">Right ${c.R.length}</span></div></div>`:'<p class="fine">No rated outlets on this story yet.</p>'}
  ${c.blind?`<div class="blindbox"><b>Blindspot</b> Only ${c.blind==='right'?'left-leaning':'right-leaning'} outlets in our sources are covering this so far.</div>`:''}
  <div class="outs">${all.map(([n,k])=>`<span class="out ${k}"><i></i>${E(n)}</span>`).join('')}</div>
  <p class="fine">Lean ratings are approximate, loosely based on public AllSides / Ad Fontes style media-bias charts. Our feed leans on BBC, Reuters, AP, Guardian and similar, so right-leaning coverage is under-represented overall.</p></div>`};

// ================= 2. market strip =================
let btc=null;
async function pollBTC(){try{const r=await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json();btc={p:+j.lastPrice,ch:+j.priceChangePercent,at:Date.now()/1000|0};renderStrip()}catch(_){}}
const fmt=(p,k)=>p>=1000?Math.round(p).toLocaleString('en-US'):p.toFixed(2);
function renderStrip(){const d=D();const M=(d&&d.mkt)||[];if(!M.length&&!btc)return;const now=Date.now()/1000;
  const cells=M.map(m=>m.k==='BTC-USD'&&btc?{...m,p:btc.p,ch:btc.ch,live:1}:m).map(m=>{const age=now-(m.at||d.generated);
    const st=m.live?'<em class="lv">Live</em>':age>3*3600?'<em>Closed</em>':`<em>Delayed · ${hhmm(m.at||d.generated)}</em>`;
    return `<div class="mk ${m.ch>=0?'g':'r'}"><span class="mn">${E(m.n)}</span><b>${fmt(m.p)}</b><span class="mc">${m.ch>=0?'▲':'▼'} ${Math.abs(m.ch).toFixed(2)}%</span>${st}</div>`}).join('');
  document.querySelectorAll('.mkts').forEach(el=>el.innerHTML=cells);renderBrief(true)}
NR6.mkt=()=>{const d=D();return ((d&&d.mkt)||[]).map(m=>m.k==='BTC-USD'&&btc?{...m,p:btc.p,ch:btc.ch}:m)};

// ================= 4. economic calendar =================
let CAL=LS('nr-cal',[]);
const CCY={USD:['us','US','us'],GBP:['gb','UK','uk'],EUR:['eu','EZ','ez|eu|euro|eurozone|german|germany'],JPY:['jp','Japan','jp|japan'],CAD:['ca','Canada','ca|canada'],AUD:['au','Australia','au|australia'],NZD:['nz','NZ','nz|new zealand'],CHF:['ch','Swiss','ch|swiss'],CNY:['cn','China','cn|china']};
const ntok=t=>new Set((t.toLowerCase().replace(/m\/m/g,'mom').replace(/y\/y/g,'yoy').replace(/q\/q/g,'qoq').replace(/\((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\)|[()]/g,' ').match(/[a-z0-9]+/g)||[]).filter(w=>!['the','of','and','sa','nsa','prel','prelim','final','flash','adv'].includes(w)));
function liveActual(e){const L=(window.__live&&window.__live.items)||[];const want=ntok(e.title),cc=(CCY[e.ccy]||[0,0,e.ccy.toLowerCase()])[2];
  for(const it of L){if(it.s!=='FJ'||it.ts<e.ts-120||it.ts>e.ts+4*3600)continue;const m=it.t.match(/^(.*?)\s+Actual\s+([^\s(]+)/);if(!m)continue;const name=m[1].toLowerCase();
    if(!new RegExp('^(?:'+cc+')\\b').test(name))continue;const have=ntok(name);if([...want].every(w=>have.has(w))&&want.has('core')===have.has('core'))return m[2]}return null}
async function loadCal(){try{const r=await fetch('data/calendar.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;CAL=(await r.json()).events;SS('nr-cal',CAL)}catch(_){}renderCal();renderBrief(true)}
const cd=s=>{if(s<=0)return 'now';const d=s/86400|0,h=s%86400/3600|0,m=s%3600/60|0,ss=s%60|0;return d?`${d}d ${h}h`:h?`${h}h ${String(m).padStart(2,'0')}m`:`${m}m ${String(ss).padStart(2,'0')}s`};
function calRow(e,now){const c=CCY[e.ccy]||[null,e.ccy];const act=e.act||(e.ts<=now?liveActual(e):null);const past=e.ts<=now;
  const when=new Date(e.ts*1000).toLocaleString('en-GB',{...LON,weekday:'short',hour:'2-digit',minute:'2-digit'});
  return `<div class="ev${past?' past':''}${e.imp==='H'?' hi':''}" data-ts="${e.ts}">${c[0]?`<img class="evf" src="assets/flags/${c[0]}.svg" alt="">`:''}<div class="evt"><b>${E(c[1])} ${E(e.title)}</b><small>${when} UK${e.imp==='H'?' · <span class="hiimp">High impact</span>':''}</small>
   ${act||e.fc||e.pr?`<div class="afp">${act?`<span class="a">Actual <b>${E(act)}</b></span>`:''}${e.fc?`<span>Fcst ${E(e.fc)}</span>`:''}${e.pr?`<span>Prev ${E(e.pr)}</span>`:''}</div>`:''}</div>
   <div class="evc">${past?(act?'<span class="done">Out</span>':now-e.ts<5400?'<span class="due">Due</span>':'<span class="done">Done</span>'):`<span class="cnt">${cd(e.ts-now)}</span>`}</div></div>`}
function renderCal(){const el=$('#cal');if(!el)return;const now=Date.now()/1000|0;
  const L=CAL.filter(e=>e.ts>now-6*3600);const up=L.filter(e=>e.ts>now);const show=calOpen?L:L.filter(e=>e.ts>now-3*3600).slice(0,5);
  el.innerHTML=show.length?show.map(e=>calRow(e,now)).join('')+(L.length>show.length||calOpen?`<button class="calmore press" id="calmore">${calOpen?'Show less':'Full week · '+L.length+' events'}</button>`:''):'<div class="empty" style="padding:20px">No high-impact events left this week.</div>';
  const nx=up[0];$('#calnext')&&($('#calnext').textContent=nx?`Next: ${(CCY[nx.ccy]||[0,nx.ccy])[1]} ${nx.title} in ${cd(nx.ts-now)}`:'')}
let calOpen=false;document.addEventListener('click',e=>{if(e.target.closest('#calmore')){calOpen=!calOpen;renderCal()}});
setInterval(()=>{if(document.hidden)return;if(curTab==='live')renderCal()},1000);
setInterval(()=>{if(!document.hidden&&curTab!=='live')renderCal()},30000);

// ================= 5. briefing card + speech =================
const part=()=>{const h=+new Date().toLocaleString('en-GB',{...LON,hour:'2-digit',hour12:false});return h<12?'morning':h<17?'afternoon':'evening'};
function briefData(){const d=D();if(!d)return null;const by=id=>d.stories.find(s=>s.id===id);
  const ok=s=>s&&s.n>=2&&!/live price|price history|price chart|price today|live updates?:? ?$/i.test(s.title);let top=(d.recap||[]).map(by).filter(ok).slice(0,3);if(top.length<3)top=[...top,...[...d.stories].filter(ok).sort((a,b)=>(b.brk*6+b.n*2+b.score)-(a.brk*6+a.n*2+a.score)).filter(s=>!top.includes(s))].slice(0,3);
  const today=dayKey(Date.now()/1000);const ev=CAL.filter(e=>dayKey(e.ts)===today);return {top,mk:NR6.mkt(),ev}}
let briefSig='';
function renderBrief(soft){const el=$('#brief');const b=briefData();if(!el||!b)return;const sig=b.top.map(s=>s.id).join()+b.mk.map(m=>m.ch).join()+b.ev.length+part();if(soft&&sig===briefSig)return;briefSig=sig;
  const pick=['S&P 500','Bitcoin','Brent'];const mk=b.mk.filter(m=>pick.includes(m.n));
  el.innerHTML=`<div class="bh"><div><small>${new Date().toLocaleDateString('en-GB',{...LON,weekday:'long',day:'numeric',month:'long'})}</small><b>Good ${part()}</b></div>
   <button class="bplay press" id="bplay" aria-label="Play briefing">${speaking?'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>Stop':'<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>Play briefing'}</button></div>
   <ol class="btop">${b.top.map(s=>`<li data-id="${s.id}">${E(s.title)}</li>`).join('')}</ol>
   ${mk.length?`<div class="bmk">${mk.map(m=>`<span class="${m.ch>=0?'g':'r'}">${E(m.n)} <b>${m.ch>=0?'+':''}${m.ch.toFixed(1)}%</b></span>`).join('')}</div>`:''}
   ${b.ev.length?`<div class="bev">${b.ev.slice(0,3).map(e=>`<span>${hhmm(e.ts)} ${E((CCY[e.ccy]||[0,e.ccy])[1])} ${E(e.title)}</span>`).join('')}</div>`:''}`}
let speaking=false;
function chime(){try{const A=new (window.AudioContext||window.webkitAudioContext)();const t=A.currentTime;[[880,0],[1318.5,.16]].forEach(([f,o])=>{const g=A.createGain(),os=A.createOscillator();os.type='sine';os.frequency.value=f;
  g.gain.setValueAtTime(0,t+o);g.gain.linearRampToValueAtTime(.22,t+o+.02);g.gain.exponentialRampToValueAtTime(.001,t+o+.9);os.connect(g).connect(A.destination);os.start(t+o);os.stop(t+o+1)});setTimeout(()=>A.close(),1600)}catch(_){}}
function say(text){return new Promise(res=>{const u=new SpeechSynthesisUtterance(text);const vs=speechSynthesis.getVoices();u.voice=vs.find(v=>/en-GB/i.test(v.lang)&&/Daniel|Serena|Kate|Google UK|Arthur|Martha/i.test(v.name))||vs.find(v=>/en-GB/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null;
  u.lang='en-GB';u.rate=1.02;u.onend=u.onerror=()=>res();speechSynthesis.speak(u)})}
async function playBrief(){if(speaking){speechSynthesis.cancel();speaking=false;renderBrief();return}const b=briefData();if(!b||!('speechSynthesis' in window))return;speaking=true;renderBrief();chime();
  const pct=m=>`${m.n==='S&P 500'?'the S and P 500':m.n} is ${m.ch>=0?'up':'down'} ${Math.abs(m.ch).toFixed(1)} percent`;
  const parts=[`Good ${part()}. Here is your News Reel briefing for ${new Date().toLocaleDateString('en-GB',{...LON,weekday:'long',day:'numeric',month:'long'})}.`,
    ...b.top.map((s,i)=>`${['First','Next','And'][i]}: ${s.title}.`),
    b.mk.length?`Markets: ${b.mk.filter(m=>['S&P 500','Bitcoin','Brent','Gold'].includes(m.n)).map(pct).join('; ')}.`:'',
    b.ev.length?`On the calendar today: ${b.ev.slice(0,3).map(e=>`${(CCY[e.ccy]||[0,e.ccy])[1]} ${e.title.replace(/m\/m/,'month on month').replace(/y\/y/,'year on year').replace(/q\/q/,'quarter on quarter')} at ${hhmm(e.ts)}`).join(', ')}.`:'','That\u2019s your briefing.'].filter(Boolean);
  await new Promise(r=>setTimeout(r,900));for(const p of parts){if(!speaking)break;await say(p)}speaking=false;renderBrief()}
document.addEventListener('click',e=>{if(e.target.closest('#bplay'))playBrief();const li=e.target.closest('.btop li[data-id]');if(li)nr().openStory(li.dataset.id)});
NR6.focusBrief=()=>{nr().go&&nr().go('feed');setTimeout(()=>{const b=$('#brief');if(b){b.scrollIntoView({block:'center',behavior:'smooth'});b.classList.add('ping');setTimeout(()=>b.classList.remove('ping'),1600)}},300)};

// ================= 3. world map =================
let G=null,mapReady=false,vb=null,sel=null;const mapEl=()=>$('#map');
async function initMap(){if(mapReady)return;mapReady=true;try{const [svg,g]=await Promise.all([fetch('assets/world.svg').then(r=>r.text()),fetch('assets/geo.json').then(r=>r.json())]);G=g;
  const el=mapEl();el.innerHTML=svg.replace('<svg ','<svg id="msvg" preserveAspectRatio="xMidYMid meet" ').replace('</svg>','<g id="pins"></g></svg>')+'<div class="mcard" id="mcard" hidden></div><button class="mfit press" id="mfit" aria-label="Show whole world"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>';
  const r=el.getBoundingClientRect();const w=Math.min(G.w,Math.max(G.h*r.width/r.height,440));vb={x:Math.max(0,410-w/2),y:(G.h-w*r.height/r.width)/2,w,h:w*r.height/r.width};gestures();setVB();pins()}catch(e){mapReady=false}}
function setVB(){const s=$('#msvg');if(!s)return;const r=mapEl().getBoundingClientRect();const ar=r.width/r.height;vb.h=vb.w/ar;
  vb.x=Math.max(-vb.w*.3,Math.min(G.w-vb.w*.7,vb.x));vb.y=Math.max(-vb.h*.3,Math.min(G.h-vb.h*.7,vb.y));s.setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const k=vb.w/r.width;s.style.setProperty('--k',k);document.querySelectorAll('#pins .pin').forEach(p=>{const n=+p.dataset.r;p.querySelectorAll('circle').forEach(c=>c.setAttribute('r',(c.classList.contains('pr')?n*1.9:n)*k));const t=p.querySelector('text');if(t){t.setAttribute('font-size',9.5*k);t.setAttribute('dy',3.3*k)}})}
function pins(){const d=D();if(!G||!d)return;const groups={};
  for(const s of d.stories){if(!s.geo)continue;let p=null,label='';if(s.geo.startsWith('c:')){const c=G.city[s.geo.slice(2)];if(c){p=[c.x,c.y];label=c.n}}else if(G.cc[s.geo]){p=G.cc[s.geo];label=s.geo}
    if(!p)continue;(groups[s.geo]=groups[s.geo]||{p,label,L:[]}).L.push(s)}
  const COL=window.INTRO_META.COL;const html=Object.entries(groups).map(([k,g])=>{g.L.sort((a,b)=>(b.brk-a.brk)||b.score-a.score);const s=g.L[0],n=g.L.length,brk=g.L.some(x=>x.brk);const r=Math.min(9,4+Math.sqrt(n)*1.6);
    return `<g class="pin${brk?' brk':''}" data-k="${k}" data-r="${r}" style="--c:${COL[s.topic]||'#e7e9ea'}" transform="translate(${g.p[0]},${g.p[1]})">${brk?'<circle class="pr"/>':''}<circle class="pc"/>${n>1?`<text text-anchor="middle">${n}</text>`:''}</g>`}).join('');
  $('#pins').innerHTML=html;NR6._groups=groups;setVB();$('#mapsub')&&($('#mapsub').textContent=`${Object.values(groups).reduce((a,g)=>a+g.L.length,0)} stories pinned · ${Object.keys(groups).length} places · pinch to zoom`)}
const ccName=cc=>{try{return new Intl.DisplayNames(['en'],{type:'region'}).of(cc.toUpperCase())}catch(_){return cc.toUpperCase()}};
function showCard(k){const g=NR6._groups[k];const c=$('#mcard');if(!g){c.hidden=true;sel=null;return}sel=k;const COL=window.INTRO_META.COL,LAB=window.INTRO_META.LABEL;
  document.querySelectorAll('#pins .pin').forEach(p=>p.classList.toggle('sel',p.dataset.k===k));
  c.innerHTML=`<div class="mch"><b>${E(k.startsWith('c:')?g.label:ccName(k))}</b><span>${g.L.length} stor${g.L.length>1?'ies':'y'}</span><button class="mx press" data-mx aria-label="Close">✕</button></div><div class="mcl">${g.L.slice(0,8).map(s=>`<button class="mci press" data-id="${s.id}" style="--c:${COL[s.topic]}"><span class="kick">${s.brk?'<span class="bk">Breaking</span>':''}${E(LAB[s.topic])}<span class="src">· ${s.n} source${s.n>1?'s':''}</span></span><span class="mt">${E(s.title)}</span></button>`).join('')}</div>`;c.hidden=false}
function gestures(){const el=mapEl();const P=new Map();let start=null,moved=0;
  const toUnits=(cx,cy)=>{const r=el.getBoundingClientRect();return [vb.x+(cx-r.left)/r.width*vb.w,vb.y+(cy-r.top)/r.height*vb.h]};
  const zoomAt=(cx,cy,f)=>{const [ux,uy]=toUnits(cx,cy);const nw=Math.max(40,Math.min(G.w*1.2,vb.w/f));const r=el.getBoundingClientRect();vb.w=nw;vb.h=nw*r.height/r.width;vb.x=ux-(cx-r.left)/r.width*vb.w;vb.y=uy-(cy-r.top)/r.height*vb.h;setVB()};
  el.addEventListener('pointerdown',e=>{if(e.target.closest('.mcard,.mfit'))return;el.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;
    if(P.size===1)start={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y};else{const [a,b]=[...P.values()];start={d:Math.hypot(a.x-b.x,a.y-b.y),w:vb.w,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2}}});
  el.addEventListener('pointermove',e=>{if(!P.has(e.pointerId)||!start)return;P.set(e.pointerId,{x:e.clientX,y:e.clientY});const r=el.getBoundingClientRect();
    if(P.size===1&&start.vx!=null){const dx=e.clientX-start.x,dy=e.clientY-start.y;moved=Math.max(moved,Math.hypot(dx,dy));vb.x=start.vx-dx/r.width*vb.w;vb.y=start.vy-dy/r.height*vb.h;setVB()}
    else if(P.size===2&&start.d){const [a,b]=[...P.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);moved=99;const target=start.w*start.d/d;zoomAt((a.x+b.x)/2,(a.y+b.y)/2,vb.w/target)}});
  const up=e=>{if(!P.has(e.pointerId))return;P.delete(e.pointerId);if(P.size===1){const [a]=[...P.values()];start={x:a.x,y:a.y,vx:vb.x,vy:vb.y};return}
    if(!P.size){if(moved<8){const hit=document.elementsFromPoint(e.clientX,e.clientY).map(x=>x.closest&&x.closest('.pin')).find(Boolean);
      if(hit)showCard(hit.dataset.k);else{let best=null,bd=22;document.querySelectorAll('#pins .pin').forEach(p=>{const b=p.getBoundingClientRect();const dd=Math.hypot(b.x+b.width/2-e.clientX,b.y+b.height/2-e.clientY);if(dd<bd){bd=dd;best=p}});best?showCard(best.dataset.k):showCard(null)}}start=null}};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,e.deltaY<0?1.2:1/1.2)},{passive:false});
  el.addEventListener('click',e=>{const b=e.target.closest('.mci[data-id]');if(b){nr().openStory(b.dataset.id);return}if(e.target.closest('[data-mx]'))showCard(null);
    if(e.target.closest('#mfit')){const r=el.getBoundingClientRect();vb.w=G.w;vb.x=0;vb.y=(G.h-G.w*r.height/r.width)/2;setVB()}});
  addEventListener('resize',()=>mapReady&&setVB())}

// ================= 1. Web Push registration =================
const VAPID='BHazfCS4VmUOg6-7hhRCcsYvtSZMSXkI7TcJEocRvkA_IAC14BouPD7IpGZCnnlKaFaxpMcIWDMCpiQ9V7PdFYI';
const SPKI='MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArFqOAkPw7HQJorkZGAk9BHA7H4OXVDDp1eHspJEmS2IIcjA4Ht73u3CaTgi8bfe5s/XhXGq9F7Sbo3jUoD9Sb631cOp+O5OaGTigp8PHZAnTLBaLXhPE9CmwRVpYYmdVaLQWrX+ivsnNSym2kiNbm8hhbqhcXr3PRc2ZBPuBt1Hi+WDKDgIzFCjo6UJMYggedMdRRtYhskZZPi5ByxAs5rC1H3qfn0V6JECKeKJXVng+9Nj6K4XG6ScfifO7N6Miu1O8uB27j0mYEHnU4/eGS+ggWEdNMsDl2T+G9dEE2ZoTxNmjT6pVcDD5Xx4Hcyhn+BwQn7nmVKO7VC3dZs3vHwIDAQAB';
const TOPIC='https://ntfy.sh/nr-sub-d935823194ac2ba1130ce017';
const u8=b=>{const s=atob(b.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-b.length%4)%4));return Uint8Array.from(s,c=>c.charCodeAt(0))};
const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf)));
let P=LS('nr-push',{on:false,brk:true,brief:true,synced:0,sig:''});const dev=LS('nr-dev',null)||(()=>{const id=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now());SS('nr-dev',id);return id})();
const pushOK=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent);
async function post(msg){const pub=await crypto.subtle.importKey('spki',u8(SPKI.replace(/\+/g,'-').replace(/\//g,'_')),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
  const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));
  const c=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(msg)));const k=await crypto.subtle.encrypt({name:'RSA-OAEP'},pub,await crypto.subtle.exportKey('raw',key));
  const r=await fetch(TOPIC,{method:'POST',body:JSON.stringify({v:1,k:b64(k),iv:b64(iv),c:b64(c)})});if(!r.ok)throw new Error('relay '+r.status)}
async function sync(force,test){if(!P.on||!pushOK())return;const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(VAPID)});const kw=(nr().kws&&nr().kws())||[];
  const s=sub.toJSON();const sig=JSON.stringify([s.endpoint,kw,P.brk,P.brief]);if(!force&&sig===P.sig&&Date.now()-P.synced<86400000)return;
  await post({id:dev,sub:{endpoint:s.endpoint,keys:s.keys},kw,brk:P.brk,brief:P.brief,v:6,test:!!test});P.sig=sig;P.synced=Date.now();SS('nr-push',P);renderPush()}
async function enable(){if(!pushOK()){renderPush();return}try{const perm=await Notification.requestPermission();if(perm!=='granted'){renderPush();return}P.on=true;SS('nr-push',P);await sync(true,true);toast2('Push alerts on. A confirmation will arrive within ~15 minutes.')}catch(e){P.on=false;SS('nr-push',P);toast2('Could not turn on push: '+(e.message||e))}renderPush()}
async function disable(){try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();await post({id:dev,off:true});sub&&await sub.unsubscribe()}catch(_){}P.on=false;P.sig='';SS('nr-push',P);renderPush()}
function toast2(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),5000)}
function renderPush(){const el=$('#push');if(!el)return;const perm='Notification' in window?Notification.permission:'unsupported';
  let note='';if(!pushOK())note=isIOS&&!standalone()?'On iPhone: tap Share → Add to Home Screen, open News Reel from the Home Screen, then turn on push here (iOS 16.4+).':'This browser doesn\u2019t support push notifications.';
  else if(perm==='denied')note='Notifications are blocked. Turn them on in Settings → Notifications → News Reel.';
  else if(P.on)note=`On. Breaking news, your keyword alerts${P.brief?' and a 7:30 morning briefing':''}, max 3 an hour, quiet 00:30–07:30 unless it\u2019s huge. Delivered within ~15 min of a story breaking.${P.synced?' Synced '+new Date(P.synced).toLocaleString('en-GB',{...LON,weekday:'short',hour:'2-digit',minute:'2-digit'})+'.':''}`;
  else note='Get notified even when the app is closed.';
  el.innerHTML=`<div class="ph"><b>Push alerts</b><button class="sw ${P.on?'on':''} press" id="pushsw" role="switch" aria-checked="${P.on}" ${!pushOK()||perm==='denied'?'disabled':''}><i></i></button></div>
   <label class="opt"><span>Breaking news</span><input type="checkbox" id="optbrk" ${P.brk?'checked':''}></label>
   <label class="opt"><span>Morning briefing at 7:30</span><input type="checkbox" id="optbrief" ${P.brief?'checked':''}></label>
   <p class="fine">${note}</p>`}
document.addEventListener('click',e=>{if(e.target.closest('#pushsw'))P.on?disable():enable()});
document.addEventListener('change',e=>{if(e.target.id==='optbrk'||e.target.id==='optbrief'){P.brk=$('#optbrk').checked;P.brief=$('#optbrief').checked;SS('nr-push',P);sync(true).catch(()=>{});renderPush()}});
document.addEventListener('nr-kw',()=>sync(true).catch(()=>{}));
NR6.pushOn=()=>P.on;

// ================= wiring =================
let curTab='feed',btcT=0;
document.addEventListener('nr-tab',e=>{curTab=e.detail;if(curTab==='map'){initMap();setTimeout(()=>mapReady&&setVB(),50)}if(curTab==='live')renderCal()});
document.addEventListener('nr-data',()=>{renderStrip();renderBrief();pins();renderCal()});
function tickBTC(){if(!document.hidden&&(curTab==='feed'||curTab==='live'))pollBTC()}
setInterval(tickBTC,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){tickBTC();loadCal()}});
setTimeout(()=>{pollBTC();loadCal();renderPush();sync(false).catch(()=>{})},800);setInterval(loadCal,600000);
window.__v6={vb:()=>vb,showCard,sync,post,P:()=>P};
})();
