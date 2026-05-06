'use client';

/**
 * Client-side FCM (Firebase Cloud Messaging) registration and listener.
 *
 * Usage:
 *  1. Call registerForPushNotifications(db, userId) once after the user logs in.
 *     This requests browser permission and stores the FCM token in users/{uid}.
 *
 *  2. Call onForegroundNotification(cb) to receive alerts while the tab is active.
 *     Background alerts are handled by public/firebase-messaging-sw.js.
 *
 *  3. Call subscribeToNotifications(db, brokerId, cb) to stream unread alert
 *     documents from the notifications collection for in-app display.
 */

import type { Firestore } from 'firebase/firestore';
import {
  doc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationDoc {
  agencyId: string;
  brokerId: string;
  clientId: string;
  event: 'HIGH_RISK_DETECTED' | 'CSV_INGEST_COMPLETE';
  riskScore?: number;
  triggers?: string[];
  status: 'pending' | 'sent' | 'partial' | 'no_tokens' | 'failed';
  createdAt: unknown;  // Firestore Timestamp — use .toDate() on the client
  sentAt?: unknown;
}

// ---------------------------------------------------------------------------
// Singleton messaging instance
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _messaging: any = null;

async function getMessagingInstance() {
  if (typeof window === 'undefined') return null;
  if (_messaging) return _messaging;

  try {
    const { getApp } = await import('firebase/app');
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return null;
    _messaging = getMessaging(getApp());
    return _messaging;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Permission + token registration
// ---------------------------------------------------------------------------

/**
 * Requests notification permission from the browser, obtains an FCM
 * registration token, and stores it in users/{userId}.fcmTokens so the
 * Cloud Function can reach this device.
 *
 * Safe to call multiple times — FCM tokens are stored in an array so
 * multiple devices per broker are supported.
 *
 * Returns the token on success, null if permission was denied or FCM is
 * unavailable in this browser.
 */
export async function registerForPushNotifications(
  db: Firestore,
  userId: string,
): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn(
      '[notifications] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set. ' +
      'Generate a Web Push certificate in Firebase Console → Cloud Messaging → Web configuration.'
    );
    return null;
  }

  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, { vapidKey });

    if (token) {
      await updateDoc(doc(db, 'users', userId), {
        fcmTokens: arrayUnion(token),
      });
    }

    return token ?? null;
  } catch (err) {
    console.error('[notifications] FCM registration failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Foreground message listener
// ---------------------------------------------------------------------------

export interface FCMNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Listens for push messages while the app tab is in the foreground.
 * Background messages are handled by the service worker.
 * Returns an unsubscribe function.
 */
export async function onForegroundNotification(
  callback: (payload: FCMNotificationPayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, payload => {
    callback({
      title: payload.notification?.title ?? 'AegisSage Alert',
      body: payload.notification?.body ?? '',
      data: payload.data as Record<string, string> | undefined,
    });
  });
}

// ---------------------------------------------------------------------------
// In-app notification stream
// ---------------------------------------------------------------------------

/**
 * Subscribes to the notifications collection for a specific broker,
 * ordered newest first. Returns an unsubscribe function.
 *
 * Requires the notifications/{entryId} Firestore rule to allow reads
 * where resource.data.brokerId == request.auth.uid.
 */
export function subscribeToNotifications(
  db: Firestore,
  brokerId: string,
  callback: (notifications: NotificationDoc[]) => void,
  maxItems = 50,
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('brokerId', '==', brokerId),
    orderBy('createdAt', 'desc'),
    limit(maxItems),
  );

  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data() as NotificationDoc));
  });
}
