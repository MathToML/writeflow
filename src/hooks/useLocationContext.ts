"use client";

import { useCallback, useRef } from "react";

export interface LocationContext {
  isAvailable: boolean;
  isMoving: boolean;
  speed: number | null;
  movementType: "stationary" | "walking" | "driving" | "unknown";
}

export interface LocationSignal {
  isMoving: boolean;
  movementType: "stationary" | "walking" | "driving" | "unknown";
}

interface StoredPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

const STORAGE_KEY = "writeflow_last_position";
const THROTTLE_MS = 30_000;
const MOVING_THRESHOLD_M = 50;
const WALKING_SPEED = 0.5; // m/s
const DRIVING_SPEED = 5; // m/s

// Haversine distance in meters
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMovementType(
  speedMs: number,
): "stationary" | "walking" | "driving" {
  if (speedMs > DRIVING_SPEED) return "driving";
  if (speedMs > WALKING_SPEED) return "walking";
  return "stationary";
}

export function useLocationContext() {
  const lastFetchRef = useRef<number>(0);

  const fetchLocation = useCallback(
    async (): Promise<LocationContext | null> => {
      // Throttle: skip if called within 30s
      const now = Date.now();
      if (now - lastFetchRef.current < THROTTLE_MS) {
        return null;
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        return null;
      }

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 60_000,
            });
          },
        );

        lastFetchRef.current = Date.now();

        const { latitude, longitude, speed: geoSpeed } = position.coords;
        const currentTimestamp = position.timestamp;

        // Read previous position from sessionStorage
        let prev: StoredPosition | null = null;
        try {
          const stored = sessionStorage.getItem(STORAGE_KEY);
          if (stored) prev = JSON.parse(stored);
        } catch {
          // sessionStorage unavailable
        }

        // Store current position
        try {
          sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              lat: latitude,
              lng: longitude,
              timestamp: currentTimestamp,
            } satisfies StoredPosition),
          );
        } catch {
          // sessionStorage unavailable
        }

        // Calculate speed from GPS or from displacement
        let speed: number | null = null;
        let distance = 0;

        if (geoSpeed != null && geoSpeed >= 0) {
          speed = geoSpeed;
        } else if (prev) {
          distance = haversineDistance(
            prev.lat,
            prev.lng,
            latitude,
            longitude,
          );
          const elapsed = (currentTimestamp - prev.timestamp) / 1000;
          if (elapsed > 0) {
            speed = distance / elapsed;
          }
        }

        if (!prev) {
          distance = 0;
        } else if (distance === 0) {
          distance = haversineDistance(
            prev.lat,
            prev.lng,
            latitude,
            longitude,
          );
        }

        const isMoving = distance > MOVING_THRESHOLD_M;
        const movementType =
          speed != null ? getMovementType(speed) : isMoving ? "unknown" : "stationary";

        return {
          isAvailable: true,
          isMoving,
          speed,
          movementType,
        };
      } catch {
        // Permission denied or timeout — graceful fallback
        return null;
      }
    },
    [],
  );

  return { fetchLocation };
}
