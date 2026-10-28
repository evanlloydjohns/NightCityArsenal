/* Version and resource hashes are injected by tools/build.py. */
'use strict';
const VERSION = /*__VERSION__*/;
const RESOURCES = /*__RESOURCES__*/;
const PREFIX = 'night-city-arsenal:' + self.registration.scope + ':';
const CACHE = PREFIX + VERSION;
const url = path => new URL(path, self.registration.scope).href;
const required = ['index.html', 'manifest.webmanifest'];

async function checkedFetch(path) {
 const response = await fetch(new Request(url(path), {cache:'no-cache', credentials:'same-origin'}));
 if (!response.ok || response.redirected) throw new Error('Unavailable resource: ' + path);
 const bytes = await response.clone().arrayBuffer();
 const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2,'0')).join('');
 if (digest !== RESOURCES[path]) throw new Error('Deployment version mismatch: ' + path);
 return response;
}
self.addEventListener('install', event => event.waitUntil((async () => {
 try {
  const cache = await caches.open(CACHE);
  // HTML contains every runtime byte, including all 262 item images. No second artwork download.
  for (const path of required) await cache.put(url(path), await checkedFetch(path));
  await Promise.all(Object.keys(RESOURCES).filter(path => !required.includes(path)).map(async path => {
   try { await cache.put(url(path), await checkedFetch(path)); } catch { /* Optional shell icons do not block the application. */ }
  }));
 } catch (error) { await caches.delete(CACHE); throw error; }
 // Updates wait for all old windows to close, or an explicit guarded RESTART.
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
 await Promise.all((await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
 const request = event.request, target = new URL(request.url);
 if (request.method !== 'GET' || target.origin !== self.location.origin || !target.href.startsWith(self.registration.scope)) return;
 const relative = target.pathname.slice(new URL(self.registration.scope).pathname.length);
 // Only known entry documents are aliases. Unknown paths remain real HTTP 404s.
 const key = request.mode === 'navigate' && (relative === '' || relative === 'index.html') ? 'index.html' : relative;
 if (!(key in RESOURCES)) return;
 event.respondWith((async () => {
  const cache = await caches.open(CACHE), cached = await cache.match(url(key));
  if (cached) return cached;
  // Never fill this version's cache with unchecked bytes from a newer deployment.
  try { const response = await checkedFetch(key); await cache.put(url(key), response.clone()); return response; }
  catch { return new Response('Offline resource unavailable. Reconnect and reopen Night City Arsenal.', {status:503, headers:{'Content-Type':'text/plain'}}); }
 })());
});
self.addEventListener('message', event => {
 if (!event.ports[0] || !event.source?.url?.startsWith(self.registration.scope)) return;
 event.waitUntil((async () => {
  if (['OFFLINE_STATUS', 'PREPARE'].includes(event.data?.type)) {
   const cache = await caches.open(CACHE);
   if (event.data.type === 'PREPARE') {
    try { for (const path of required) if (!await cache.match(url(path))) await cache.put(url(path), await checkedFetch(path)); }
    catch { /* Readiness below reports what is actually present. */ }
   }
   const ready = (await Promise.all(required.map(path => cache.match(url(path))))).every(Boolean);
   event.ports[0].postMessage({ready, version:VERSION});
  } else if (event.data?.type === 'RESTART') {
   const windows = (await self.clients.matchAll({type:'window', includeUncontrolled:true})).filter(client => client.url.startsWith(self.registration.scope));
   const accepted = windows.length === 1 && windows[0].id === event.source.id;
   event.ports[0].postMessage({accepted});
   if (accepted) await self.skipWaiting();
  }
 })());
});
