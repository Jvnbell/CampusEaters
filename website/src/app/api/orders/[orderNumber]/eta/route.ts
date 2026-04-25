import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DeliveryEta, OrderStatus } from '@/types/db';

export const dynamic = 'force-dynamic';

type RawEta = {
  seconds: number | string | null;
  sample_size: number;
  source: 'restaurant' | 'global' | 'none';
};

/**
 * Predicted ETA for a specific order.
 *
 * Backed by the EWMA SQL predictor (public.predict_delivery_eta) which
 * exponentially weights the restaurant's most recent completed deliveries.
 * We subtract the already-elapsed time since the order was placed so the
 * client can render a live countdown — negative values mean "running late".
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> | { orderNumber: string } },
) {
  const resolvedParams = await Promise.resolve(params);
  const orderNumber = Number(resolvedParams.orderNumber);
  if (!Number.isFinite(orderNumber)) {
    return NextResponse.json({ error: 'Invalid order number' }, { status: 400 });
  }

  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (!auth.profile) {
    return NextResponse.json(
      { error: 'No CampusEats profile found for your account.' },
      { status: 403 },
    );
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, restaurant_id, status, placed_at')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (orderError) {
    console.error('[api/orders/eta] lookup failed', orderError);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const typed = order as {
    id: string;
    user_id: string;
    restaurant_id: string;
    status: OrderStatus;
    placed_at: string;
  };

  const isOwner = typed.user_id === auth.profile.id;
  const isAdmin = auth.profile.role === 'ADMIN';
  const isRestaurantOrder =
    auth.profile.role === 'RESTAURANT' && auth.profile.restaurantId === typed.restaurant_id;
  if (!isOwner && !isAdmin && !isRestaurantOrder) {
    return forbidden('You can only view ETAs for your own orders.');
  }

  const { data: etaData, error: etaError } = await supabaseAdmin.rpc('predict_delivery_eta', {
    p_restaurant_id: typed.restaurant_id,
  });

  if (etaError) {
    console.error('[api/orders/eta] RPC failed', etaError);
    return NextResponse.json({ error: 'Failed to predict ETA' }, { status: 500 });
  }

  const raw = (etaData as RawEta) ?? { seconds: null, sample_size: 0, source: 'none' };
  const totalSeconds =
    raw.seconds === null || raw.seconds === undefined ? null : Number(raw.seconds);

  const placedMs = Date.parse(typed.placed_at);
  const elapsedSeconds =
    Number.isFinite(placedMs) && totalSeconds !== null
      ? Math.max(0, Math.floor((Date.now() - placedMs) / 1000))
      : 0;

  const remainingSeconds = totalSeconds === null ? null : totalSeconds - elapsedSeconds;

  const prediction: DeliveryEta = {
    seconds: totalSeconds,
    sampleSize: raw.sample_size,
    source: raw.source,
  };

  return NextResponse.json(
    {
      prediction,
      order: {
        id: typed.id,
        status: typed.status,
        placedAt: typed.placed_at,
      },
      elapsedSeconds,
      remainingSeconds,
      delivered: typed.status === 'DELIVERED',
    },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
  );
}
