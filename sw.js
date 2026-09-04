/* 我的课表 - Service Worker */
const CACHE = 'timetable-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // 网络优先：有网时永远取最新版，并顺手更新缓存；断网时才回退已缓存版本
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request, { cacheName: CACHE }).then((hit) => {
          if (hit) return hit;
          if (e.request.mode === 'navigate') return caches.match('./index.html', { cacheName: CACHE });
          return Response.error();
        })
      )
  );
});
