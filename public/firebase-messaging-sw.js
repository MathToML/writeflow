/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker
// This runs in the background to handle push notifications when the app is not in focus.

importScripts(
  "https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js"
);

// Force SW to activate immediately
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Firebase config is public info (restricted by Firebase Security Rules, not by secrecy)
firebase.initializeApp({
  apiKey: "AIzaSyCrfpLTxIkiDnifmzKwKu9JedcjwNL7kk8",
  authDomain: "ottd-hackathon.firebaseapp.com",
  projectId: "ottd-hackathon",
  messagingSenderId: "87388015247",
  appId: "1:87388015247:web:7020ee61f5365355eb7efa",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  if (!title) return;

  self.registration.showNotification(title, {
    body: body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "ottd-notification",
    renotify: true,
    data: { url: payload.fcmOptions?.link ?? "/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if found
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Otherwise open new tab
        return clients.openWindow(url);
      })
  );
});
