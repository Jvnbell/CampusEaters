import { supabaseAdmin } from '@/lib/supabase/admin';
import type { OrderWithRelations } from '@/types/db';

/**
 * Realtime broadcast helper.
 *
 * The mobile app subscribes to `user:<userId>` channels and listens for
 * `order_updated` events so the UI updates the moment a status flips, even
 * when the app is in the foreground (and pushes wouldn't be shown).
 *
 * We use Supabase Realtime *broadcast* rather than `postgres_changes` for
 * three reasons:
 *  1. RLS isn't configured on `orders`, so postgres_changes via the anon
 *     key wouldn't deliver row payloads.
 *  2. Broadcast is push-only (server → client) which matches our model.
 *  3. We get to send a fully-shaped client object — no second round-trip
 *     to enrich the row.
 *
 * Threat model note: anyone who knows a user's id can subscribe to that
 * user's channel. The payload only contains order metadata that the user
 * already owns, so this is acceptable for now. If we later expose more
 * sensitive fields, switch to Realtime "private channels" with RLS.
 */
export async function broadcastOrderUpdate(args: {
  userId: string;
  event: 'order_created' | 'order_updated';
  order: OrderWithRelations;
}): Promise<void> {
  try {
    const channel = supabaseAdmin.channel(`user:${args.userId}`, {
      config: { broadcast: { self: false, ack: false } },
    });

    // We have to subscribe before we can send. The send returns 'ok' once
    // delivered to the realtime server (we don't await acknowledgement from
    // every subscriber). The channel is unsubscribed immediately after.
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
      });
      // Don't hang the request if Realtime is unreachable — fire-and-forget.
      setTimeout(resolve, 1500);
    });

    await channel.send({
      type: 'broadcast',
      event: args.event,
      payload: { order: args.order },
    });

    await supabaseAdmin.removeChannel(channel);
  } catch (err) {
    console.error('[realtime] broadcast failed', err);
  }
}
