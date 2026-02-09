"use client";

import { useState, useEffect, useCallback } from "react";
import {
  requestNotificationToken,
  onForegroundMessage,
} from "@/lib/firebase/client";

type PermState = "loading" | "unsupported" | "default" | "granted" | "denied";

export default function NotificationBell() {
  const [permState, setPermState] = useState<PermState>("loading");
  const [registering, setRegistering] = useState(false);

  // Check current permission state
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermState("unsupported");
      return;
    }
    setPermState(Notification.permission as PermState);
  }, []);

  // Auto re-register token when already granted (handles token refresh)
  useEffect(() => {
    if (permState !== "granted") return;

    let cancelled = false;
    (async () => {
      const token = await requestNotificationToken();
      if (token && !cancelled) {
        await fetch("/api/fcm/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [permState]);

  // Suppress foreground notifications (Realtime already handles them)
  useEffect(() => {
    if (permState !== "granted") return;
    const unsubscribe = onForegroundMessage(() => {
      // Intentionally swallowed — Realtime subscription handles in-app messages
    });
    return unsubscribe;
  }, [permState]);

  const handleEnable = useCallback(async () => {
    setRegistering(true);
    try {
      const token = await requestNotificationToken();
      if (token) {
        await fetch("/api/fcm/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        setPermState("granted");
      } else {
        // User denied or something went wrong
        setPermState(Notification.permission as PermState);
      }
    } finally {
      setRegistering(false);
    }
  }, []);

  // Hide when unsupported, loading, or already granted
  if (permState === "loading" || permState === "unsupported" || permState === "granted") {
    return null;
  }

  const isDenied = permState === "denied";

  return (
    <button
      onClick={handleEnable}
      disabled={isDenied || registering}
      title={
        isDenied
          ? "Notifications blocked — enable in browser settings"
          : "Enable push notifications"
      }
      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
        isDenied
          ? "text-slate-300 cursor-not-allowed"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        {isDenied && <line x1="1" y1="1" x2="23" y2="23" />}
      </svg>
    </button>
  );
}
