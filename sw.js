const CACHE_NAME = 'school-portfolio-v9';
const ASSETS = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;

  // NEVER cache API calls — let them go directly to the network every time.
  // Caching API responses was the root cause of the 'Unexpected token <' bug:
  // Render's HTML cold-start page got cached (status 200, ok=true), then every
  // subsequent search hit that cached HTML instead of the real JSON endpoint.
  if (event.request.url.includes('/api/')) return;

  // Static assets only — network first, fall back to cache when offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
