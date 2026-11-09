// News Reel cinematic intros: pure SVG/CSS motion graphics, one template per story type.
(function(){
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COL={legal:'#ff3b30',war:'#ff453a',markets:'#30d158',crypto:'#f7931a',election:'#0a84ff',tech:'#64d2ff',sport:'#30d158',disaster:'#ff9f0a',science:'#bf5af2',politics:'#7d7aff',general:'#e7e9ea'};
const LABEL={legal:'Law & Justice',war:'Conflict',markets:'Markets',crypto:'Crypto',election:'Election',tech:'Tech',sport:'Sport',disaster:'Disaster & Weather',science:'Science',politics:'Politics',general:'World'};
const KICK={legal:'BREAKING',war:'DEVELOPING',markets:'MARKETS',crypto:'CRYPTO',election:'DECISION DESK',tech:'TECH',sport:'SPORT',disaster:'ALERT',science:'DISCOVERY',politics:'POLITICS',general:'TOP STORY'};
function lum(h){h=(h||'888888').replace('#','');if(h.length<6)return .5;const [r,g,b]=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255);return .2126*r+.7152*g+.0722*b}
function ini(n){return String(n||'?').replace(/[^A-Za-z0-9 \-]/g,'').split(/[ \-]+/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase()}
function logoEl(e,cls,fg){if(e&&e.logo&&e.mono){const c=fg||(lum(e.c)>.22?'#'+e.c:'#fff');return `<i class="${cls} mk" style="-webkit-mask-image:url(${e.logo});mask-image:url(${e.logo});background:${c}"></i>`}
  if(e&&e.logo)return `<span class="${cls} pn"><img src="${e.logo}" alt=""></span>`;return `<b class="${cls} mono">${E(ini(e&&e.n))}</b>`}
function fmtP(q){if(!q||q.p==null)return '';const p=q.p>=1000?Math.round(q.p).toLocaleString('en-US'):q.p>=1?q.p.toFixed(2):q.p.toPrecision(3);return ({USD:'$',GBP:'£',GBp:'',EUR:'€',JPY:'¥',HKD:'HK$',KRW:'₩'}[q.cur]??'')+p+(q.cur==='GBp'?'p':'')}
function cap(s){const m=s.me;if(!m)return '';const q=m.q||(m.org&&m.org.q);let h='';
  if(m.role)h+=`<span>${E(m.role)}</span>`;
  if(m.q&&m.t!=='crypto')h+=`<span class="tq ${m.q.ch>=0?'g':'r'}"><b>${E(m.tk)}</b> ${fmtP(m.q)} ${m.q.ch>=0?'▲':'▼'} ${Math.abs(m.q.ch).toFixed(2)}%</span>`;
  else if(m.t==='company'&&m.tk&&!m.q)h+=`<span class="tq"><b>${E(m.tk)}</b></span>`;
  return h?`<div class="cap">${h}</div>`:''}
function med(s,pos){const m=s.me;if(!m)return '';const b='#'+(m.c||'8e8e93');
  if(m.t==='country')return m.cc?`<div class="med flag ${pos||''}"><img src="assets/flags/${m.cc}.svg" alt=""><i class="shine"></i></div>`:'';
  if(m.t==='person')return `<div class="med per ${m.face?'face ':''}${pos||''}" style="--b:${b}">${m.face?`<img class="fc" src="${m.face}" alt="">`:`<span>${E(ini(m.n))}</span>`}${m.cc?`<img class="fb" src="assets/flags/${m.cc}.svg" alt="">`:''}${m.org&&m.org.logo?`<em class="ob">${logoEl(m.org,'lg')}</em>`:''}</div>`;
  return `<div class="med tile ${pos||''}" style="--b:${b}">${logoEl(m,'lg')}</div>`}
function nm(s){if(s.me)return s.me.n;let e=(s.ents||[]).find(x=>x.split(' ').length>=2)||(s.ents||[])[0]||'';
  if(e.length>24){const w=e.split(' ');let o=[];for(const x of w){if((o.join(' ')+' '+x).trim().length>24)break;o.push(x)}while(o.length>1&&/^(of|the|and|for|in|on|at|to|de)$/i.test(o[o.length-1]))o.pop();e=o.join(' ')||w[0]}return e}
function stars(n){let o='';for(let i=0;i<n;i++){const x=(i*73.13)%100,y=(i*37.7)%100,d=(i%7)*.15;o+=`<i style="left:${x}%;top:${y}%;animation-delay:${d}s"></i>`}return o}
const T={};
T.legal=s=>{const st=(s.p&&s.p.stamp)||'BREAKING';return `
<svg class="dome" viewBox="0 0 300 200"><g fill="none" stroke="#e8d9b0" stroke-width="2.2" stroke-linecap="round">
<path class="dr" d="M150 18v14M140 32h20M128 58c0-14 10-26 22-26s22 12 22 26z"/>
<path class="dr" d="M118 58h64v10H118zM104 68c4-22 22-36 46-36s42 14 46 36"/>
<path class="dr" d="M96 82h108M100 82v10h100V82M90 92h120v8H90"/>
<path class="dr" d="M112 100v46M128 100v46M144 100v46M156 100v46M172 100v46M188 100v46"/>
<path class="dr" d="M40 146h220v10H40zM28 156h244v10H28zM56 120h40v26M204 120h40v26M56 120l20-10 20 10M204 120l20-10 20 10"/></g></svg>
<div class="gavel"><svg viewBox="0 0 120 120"><g transform="rotate(-40 60 60)"><rect x="30" y="22" width="60" height="26" rx="6" fill="#c79a5b"/><rect x="26" y="26" width="8" height="18" rx="2" fill="#e8c38a"/><rect x="86" y="26" width="8" height="18" rx="2" fill="#e8c38a"/><rect x="55" y="46" width="10" height="64" rx="4" fill="#9b6b34"/></g></svg></div>
<div class="block"></div><div class="ring r1"></div><div class="ring r2"></div>
<div class="stamp">${E(st)}</div><div class="name">${E(nm(s))}</div>`};
T.war=s=>`<div class="map"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(255,90,80,.16)" stroke-width=".6"/></pattern></defs>
<rect width="400" height="300" fill="url(#g)"/><path d="M40 210c30-40 60-30 90-60s50-70 110-60 70 40 120 30M30 120c40 10 70-20 100 0s60 40 120 10M120 280c20-40 70-50 110-40s60-30 110-10" fill="none" stroke="rgba(255,120,100,.45)" stroke-width="1.4"/>
<path d="M60 60l40 20 30-10 20 30 50-10 30 30 40-10 40 30M200 140l30 40-20 40 40 30" fill="none" stroke="rgba(255,255,255,.18)" stroke-dasharray="4 4"/></svg>
<i class="sm s1" style="left:58%;top:46%"></i><i class="sm s2" style="left:41%;top:58%"></i><i class="sm s3" style="left:66%;top:63%"></i><i class="sm s4" style="left:50%;top:40%"></i></div>
<div class="radar"></div><div class="xh"><i></i></div><div class="coord">${(30+((s.id||'a').charCodeAt(0)%30))}.${(s.id||'1234').charCodeAt(1)%99}°N · ${(20+((s.id||'b').charCodeAt(2)%40))}.${(s.id||'1234').charCodeAt(3)%99}°E</div>
<div class="name">${E(nm(s))}</div>`;
function chartPath(up){let p=[],y=up?200:70;for(let i=0;i<=30;i++){const x=10+i*12.6;y+=(up?-1:1)*(4+Math.sin(i*1.7)*9)+(i>20?(up?-6:7):0);y=Math.max(18,Math.min(250,y));p.push((i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1))}return p.join('')}
T.markets=s=>{const q=s.me&&(s.me.q||(s.me.org&&s.me.org.q));const neutral=!q&&!(s.p&&s.p.dir);const up=q&&!(s.p&&s.p.pct)?q.ch>=0:(!s.p||s.p.dir!=='down');const pct=(s.p&&s.p.pct)||(q?Math.abs(q.ch).toFixed(2):'');return `${med(s,'tl')}<div class="tape"><span>${q?`<b class="${q.ch>=0?'g':'r'}">${E(s.me.tk||(s.me.org&&s.me.org.tk))} ${fmtP(q)} ${q.ch>=0?'+':''}${q.ch.toFixed(2)}%</b> · `:''}${['FTSE 100','S&P 500','NASDAQ','DOW','DAX','NIKKEI','GOLD','BRENT','GBP/USD','10Y'].map((t,i)=>`${t} <b class="${(i+(up?0:1))%3?'g':'r'}">${(i%3?'+':'-')}${(0.2+(i*0.37)%1.8).toFixed(2)}%</b>`).join(' · ').repeat(2)}</span></div>
<svg class="ch ${up?'up':'dn'}" viewBox="0 0 400 270" preserveAspectRatio="none"><defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${up?'#30d158':'#ff453a'}" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>
<g stroke="rgba(255,255,255,.07)">${[50,100,150,200,250].map(y=>`<path d="M0 ${y}H400"/>`).join('')}</g><path class="ln" d="${chartPath(up)}" fill="none" stroke="${up?'#30d158':'#ff453a'}" stroke-width="3.2" stroke-linejoin="round"/></svg>
<div class="arrow ${up?'up':'dn'}">${up?'▲':'▼'}</div><div class="big ${neutral?'nt':up?'up':'dn'}" data-count="${E(pct)}">${pct?(up?'+':'−')+'0.0%':neutral?'MARKETS':(up?'RALLY':'SELL-OFF')}</div><div class="name">${E(nm(s))}</div>`};
T.crypto=(s,ctx)=>{const t=(s.title+' '+(s.kw||[]).join(' ')).toLowerCase();const cm=s.me&&s.me.t==='crypto'?s.me:null;const coin=cm?cm.tk:/ether|\beth\b/.test(t)?'ethereum':/solana|\bsol\b/.test(t)?'solana':'bitcoin';
 const sym=cm&&cm.logo&&cm.mono?logoEl(cm,'cl','#fff'):({bitcoin:'₿',ethereum:'Ξ',solana:'◎'}[coin]||E(ini(cm?cm.n:'?')));const pr=(cm&&cm.q)?{usd:cm.q.p,usd_24h_change:cm.q.ch}:ctx&&ctx.prices&&ctx.prices[coin];const price=pr?Math.round(pr.usd):0;const ch=pr?pr.usd_24h_change:0;
 return `<div class="cg"></div><div class="coin" style="${cm?`--cc:#${cm.c}`:''}"><div class="face">${sym}</div><div class="face back">${sym}</div></div><div class="sparks">${stars(18)}</div>
 <div class="price" data-to="${price}" data-dec="${pr&&pr.usd<10?1:0}" data-raw="${pr?pr.usd:0}">${price?'$0':'CRYPTO'}</div>${pr?`<div class="chg ${ch>=0?'g':'r'}">${ch>=0?'▲':'▼'} ${Math.abs(ch).toFixed(2)}% 24h · ${E(cm?cm.n.toUpperCase():coin.toUpperCase())}</div>`:''}<div class="name">${E(nm(s))}</div>`};
T.election=s=>`<div class="stars">${stars(26)}</div><div class="bars"><div class="bar a"><b></b><span class="cnt" data-to="${270+((s.id||'x').charCodeAt(0)%60)}">0</span></div><div class="bar b"><b></b><span class="cnt" data-to="${180+((s.id||'x').charCodeAt(1)%70)}">0</span></div></div>
<div class="box"><div class="slot"></div><i class="bal b1"></i><i class="bal b2"></i><i class="bal b3"></i></div><div class="tick">✓</div><div class="name">${E(nm(s))}</div>`;
T.tech=s=>`<svg class="circ" viewBox="0 0 400 400"><g fill="none" stroke="#64d2ff" stroke-width="2">${[[0,80,120,80,150,130],[0,320,110,320,150,270],[400,100,290,100,250,140],[400,300,300,300,250,260],[200,0,200,140],[200,400,200,260],[60,0,60,60,150,150],[340,400,340,340,250,250]].map(p=>`<path class="tr" d="M${p[0]} ${p[1]}${p.slice(2).reduce((a,v,i)=>a+(i%2?' '+v:' L'+v),'')}"/>`).join('')}</g></svg>
<div class="chip">${s.me&&s.me.t!=='country'&&s.me.t!=='person'?`<div class="clogo">${logoEl(s.me,'lg')}</div>`:s.me&&s.me.org?`<div class="clogo">${logoEl(s.me.org,'lg')}</div>`:'<div class="core"></div>'}</div><div class="scan"></div><div class="name gl" data-t="${E(nm(s))}">${E(nm(s))}</div>`;
T.sport=s=>`<div class="flood l"></div><div class="flood r"></div><div class="pitch"><i></i></div><div class="ball"></div>
<div class="board"><span class="fl">${E((nm(s).split(' ')[0]||'LIVE').slice(0,12).toUpperCase())}</span><span class="fl" style="animation-delay:1.1s">LIVE</span><b class="fl d2">FT</b></div><div class="name">${E(nm(s))}</div>`;
T.disaster=s=>{const t=(s.title+' '+(s.kw||[]).join(' ')).toLowerCase();const k=/quake|seism/.test(t)?'quake':/storm|hurricane|typhoon|cyclone|rain|flood|tornado|wind/.test(t)?'storm':/fire|blaze|heat/.test(t)?'fire':'alert';
 return `<div class="pulse"></div>${k==='storm'?`<div class="rain">${stars(40)}</div>`:''}${k==='fire'?`<div class="embers">${stars(30)}</div>`:''}
 <svg class="seis" viewBox="0 0 400 120" preserveAspectRatio="none"><path class="sl" d="M0 60${Array.from({length:40},(_,i)=>` L${i*10+5} ${60+(i>12&&i<28?(i%2?-1:1)*(10+((i*37)%40)):(i%2?-3:3))}`).join('')} L400 60" fill="none" stroke="#ff9f0a" stroke-width="2.4"/></svg>
 <div class="warn"><svg viewBox="0 0 100 90"><path d="M50 6L96 84H4z" fill="none" stroke="#ff9f0a" stroke-width="6" stroke-linejoin="round"/><path d="M50 34v24M50 68v4" stroke="#ff9f0a" stroke-width="8" stroke-linecap="round"/></svg></div>
 ${s.p&&s.p.toll?`<div class="toll"><b data-to="${String(s.p.toll).replace(/,/g,'')}">0</b> reported dead</div>`:''}<div class="name">${E(nm(s))}</div>`};
T.science=s=>`<div class="stars warp">${stars(40)}</div><div class="planet"></div><div class="orbit o1"><i></i></div><div class="orbit o2"><i></i></div><div class="orbit o3"><i></i></div><div class="name">${E(nm(s))}</div>`;
T.politics=s=>`<div class="spot"></div><div class="cols">${'<i></i>'.repeat(7)}</div><div class="ped"></div><div class="podium"><b></b></div><div class="mics"><i></i><i></i></div><div class="name">${E(nm(s))}</div>`;
T.general=s=>`<div class="stars">${stars(22)}</div><svg class="globe" viewBox="0 0 200 200"><g fill="none" stroke="#e7e9ea" stroke-width="1.2"><circle cx="100" cy="100" r="80" stroke-opacity=".9"/>
<g class="lon">${[0,1,2,3,4,5].map(i=>`<ellipse cx="100" cy="100" rx="${80*Math.abs(Math.cos(i*Math.PI/6))}" ry="80" stroke-opacity=".45"/>`).join('')}</g>${[-50,-25,0,25,50].map(d=>`<ellipse cx="100" cy="${100+d}" rx="${Math.sqrt(6400-d*d)}" ry="${Math.sqrt(6400-d*d)*.18}" stroke-opacity=".3"/>`).join('')}</g></svg>
<div class="ping"></div><div class="name">${E(nm(s))}</div>`;

function countUp(el,to,dur,fmt){const t0=performance.now();(function f(n){const k=Math.min(1,(n-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(to*e);if(k<1&&el.isConnected)requestAnimationFrame(f)})(t0)}

T.exchange=(s,ctx)=>{const m=s.me;const P=(ctx&&ctx.prices)||{};
  const chip=(id,sym)=>{const x=P[id];if(!x)return '';const up=(x.usd_24h_change||0)>=0;return `<span class="cc ${up?'g':'r'}"><b>${sym}</b> $${x.usd>=1000?Math.round(x.usd).toLocaleString('en-US'):x.usd.toFixed(2)} <em>${up?'▲':'▼'}${Math.abs(x.usd_24h_change||0).toFixed(1)}%</em></span>`};
  return `<div class="xo"><i class="r1"></i><i class="r2"></i><i class="r3"></i>${['₿','Ξ','◎','●'].map((c,k)=>`<em class="ob${k}">${c}</em>`).join('')}</div>
  <div class="xhero" style="--b:#${m.c||'888'}">${logoEl(m,'xl')}</div><div class="name">${E(m.n)}</div>
  <div class="cap"><span>${E(m.role||'Crypto')}</span>${m.q?`<span class="tq ${m.q.ch>=0?'g':'r'}"><b>${E(m.tk)}</b> ${fmtP(m.q)} ${m.q.ch>=0?'▲':'▼'} ${Math.abs(m.q.ch).toFixed(2)}%</span>`:''}</div>
  <div class="coins">${chip('bitcoin','BTC')}${chip('ethereum','ETH')}${chip('solana','SOL')}</div>`};

function pickT(story){const m=story.me;let t=T[story.topic]?story.topic:'general';
  if(t==='crypto'&&m&&(m.t==='company'||m.t==='org'))t='exchange';return t}
window.buildIntro=function(story,ctx,opts){opts=opts||{};const t=pickT(story);
  const el=document.createElement('div');const m=story.me;const mq=m&&(m.q||(m.org&&m.org.q));
  const dn=(t==='markets'&&mq&&!(story.p&&story.p.pct))?mq.ch<0:(story.p&&story.p.dir==='down');
  const integ=t==='exchange'||(t==='tech'&&m&&m.t!=='country'&&(m.t!=='person'||m.org))||(t==='crypto'&&m&&m.t==='crypto')||t==='markets';
  el.className='intro t-'+t+(dn?' dn':'')+(m?' has-me me-'+m.t:'')+(m&&!integ?' shift':'')+(opts.player?' layer':'');
  el.style.setProperty('--ac',COL[t==='exchange'?'crypto':t]);if(m&&m.c)el.style.setProperty('--b','#'+m.c);
  el.innerHTML=`${m&&m.t==='country'&&m.cc?`<div class="fbg"><img src="assets/flags/${m.cc}.svg" alt=""></div>`:''}${m&&m.t!=='country'?'<div class="etint"></div>':''}<div class="stage"><div class="art">${T[t](story,ctx)}</div>${integ?'':med(story,t==='election'?'tp':'')}</div><div class="vig"></div>
  <div class="bug"><i></i>NEWS REEL <span>· ${E(LABEL[t==='exchange'?'crypto':t])}</span></div>
  <div class="l3"><div class="kick">${story.brk?'BREAKING NEWS':KICK[t==='exchange'?'crypto':t]}</div><div class="hl">${E(story.title)}</div><div class="src">${E((story.srcs||[]).slice(0,3).map(x=>x.src).join(' · '))}</div></div>
  <div class="sweep"></div>${opts.player?'':'<div class="skip">Tap to skip</div>'}`;
  // move the name out of the (possibly shifted) art layer so it never collides; add caption
  const nmE=el.querySelector('.art .name');if(nmE){el.querySelector('.stage').appendChild(nmE);if(!el.querySelector('.stage .cap'))nmE.insertAdjacentHTML('afterend',cap(story))}
  ['.cap','.coins'].forEach(q=>{const x=el.querySelector('.art '+q);if(x)el.querySelector('.stage').appendChild(x)});
  const toll=el.querySelector('.art .toll');if(toll){const c=el.querySelector('.stage .cap');if(c){c.insertAdjacentHTML('beforeend',`<span class="tq r">${toll.innerHTML}</span>`);toll.remove()}}
  return el};
window.activateIntro=function(el){
  const nmEl=el.querySelector('.stage .name');if(nmEl){nmEl.style.animation='none';nmEl.style.fontSize='';let fs=parseFloat(getComputedStyle(nmEl).fontSize);nmEl.classList.remove('wrap');while(nmEl.scrollWidth>nmEl.clientWidth+1&&fs>26){fs-=2;nmEl.style.fontSize=fs+'px'}
    if(nmEl.scrollWidth>nmEl.clientWidth+1)nmEl.classList.add('wrap');
    const cp=el.querySelector('.stage .cap');if(cp)cp.style.top=(nmEl.offsetTop+nmEl.offsetHeight+12)+'px';
    const co=el.querySelector('.stage .coins');if(co&&cp)co.style.top=(nmEl.offsetTop+nmEl.offsetHeight+54)+'px';
    void nmEl.offsetWidth;nmEl.style.animation=''}
  setTimeout(()=>{if(!el.isConnected)return;el.querySelectorAll('[data-to]').forEach(c=>{const to=+c.dataset.to;if(!to)return;const money=c.classList.contains('price');const dec=+c.dataset.dec||0;countUp(c,to,1300,v=>money?'$'+(dec?v.toFixed(v<1?4:2):Math.round(v).toLocaleString('en-US')):Math.round(v).toLocaleString('en-US'))});
    const b=el.querySelector('.big[data-count]');if(b&&b.dataset.count){const up=!el.classList.contains('dn');countUp(b,+b.dataset.count,1100,v=>(up?'+':'−')+v.toFixed(1)+'%')}},650)};
window.preloadIntro=function(story){const m=story&&story.me;if(!m)return;[m.face,m.logo,m.org&&m.org.logo,m.cc&&`assets/flags/${m.cc}.svg`].filter(Boolean).forEach(u=>{const i=new Image();i.src=u})};
window.playIntro=function(story,ctx,opts){opts=opts||{};const el=buildIntro(story,ctx);preloadIntro(story);
  document.documentElement.classList.add('intro-on');document.body.appendChild(el);activateIntro(el);
  const D=opts.dur||3800;
  if(navigator.vibrate&&story.topic==='legal'&&navigator.userActivation&&navigator.userActivation.hasBeenActive)setTimeout(()=>navigator.vibrate(30),1150);
  return new Promise(res=>{let done=false;const end=()=>{if(done)return;done=true;el.classList.add('out');setTimeout(()=>{el.remove();if(!document.querySelector('.intro'))document.documentElement.classList.remove('intro-on');res('next')},380)};
    el.addEventListener('click',end);setTimeout(end,D)})};
/* Instagram-style story player: seamless slide transitions, continuous progress, tap L/R, hold to pause, swipe down to close */
window.playStories=function(list,ctx,start){return new Promise(res=>{
  const n=list.length;if(!n)return res();const D=4300;
  const P=document.createElement('div');P.className='player';
  P.innerHTML=`<div class="pl-stage"></div><div class="pl-top"><div class="segs">${list.map(()=>'<i><b></b></i>').join('')}</div><div class="pl-row"><span class="pl-n"></span><button class="plx" aria-label="Close">✕</button></div></div>`;
  document.documentElement.classList.add('intro-on');document.body.appendChild(P);
  const stage=P.querySelector('.pl-stage'),segs=[...P.querySelectorAll('.segs b')],num=P.querySelector('.pl-n');
  let i=-1,cur=null,el0=0,last=performance.now(),paused=false,closed=false,cache={};
  const mk=k=>cache[k]||(cache[k]=buildIntro(list[k],ctx,{player:true}));
  const pre=k=>{if(k>=0&&k<n){preloadIntro(list[k]);mk(k)}};
  function show(k,dir){const el=mk(k);delete cache[k];el.classList.remove('in-r','in-l','out-l','out-r');
    stage.appendChild(el);void el.offsetWidth;activateIntro(el);
    if(cur){el.classList.add(dir>0?'in-r':'in-l');const old=cur;old.classList.add(dir>0?'out-l':'out-r');setTimeout(()=>old.remove(),560)}
    cur=el;i=k;el0=0;segs.forEach((b,j)=>b.style.transform=`scaleX(${j<k?1:0})`);num.textContent=`${k+1} / ${n}`;pre(k+1);pre(k-1)}
  function next(){if(i<n-1)show(i+1,1);else close()}
  function prev(){if(i>0)show(i-1,-1);else{const el=cur;cur=null;el.remove();show(0,0)}}
  function close(){if(closed)return;closed=true;P.classList.add('closing');setTimeout(()=>{P.remove();if(!document.querySelector('.intro'))document.documentElement.classList.remove('intro-on');res()},320)}
  (function tick(now){if(closed)return;const dt=now-last;last=now;if(!paused&&i>=0){el0+=dt;segs[i].style.transform=`scaleX(${Math.min(1,el0/D)})`;if(el0>=D)next()}requestAnimationFrame(tick)})(last);
  let pd=null,hold=0;
  P.addEventListener('pointerdown',e=>{if(e.target.closest('.plx'))return;pd={x:e.clientX,y:e.clientY,t:performance.now(),held:false};
    hold=setTimeout(()=>{if(pd){pd.held=true;paused=true;P.classList.add('paused')}},220)});
  P.addEventListener('pointermove',e=>{if(!pd)return;const dy=e.clientY-pd.y;if(dy>8){clearTimeout(hold);paused=true;P.classList.add('drag');P.style.transform=`translateY(${dy}px) scale(${1-Math.min(.12,dy/2500)})`;P.style.opacity=String(1-Math.min(.5,dy/900))}});
  const up=e=>{if(!pd)return;clearTimeout(hold);const dy=e.clientY-pd.y,dx=e.clientX-pd.x,held=pd.held;pd=null;P.classList.remove('drag');
    if(dy>110){close();return}
    P.style.transform='';P.style.opacity='';
    if(held||dy>8){paused=false;P.classList.remove('paused');return}
    if(Math.abs(dx)>50){dx<0?next():prev();return}
    (e.clientX<innerWidth/3)?prev():next()};
  P.addEventListener('pointerup',up);P.addEventListener('pointercancel',()=>{pd=null;paused=false;P.classList.remove('paused','drag');P.style.transform='';P.style.opacity=''});
  P.querySelector('.plx').addEventListener('click',close);
  addEventListener('keydown',function k(e){if(closed){removeEventListener('keydown',k);return}if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev();if(e.key==='Escape')close()});
  show(start||0,0);
})};
window.INTRO_META={COL,LABEL,logoEl,lum};
})();
