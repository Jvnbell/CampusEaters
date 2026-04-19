import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api, ApiError } from './api';

/**
 * Mobile-side push notification plumbing.
 *
 *  - Asks the user for permission (lazy, only after sign-in)
 *  - Fetches an Expo push token tied to this device
 *  - POSTs the token to /api/users/me/push-tokens so the server can fan out
 *    notifications when an order's status changes
 *
 * Tokens are hardware-bound, so they're stable across logins on the same
 * device. We re-register on every sign-in so a fresh user_id is associated
 * with the token (the server upserts on `token`).
 */

// Foreground delivery: show the banner + sound, but do NOT auto-list it in
// the iOS lock screen UI a second time when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type PlatformTag = 'ios' | 'android' | 'web';

function platformTag(): PlatformTag {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Run once on Android: explicitly create the channel that order-update
 * notifications will use. iOS doesn't need this.
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('order-updates', {
    name: 'Order updates',
    description: 'Status changes for your CampusEats deliveries.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7c5cff',
  });
}

/**
 * Resolve the EAS project id needed by `getExpoPushTokenAsync`. It's exposed
 * via `expo-constants` after the project is linked to EAS; in dev we fall
 * back to the legacy "no projectId" lookup, which still works for Expo Go.
 */
function getProjectId(): string | undefined {
  const expoConfig = Constants.expoConfig;
  return (
    expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId ??
    undefined
  );
}

/**
 * Asks for permission, fetches an Expo push token, and registers it with
 * the API. Returns the token (or null if anything failed — never throws,
 * since push is best-effort and shouldn't break sign-in).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Simulators/emulators can't receive remote pushes.
  if (!Device.isDevice) {
    console.log('[push] Skipping registration on simulator');
    return null;
  }

  try {
    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      console.log('[push] Permission denied; skipping token registration');
      return null;
    }

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;

    if (!token) return null;

    await api('/api/users/me/push-tokens', {
      method: 'POST',
      body: { token, platform: platformTag() },
    });

    return token;
  } catch (err) {
    if (err instanceof ApiError) {
      console.warn('[push] Token register API call failed', err.status, err.message);
    } else {
      console.warn('[push] Registration failed', err);
    }
    return null;
  }
}

/**
 * Best-effort token cleanup on sign-out. We keep the token if it can't be
 * deleted — the server will GC it when Expo reports it as DeviceNotRegistered.
 */
export async function unregisterPushNotifications(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await api(`/api/users/me/push-tokens?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('[push] Token unregister failed (non-fatal)', err);
  }
}
