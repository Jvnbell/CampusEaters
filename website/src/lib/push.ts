import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DeviceTokenRow, OrderStatus } from '@/types/db';

/**
 * Server-side Expo Push helper.
 *
 * Looks up every device token registered for a user (see public.device_tokens)
 * and fans the notification out via Expo's hosted push service. We send in
 * batches of 100 to stay under the documented per-request limit.
 *
 * Failures are logged but never thrown — pushes are best-effort and should
 * never block an order status update from succeeding.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  // Useful so the OS can collapse multiple notifications about the same order
  // into one row instead of stacking them.
  channelId?: string;
  categoryId?: string;
  ttl?: number;
};

/** Public payload — what the rest of the app constructs and passes in. */
export type PushPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function sendPushToUser(payload: PushPayload): Promise<void> {
  const accessToken = process.env.EXPO_ACCESS_TOKEN;

  const { data: tokens, error } = await supabaseAdmin
    .from('device_tokens')
    .select('id, token')
    .eq('user_id', payload.userId);

  if (error) {
    console.error('[push] Failed to load device tokens', error);
    return;
  }
  if (!tokens || tokens.length === 0) {
    // Not an error — the user just hasn't installed the mobile app yet.
    return;
  }

  const messages: ExpoPushMessage[] = (tokens as Pick<DeviceTokenRow, 'id' | 'token'>[]).map(
    (row) => ({
      to: row.token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      ttl: 60 * 60, // drop the push if it can't be delivered within an hour
    }),
  );

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      };
      // EXPO_ACCESS_TOKEN is optional; setting it on Expo's dashboard turns
      // on enhanced push security. Without it the endpoint still works.
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      });
      const json = (await response.json().catch(() => null)) as
        | { data?: Array<{ status: string; message?: string; details?: { error?: string } }> }
        | null;

      if (!response.ok) {
        console.error('[push] Expo returned non-2xx', response.status, json);
        continue;
      }

      // Per-message tickets — clean up tokens that Expo says are dead so we
      // don't keep paying to send to them.
      const tickets = json?.data ?? [];
      const deadTokenIds: string[] = [];
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const sourceRow = (tokens as Pick<DeviceTokenRow, 'id' | 'token'>[])[i + idx];
          if (sourceRow) deadTokenIds.push(sourceRow.id);
        }
      });
      if (deadTokenIds.length > 0) {
        await supabaseAdmin.from('device_tokens').delete().in('id', deadTokenIds);
      }
    } catch (err) {
      console.error('[push] Failed to send batch', err);
    }
  }
}

const STATUS_TITLE: Record<OrderStatus, string> = {
  SENT: 'Order placed',
  RECEIVED: 'Restaurant got your order',
  SHIPPING: 'Your bot is on the way',
  DELIVERED: 'Delivered — enjoy!',
};

const STATUS_BODY: Record<OrderStatus, (restaurant: string) => string> = {
  SENT: (r) => `${r} will start prepping in a moment.`,
  RECEIVED: (r) => `${r} is making your order now.`,
  SHIPPING: (r) => `A bot just left ${r} with your delivery.`,
  DELIVERED: () => 'Tap to leave a quick rating.',
};

/** Convenience wrapper: format a status-change notification and dispatch it. */
export async function sendOrderStatusPush(args: {
  userId: string;
  orderNumber: number;
  status: OrderStatus;
  restaurantName: string;
}): Promise<void> {
  await sendPushToUser({
    userId: args.userId,
    title: STATUS_TITLE[args.status],
    body: STATUS_BODY[args.status](args.restaurantName),
    data: {
      type: 'order_status',
      orderNumber: args.orderNumber,
      status: args.status,
    },
  });
}
