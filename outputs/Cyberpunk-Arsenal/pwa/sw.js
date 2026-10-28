/* Generated version and resource hashes are injected by build_pwa.py. */
'use strict';
const VERSION = "7f5f2d364170b24b484b";
const RESOURCES = {"icons/nc-16.png": "ce26693518cdc5d869c3fd5f6241c589c83db1a444d1f8b5ef69e97a8283cb0d", "icons/nc-192.png": "641ed308275eadcc1315c5811644f7e7df7e305ba8fe2f4b9cdf455bfd5ddc0e", "icons/nc-32.png": "e3fa08ead69816dcbc5c052f347f85cf39de22dd21d754fc4660323e9c12fc18", "icons/nc-48.png": "1eede33ff92e3b56539b7f0c9dea42c3b9d8e0d79c84325cef54aa8264a3d674", "icons/nc-512.png": "e2b5e3271e40236fe00ae338be196709a0504579444523fe926c321f6927d2d9", "icons/nc-maskable-192.png": "9371ee46bcd4c8732af511ec873752a9553d983197e129b23b5dade53c7cf175", "icons/nc-maskable-512.png": "325d909acaf9c8e26ea42ee0e7075402e21737bca3d9782814529b3147b52646", "icons/nc.svg": "b20ba6d04739829560667abdfd16b097d2e3bf4e5d448f2d1a8869a0063c563f", "index.html": "0a37f365ecafd4f09fb0c57db23b24ffd532f6d7dbae1ec4e477c3ef7fa6d35a", "manifest.webmanifest": "5cbb181dafe4c2bb7aa8ce457a32d54b03308abf8e5666cbaa426a457b50f8be"};
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
