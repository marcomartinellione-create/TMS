/* Service worker di TMS Scheda: rende l'app usabile OFFLINE e la aggiorna da sola.
   Strategia network-first: online si scarica sempre la versione fresca dal sito
   (e si aggiorna la copia in cache); offline si serve la copia in cache.
   Nessun dato dell'utente passa di qui: la cache contiene solo i file dell'app. */
'use strict';
const CACHE = 'tms-scheda-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './qr-ig.png', './qr-yt.png', './qr-gh.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
      return r;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true })
        .then(m => m || caches.match('./index.html'))
    )
  );
});
