/**
 * OST Service Worker — Network First
 * Always fetches fresh from network. Cache = offline fallback only.
 * No manual version bump needed — cache updates automatically on every successful fetch.
 */

const CACHE = 'ost-v1';

const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  const isSameOrigin = new URL(event.request.url).origin === self.location.origin;
  if (!isSameOrigin) return; // let third-party (fonts, CDN) go direct
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match('./index.html');
    if (fallback) return fallback;
    throw new Error('Offline and no cache available');
  }
}
