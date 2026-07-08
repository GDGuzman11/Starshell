/**
 * Starshell service worker — makes the installed PWA work OFFLINE. Cache-first for
 * same-origin GETs: after the first online load, all app assets (_next/static, the
 * font, icons, the HTML shell) are cached and served without a network, so the
 * home-screen app launches and plays with no connection. Bump CACHE to invalidate.
 */
const CACHE = 'starshell-v1';

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
  if (url.origin !== self.location.origin) return; // let cross-origin (e.g. API) pass through

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        // Cache successful basic responses for next time (runtime caching).
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          const cache = await caches.open(CACHE);
          cache.put(req, copy);
        }
        return res;
      } catch {
        // Offline and uncached: fall back to the app shell for navigations.
        if (req.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        throw new Error('offline');
      }
    })(),
  );
});
