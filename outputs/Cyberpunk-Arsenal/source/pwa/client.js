/* Hosted distribution only. The ordinary file:// application has no PWA runtime. */
(() => {
 'use strict';
 if (!['https:', 'http:'].includes(location.protocol) || !window.isSecureContext || !('serviceWorker' in navigator)) return;
 const status = document.getElementById('pwa-status');
 const restart = document.getElementById('pwa-restart');
 const retry = document.getElementById('pwa-retry');
 let registration, restarting = false;
 const say = text => { status.textContent = text; };
 const updateReady = () => {
  const waiting = !!(registration.waiting && registration.active);
  restart.hidden = !waiting;
  if (waiting) say('Update available — Restart to update.');
 };
 function ask(worker, type) {
  return new Promise((resolve, reject) => {
   const channel = new MessageChannel();
   const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('Worker response timed out')); }, 10000);
   channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); resolve(event.data); };
   worker.postMessage({type}, [channel.port2]);
  });
 }
 async function ready(repair = false) {
  const active = registration.active;
  if (!active || active.state !== 'activated') return;
  try {
   const result = await ask(active, repair ? 'PREPARE' : 'OFFLINE_STATUS');
   if (result.ready) { say('Offline ready — all weapon and equipment artwork included.'); retry.hidden = true; }
   else { say('Offline preparation incomplete. Reconnect and retry.'); retry.hidden = false; }
  } catch { say('Offline readiness could not be confirmed. Reconnect and retry.'); retry.hidden = false; }
  updateReady();
 }
 async function register(repair = false) {
  retry.hidden = true; say('Preparing offline application…');
  try {
   registration = await navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'});
   const watch = worker => worker?.addEventListener('statechange', () => {
    if (worker.state === 'installed') updateReady();
    if (worker.state === 'activated') void ready();
    if (worker.state === 'redundant' && !registration.active) { say('Offline preparation failed. Reconnect and retry.'); retry.hidden = false; }
   });
   registration.addEventListener('updatefound', () => watch(registration.installing));
   watch(registration.installing);
   await ready(repair); updateReady();
  } catch { say('Offline preparation unavailable. Reconnect and retry.'); retry.hidden = false; }
 }
 restart.addEventListener('click', async () => {
  if (!registration?.waiting) return;
  if (window.NCAExpansion?.isDraftDirty() || document.querySelector('dialog[open]')) {
   say('Save your plan and close open dialogs before restarting.'); return;
  }
  restart.disabled = true;
  try {
   restarting = true;
   const result = await ask(registration.waiting, 'RESTART');
   if (!result.accepted) { restarting = false; say('Close other Arsenal windows and tabs, then Restart to update.'); }
  } catch { restarting = false; say('Update could not start. Close all Arsenal windows to update safely.'); }
  restart.disabled = false;
 });
 navigator.serviceWorker.addEventListener('controllerchange', () => { if (restarting) location.reload(); });
 retry.addEventListener('click', () => void register(true));
 void register();
})();
