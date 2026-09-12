/* Service Worker kalendarza: praca offline i powiadomienia o wydarzeniach. */
const CACHE = 'kalendarz-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
const PLAN_PREFIX = 'plan-';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Strona: najpierw sieć, przy braku połączenia kopia z pamięci.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});

function showReminder({ title, body, tag, timestamp }) {
  const options = {
    body,
    tag: tag || `${PLAN_PREFIX}${Date.now()}`,
    icon: './icon.svg',
    badge: './icon.svg',
    lang: 'pl',
    requireInteraction: true,
    data: { url: './' },
  };

  // Powiadomienie z wyprzedzeniem działa tylko tam, gdzie przeglądarka to wspiera.
  if (typeof timestamp === 'number' && 'TimestampTrigger' in self) {
    options.showTrigger = new self.TimestampTrigger(timestamp);
  }

  return self.registration.showNotification(title, options);
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'POKAZ_PRZYPOMNIENIE') {
    event.waitUntil(showReminder(data));
    return;
  }

  if (data.type === 'ZAPLANUJ_PRZYPOMNIENIA') {
    if (!('TimestampTrigger' in self)) return;
    event.waitUntil(
      (async () => {
        const planned = await self.registration.getNotifications({ includeTriggered: true });
        planned.filter((n) => n.tag && n.tag.startsWith(PLAN_PREFIX)).forEach((n) => n.close());

        for (const item of data.items || []) {
          await showReminder({
            title: item.title,
            body: item.body,
            tag: `${PLAN_PREFIX}${item.id}`,
            timestamp: item.timestamp,
          });
        }
      })()
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => 'focus' in c);
      return open ? open.focus() : self.clients.openWindow('/');
    })
  );
});
