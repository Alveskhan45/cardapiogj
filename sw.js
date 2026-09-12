/* Service Worker — Cardápio Digital (modo offline leve) */
const CACHE = 'cardapio-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/state.js',
  './js/menu.js',
  './js/cart.js',
  './js/checkout.js',
  './js/app.js',
  './js/admin.js',
  './js/admin-login.js',
  './js/admin-orders.js',
  './js/backup.js',
  './js/vendor/qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => {
        return caches.match(req).then(m => m || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
      })
  );
});