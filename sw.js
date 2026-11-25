const VERSION = 'sala-4.0.0';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const IMGC = 'sala-img';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== IMGC).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Locandine TMDB: cache-first, massimo 200 immagini
  if (u.hostname === 'image.tmdb.org') {
    e.respondWith(caches.open(IMGC).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok || r.type === 'opaque') {
        c.put(e.request, r.clone());
        c.keys().then(ks => { if (ks.length > 200) ks.slice(0, ks.length - 200).forEach(k => c.delete(k)); });
      }
      return r;
    }));
    return;
  }

  // API TMDB: sempre dalla rete
  if (u.origin !== location.origin) return;

  // App: prima la cache, aggiornamento in background
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || c.match('index.html');
  }));
});
