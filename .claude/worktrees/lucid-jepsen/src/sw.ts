/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// ─── Workbox Precaching ─────────────────────────────────────────────────────
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ─── Runtime Caching ────────────────────────────────────────────────────────

// Supabase API: NetworkFirst
registerRoute(
  /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Supabase Storage: CacheFirst
registerRoute(
  /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
  new CacheFirst({
    cacheName: 'supabase-storage',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 86400 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; icon?: string; badge?: string; url?: string; tag?: string };
  try {
    data = event.data.json();
  } catch {
    data = { title: 'The Perfect Coach', body: event.data.text() };
  }

  const title = data.title || 'The Perfect Coach';
  const options: NotificationOptions = {
    body: data.body || '',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/favicon-32x32.png',
    tag: data.tag || 'default',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open the app at the specified URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data?.url as string) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
