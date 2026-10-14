/* Lightkeeper service worker. build.sh fills in the version from the page content, so every deploy
   installs a fresh cache and the old one is dropped on activation. */
const VERSION = '__VERSION__';
const SHELL = 'lightkeeper-shell-' + VERSION;
const FONTS = 'lightkeeper-fonts';
const PRECACHE = ['./', './index.html', './app.js?v=' + VERSION, './style.css?v=' + VERSION, './install.js?v=' + VERSION, './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // fonts: serve from cache, refresh in the background
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // the app shell: network first so updates land, cache when offline
  e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(SHELL).then(c => c.put(req, r.clone())); return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
