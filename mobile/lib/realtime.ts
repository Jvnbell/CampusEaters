import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';

import { useAuth } from './auth-context';
import { supabase } from './supabase';
import type { OrderWithRelations } from './types';

/**
 * Mobile-side Realtime: subscribe to the user's broadcast channel so the UI
 * updates the moment an order's status flips on the server, even when the app
 * is in the foreground (where push banners typically don't show).
 *
 * The matching publisher lives at website/src/lib/realtime.ts. Both sides
 * agree on:
 *   - channel name: `user:<userId>`
 *   - events:       'order_created' | 'order_updated'
 *   - payload:      { order: OrderWithRelations }
 */

export type OrderEvent = 'order_created' | 'order_updated';

export type OrderEventHandler = (event: OrderEvent, order: OrderWithRelations) => void;

export function subscribeToUserOrders(
  userId: string,
  handler: OrderEventHandler,
): () => void {
  let channel: RealtimeChannel | null = supabase.channel(`user:${userId}`, {
    config: { broadcast: { self: false, ack: false } },
  });

  channel
    .on('broadcast', { event: 'order_created' }, ({ payload }) => {
      const order = (payload as { order?: OrderWithRelations })?.order;
      if (order) handler('order_created', order);
    })
    .on('broadcast', { event: 'order_updated' }, ({ payload }) => {
      const order = (payload as { order?: OrderWithRelations })?.order;
      if (order) handler('order_updated', order);
    })
    .subscribe();

  return () => {
    if (channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}

/**
 * Convenience hook for screens. Subscribes (and unsubscribes on unmount)
 * to the current user's order channel and calls `handler` on every event.
 *
 * The latest handler is held in a ref so screens can pass an inline arrow
 * without re-subscribing on every render.
 */
export function useOrderRealtime(handler: OrderEventHandler): void {
  const { profile } = useAuth();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!profile?.id) return;
    return subscribeToUserOrders(profile.id, (event, order) => {
      handlerRef.current(event, order);
    });
  }, [profile?.id]);
}
