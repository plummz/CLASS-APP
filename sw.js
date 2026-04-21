const CACHE_VERSION = 'v65';
const CACHE_NAME = `school-portfolio-${CACHE_VERSION}`;
const ASSETS = [
  '/',
  '/index.html?v=65',
  '/style.css?v=25',
  '/assets/css/codelab.css?v=4',
  '/features/ai/ai.css?v=1',
  '/features/academics/academics.css?v=1',
  '/features/lobby/lobby.css?v=1',
  '/features/chat/chat.css?v=1',
  '/features/calendar/calendar.css?v=1',
  '/features/music/music.css?v=1',
  '/features/social/social.css?v=1',
  '/features/users/users.css?v=1',
  '/features/games/games.css?v=1',
  '/features/updates/updates.css?v=1',
  '/features/folders/folders.css?v=1',
  '/features/gallery/gallery.css?v=1',
  '/features/pokemon/pokemon.css?v=3',
  '/features/royale/royale.css?v=3',
  '/script.js?v=31',
  '/features/ai/ai.js?v=1',
  '/features/academics/academics.js?v=1',
  '/features/lobby/lobby.js?v=1',
  '/features/chat/chat.js?v=1',
  '/features/calendar/calendar.js?v=1',
  '/features/music/music.js?v=1',
  '/features/social/social.js?v=1',
  '/features/users/users.js?v=1',
  '/features/games/games.js?v=1',
  '/features/updates/updates.js?v=1',
  '/features/folders/folders.js?v=1',
  '/features/gallery/gallery.js?v=1',
  '/assets/js/codelab.js?v=4',
  '/features/pokemon/pokemon.js?v=3',
  '/features/royale/royale.js?v=3',
  '/assets/images/code-web-card.svg',
  '/assets/images/code-java-card.svg',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
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
      Promise.all(keys.map((key) => key === CACHE_NAME ? null : caches.delete(key)))
    )
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
    .then((clientsList) => clientsList.forEach((client) => {
      client.postMessage({ type: 'APP_CACHE_UPDATED', version: CACHE_VERSION });
    }))
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith(self.location.origin)) return;

  // NEVER cache API calls — let them go directly to the network every time.
  // Caching API responses was the root cause of the 'Unexpected token <' bug:
  // Render's HTML cold-start page got cached (status 200, ok=true), then every
  // subsequent search hit that cached HTML instead of the real JSON endpoint.
  if (event.request.url.includes('/api/')) return;

  const requestUrl = new URL(event.request.url);
  if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          }
          return response;
        })
        .catch(() => caches.match('/') || caches.match('/index.html?v=65'))
    );
    return;
  }

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
