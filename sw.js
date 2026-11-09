// News Reel service worker: versioned shell cache, network-first with no-cache fetches.
const V='nr-shell-v1';
const SHELL=['./','index.html','app.css?v=1','intros.css?v=1','intros.js?v=1','app.js?v=1','icon-192.png','manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  e.respondWith((async()=>{try{const res=await fetch(r,{cache:'no-cache'});if(res.ok&&!u.pathname.includes('/data/')){const c=await caches.open(V);c.put(r,res.clone())}return res}
    catch(_){const m=await caches.match(r,{ignoreSearch:u.pathname.includes('/data/')});if(m)return m;if(r.mode==='navigate')return caches.match('index.html');return new Response('',{status:504})}})())});
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch(_){d={title:'News Reel',body:e.data&&e.data.text()}}
  e.waitUntil(self.registration.showNotification(d.title||'News Reel',{body:d.body||'',tag:d.tag,icon:'icon-192.png',badge:'icon-192.png',data:{url:d.url||'./'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil((async()=>{const cs=await clients.matchAll({type:'window',includeUncontrolled:true});for(const c of cs){if(c.url.startsWith(self.registration.scope)){await c.focus();c.postMessage({type:'open',url});return}}return clients.openWindow(url)})())});
