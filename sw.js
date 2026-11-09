// News Reel service worker: versioned shell cache, network-first with no-cache fetches.
const V='nr-shell-v6';
const SHELL=['./','index.html','app.css?v=6','intros.css?v=6','intros.js?v=6','v6.js?v=6','app.js?v=6','live.js?v=6','icon-192.png','manifest.webmanifest','assets/world.svg','assets/geo.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  e.respondWith((async()=>{try{const res=await fetch(r,{cache:'no-cache'});if(res.ok&&!u.pathname.includes('/data/')){const c=await caches.open(V);c.put(r,res.clone())}return res}
    catch(_){const m=await caches.match(r,{ignoreSearch:u.pathname.includes('/data/')});if(m)return m;if(r.mode==='navigate')return caches.match('index.html');return new Response('',{status:504})}})())});
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch(_){d={title:'News Reel',body:e.data&&e.data.text()}}
  e.waitUntil(Promise.all([self.registration.showNotification(d.title||'News Reel',{body:d.body||'',tag:d.tag,icon:'icon-192.png',badge:'icon-192.png',data:{url:d.url||'./'}}),
    clients.matchAll({type:'window'}).then(cs=>cs.forEach(c=>c.postMessage({type:'pushed',d})))]))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil((async()=>{const cs=await clients.matchAll({type:'window',includeUncontrolled:true});for(const c of cs){if(c.url.startsWith(self.registration.scope)){await c.focus();c.postMessage({type:'open',url});return}}return clients.openWindow(url)})())});
