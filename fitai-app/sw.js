const V = 'fitquest-v8';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'game.js', 'gym.js', 'recipes.js', 'meals.js', 'earn.js', 'manifest.webmanifest', 'data/exercises.json', 'data/videos.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const store = (req, r) => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(V).then(c => c.put(req, copy)); } return r; };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // The app's own files: network first so updates arrive, cache when offline.
  if (new URL(req.url).origin === location.origin) {
    e.respondWith(fetch(req).then(r => store(req, r)).catch(() => caches.match(req)));
    return;
  }
  // Exercise photos and fonts: cache first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => store(req, r))));
});
