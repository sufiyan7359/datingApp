// Only one service worker can control this origin, so Angular's generated
// caching worker (ngsw-worker.js, built from ngsw-config.json) and the app's
// push-notification handling have to live in the same file. importScripts
// pulls in and runs Angular's install/activate/fetch logic verbatim; the
// push/notificationclick listeners below are added on top of that, in the
// same worker global scope, and don't collide with anything ngsw-worker.js
// listens for.
try {
  importScripts('./ngsw-worker.js');
} catch {
  // ngsw-worker.js is only emitted for production builds (main.ts registers
  // it with `enabled: !isDevMode()`) - under `ng serve` this worker just
  // handles push notifications, with no offline caching.
}

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title || 'DatingApp', {
      body: payload.body,
      icon: '/favicon.ico',
      data: { url: payload.url || '/dashboard' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientsList) => {
        for (const client of clientsList) {
          if ('focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
