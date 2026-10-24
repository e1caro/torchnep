const V = 'fitcoach-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'data/exercises.json', 'data/videos.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// cache-first for everything, including exercise images / videos fetched at runtime
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => hit)));
});
