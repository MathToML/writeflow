import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getMessaging as fbGetMessaging,
  getToken,
  onMessage,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

/** SSR-safe messaging instance */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === "undefined") return null;
  return fbGetMessaging(getFirebaseApp());
}

/** Request notification permission, register SW, and return FCM token */
export async function requestNotificationToken(): Promise<string | null> {
  const messaging = getFirebaseMessaging();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  // Register the service worker and wait until it's active
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );
  if (registration.installing) {
    await new Promise<void>((resolve) => {
      registration.installing!.addEventListener("statechange", (e) => {
        if ((e.target as ServiceWorker).state === "activated") resolve();
      });
    });
  } else if (registration.waiting) {
    await new Promise<void>((resolve) => {
      registration.waiting!.addEventListener("statechange", (e) => {
        if ((e.target as ServiceWorker).state === "activated") resolve();
      });
    });
  }

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  return token || null;
}

/** Listen for foreground messages */
export function onForegroundMessage(callback: (payload: unknown) => void) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
