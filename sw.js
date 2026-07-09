// W MARKET — service worker: офлайн-оболочка + быстрая загрузка.
// Трогаем только свои файлы (same-origin). Firebase/gstatic не перехватываем.
const CACHE = 'wm-v1';
const ASSETS = [
  './', './index.html',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './og-image.png', './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // не трогаем сторонние (Firebase и т.п.)

  // Навигация: свежий index из сети, при офлайне — из кэша
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // Статика: из кэша сразу, параллельно обновляем
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => cached))
  );
});
