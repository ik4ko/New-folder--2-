/**
 * Firebase Cloud Messaging service worker — handles background push notifications.
 *
 * This file must live at /public/firebase-messaging-sw.js so the browser can
 * register it at the root scope required by FCM.
 *
 * Configuration: the Firebase config values below are intentionally public
 * (they match NEXT_PUBLIC_FIREBASE_* env vars). Replace the placeholder
 * strings with real values from Firebase Console → Project Settings → Your Apps.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            self.__FIREBASE_API_KEY__            || 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain:        self.__FIREBASE_AUTH_DOMAIN__        || 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId:         self.__FIREBASE_PROJECT_ID__         || 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket:     self.__FIREBASE_STORAGE_BUCKET__     || 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId:             self.__FIREBASE_APP_ID__             || 'REPLACE_WITH_NEXT_PUBLIC_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

/**
 * Background message handler — fires when the app tab is closed or hidden.
 * Foreground messages are handled by onForegroundNotification() in
 * src/lib/notifications.ts.
 */
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'MediStay Alert';
  const body  = payload.notification?.body  || 'You have a new notification.';

  self.registration.showNotification(title, {
    body,
    icon:  '/icon-192.png',
    badge: '/badge-72.png',
    tag:   payload.data?.clientId || 'medistay-alert',
    data:  payload.data,
    actions: [
      { action: 'view', title: 'View Client' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

/**
 * Notification click handler — opens the app to the relevant client page
 * when the broker taps the notification.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const clientId = event.notification.data?.clientId;
  const url = clientId ? `/clients/${clientId}` : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
