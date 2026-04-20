const CACHE_NAME = 'school-portfolio-v51';
const ASSETS = [
  '/',
  'index.html',
  'style.css',
  'pokemon.css',
  'royale.css',
  'script.js',
  'pokemon.js',
  'royale.js',
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

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'New message', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'New message';
  const options = {
    body: data.body || 'Open CLASS APP to view it.',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: data.tag || data.messageId || 'class-app-message',
    renotify: false,
    data: {
      url: data.url || '/',
      sender: data.sender || '',
      messageId: data.messageId || '',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  const sender = event.notification.data?.sender || '';

  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(targetUrl);
        if (sender) client.postMessage({ type: 'OPEN_PRIVATE_CHAT', sender });
        return;
      }
    }
    await clients.openWindow(targetUrl);
  })());
});
