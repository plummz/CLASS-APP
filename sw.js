const CACHE_VERSION = 'v1.5.40-20260428-phase7-mobile-offline';
const CACHE_NAME = `school-portfolio-${CACHE_VERSION}`;
const ASSETS = [
  '/',
  '/index.html?v=85',
  '/style.css?v=34',
  '/assets/css/codelab.css?v=4',
  '/coding-educational/coding-educational.css?v=8',
  '/features/ai/ai.css?v=1',
  '/features/academics/academics.css?v=1',
  '/features/lobby/lobby.css?v=2',
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
  '/features/royale/royale.css?v=17',
  '/features/pacman/pacman.css?v=3',
  '/features/candy/candy.css?v=11',
  '/features/file-summarizer/file-summarizer.css?v=5',
  '/features/reviewers/reviewers.css?v=3',
  '/script.js?v=83',
  '/features/file-summarizer/file-summarizer.js?v=7',
  '/features/file-summarizer/file-summarizer.css?v=5',
  '/features/reviewers/reviewers.js?v=7',
  '/features/reviewers/reviewers.css?v=3',
  '/features/personal-tools/notepad.js?v=4',
  '/features/ai/ai.js?v=1',
  '/features/academics/academics.js?v=1',
  '/features/lobby/lobby.js?v=1',
  '/features/chat/chat.js?v=1',
  '/features/calendar/calendar.js?v=1',
  '/features/personal-tools/calculator.js?v=5',
  '/features/music/music.js?v=1',
  '/features/social/social.js?v=1',
  '/features/users/users.js?v=1',
  '/features/games/games.js?v=1',
  '/features/updates/updates.js?v=1',
  '/features/folders/folders.js?v=1',
  '/features/gallery/gallery.js?v=1',
  '/assets/js/codelab.js?v=6',
  '/coding-educational/coding-educational-data.js?v=10',
  '/coding-educational/coding-educational.js?v=9',
  '/coding-educational/assets/fallback-card.jpg',
  '/features/pokemon/pokemon.js?v=3',
  '/features/royale/royale.js?v=24',
  '/features/pacman/pacman.js?v=3',
  '/features/candy/candy.js?v=10',
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
        .catch(() => caches.match('/') || caches.match('/index.html?v=73'))
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

// Alarm notifications from the client (alarmModule.showNotification calls reg.showNotification directly)
// This message handler lets the page post a show-alarm message as a fallback path.
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SHOW_ALARM_NOTIFICATION') {
    const { label, time } = event.data;
    event.waitUntil(
      self.registration.showNotification(`🔔 Alarm: ${label || 'Alarm'}`, {
        body: `Set for ${time || ''}`,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [300, 100, 300, 100, 300],
        tag: `alarm-${time}`,
        renotify: true,
        data: { url: '/' }
      })
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'New message', body: event.data ? event.data.text() : '' };
  }

  const isAlarm = Boolean(data.alarmId);
  const title = data.title || (isAlarm ? '⏰ Alarm' : 'New message');

  const options = isAlarm ? {
    body: data.body || 'Your alarm is ringing!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: `alarm-${data.alarmId}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500],
    actions: [
      { action: 'dismiss', title: '✕ Dismiss' },
      { action: 'snooze',  title: '💤 Snooze 5m' },
    ],
    data: {
      url: '/',
      alarmId: data.alarmId,
      soundId: data.soundId || 'beep',
      notifTitle: title,
      notifBody: data.body || '',
    },
  } : {
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
  const notifData = event.notification.data || {};
  const action = event.action;

  // Dismiss action — just close the notification
  if (notifData.alarmId && action === 'dismiss') return;

  // Snooze action — relay to any open app window
  if (notifData.alarmId && action === 'snooze') {
    event.waitUntil((async () => {
      const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of list) {
        client.postMessage({ type: 'ALARM_SNOOZED', alarmId: notifData.alarmId, soundId: notifData.soundId });
      }
    })());
    return;
  }

  const targetUrl = new URL(notifData.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(targetUrl);
        if (notifData.sender) client.postMessage({ type: 'OPEN_PRIVATE_CHAT', sender: notifData.sender });
        if (notifData.alarmId) {
          client.postMessage({
            type: 'ALARM_TRIGGERED',
            alarmId: notifData.alarmId,
            soundId: notifData.soundId || 'beep',
            label: notifData.notifTitle || 'Alarm',
            body: notifData.notifBody || '',
          });
        }
        return;
      }
    }
    await clients.openWindow(targetUrl);
  })());
});
