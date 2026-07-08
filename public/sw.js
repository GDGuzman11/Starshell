/**
 * Starshell service worker — offline support that STILL picks up updates.
 *   • The page/app shell (HTML navigations) is NETWORK-FIRST: a fresh deploy is
 *     fetched when online (so game updates reach installed home-screen apps), with
 *     the cached shell as the offline fallback.
 *   • Hashed static assets (_next/static, fonts, icons) are CACHE-FIRST: they are
 *     immutable (a new build gets new filenames), so this is fast + offline-safe.
 * Bump CACHE whenever you want to force-clear old caches on the next launch.
 */
const CACHE = 'starshell-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin (e.g. the API) pass through

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Network-first so a new deploy is picked up; fall back to cache offline.
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
          return res;
        } catch {
          return (await caches.match(req)) || (await caches.match('/')) || Response.error();
        }
      })(),
    );
    return;
  }

  // Cache-first for immutable hashed assets.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.status === 200 && res.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    })(),
  );
});
