import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/lib/auth-context';

/**
 * Bridges incoming push notification taps to in-app navigation.
 *
 * Mounted once inside the navigation tree (so `useRouter` is available).
 * When the user taps a notification, we route them to the Orders tab — the
 * payload from the server includes `type: 'order_status'`, so future
 * notification kinds can branch here without touching the server.
 *
 * We also handle the cold-start case (`getLastNotificationResponseAsync`),
 * where a notification was tapped while the app was killed and there is no
 * "received" event to listen to — without this, the tap would silently land
 * the user on the home tab instead of the relevant order.
 */
export function NotificationRouter() {
  const router = useRouter();
  const { profile } = useAuth();
  // Only handle the cold-start payload once per process to avoid bouncing
  // the user into Orders on every focus change.
  const handledColdStart = useRef(false);

  useEffect(() => {
    if (!profile) return;

    const navigateForData = (data: Record<string, unknown> | undefined) => {
      if (!data) return;
      if (data.type === 'order_status') {
        router.push('/(tabs)/orders');
      }
    };

    // Cold start: app was killed, user tapped the notification.
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response?.notification?.request?.content?.data) {
            navigateForData(
              response.notification.request.content.data as Record<string, unknown>,
            );
          }
        })
        .catch(() => undefined);
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateForData(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      );
    });

    return () => sub.remove();
  }, [profile, router]);

  return null;
}
