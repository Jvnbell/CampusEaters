import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { mapReview } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ReviewRow } from '@/types/db';

export const dynamic = 'force-dynamic';

const REVIEW_SELECT = `
  id, order_id, user_id, restaurant_id, rating, comment, created_at, updated_at,
  reviewer:users(first_name, last_name)
`;

type WriteReviewBody = {
  rating?: number | string;
  comment?: string | null;
};

const parseOrderNumber = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
};

const parseRating = (raw: WriteReviewBody['rating']): number | null => {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= 1 && r <= 5 ? r : null;
};

const sanitizeComment = (raw: WriteReviewBody['comment']): string | null => {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, 1000);
};

/**
 * Look up an order by its public order_number, returning everything we need to
 * authorize a review write/read against it. Returns null when the order is
 * missing or the number is malformed.
 */
async function loadOrderContext(orderNumberRaw: string | undefined) {
  const orderNumber = parseOrderNumber(orderNumberRaw);
  if (orderNumber === null) return { error: 'invalid' as const };

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, restaurant_id, status')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (error) {
    console.error('[api/reviews] order lookup failed', error);
    return { error: 'lookup' as const };
  }
  if (!data) return { error: 'not_found' as const };
  return { order: data };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> | { orderNumber: string } },
) {
  const resolved = await Promise.resolve(params);
  const ctx = await loadOrderContext(resolved.orderNumber);
  if ('error' in ctx) {
    if (ctx.error === 'invalid') return NextResponse.json({ error: 'Invalid order number.' }, { status: 400 });
    if (ctx.error === 'not_found') return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to fetch review.' }, { status: 500 });
  }

  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (!auth.profile) {
    return NextResponse.json(
      { error: 'No CampusEats profile found for your account.' },
      { status: 403 },
    );
  }

  const { order } = ctx;
  const isOwner = auth.profile.id === order.user_id;
  const isAdmin = auth.profile.role === 'ADMIN';
  const isRestaurant =
    auth.profile.role === 'RESTAURANT' && auth.profile.restaurantId === order.restaurant_id;
  if (!isOwner && !isAdmin && !isRestaurant) {
    return forbidden('You can only view reviews for your own orders.');
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('order_id', order.id)
    .maybeSingle();

  if (error) {
    console.error('[api/reviews GET] query failed', error);
    return NextResponse.json({ error: 'Failed to fetch review.' }, { status: 500 });
  }

  return NextResponse.json({
    review: data ? mapReview(data as Parameters<typeof mapReview>[0]) : null,
  });
}

/**
 * Create or update the review for a delivered order. Only the customer who
 * placed the order can write the review, and only after delivery completes.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> | { orderNumber: string } },
) {
  const resolved = await Promise.resolve(params);
  const ctx = await loadOrderContext(resolved.orderNumber);
  if ('error' in ctx) {
    if (ctx.error === 'invalid') return NextResponse.json({ error: 'Invalid order number.' }, { status: 400 });
    if (ctx.error === 'not_found') return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to save review.' }, { status: 500 });
  }

  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (!auth.profile) {
    return NextResponse.json(
      { error: 'No CampusEats profile found for your account.' },
      { status: 403 },
    );
  }

  const { order } = ctx;
  if (auth.profile.id !== order.user_id) {
    return forbidden('Only the customer who placed this order can leave a review.');
  }
  if (order.status !== 'DELIVERED') {
    return NextResponse.json(
      { error: 'You can only review an order after it has been delivered.' },
      { status: 400 },
    );
  }

  let body: WriteReviewBody;
  try {
    body = (await request.json()) as WriteReviewBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rating = parseRating(body.rating);
  if (rating === null) {
    return NextResponse.json(
      { error: 'rating must be an integer between 1 and 5.' },
      { status: 400 },
    );
  }
  const comment = sanitizeComment(body.comment);

  // Upsert by order_id (unique). Service role bypasses RLS so this is fine.
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .upsert(
      {
        order_id: order.id,
        user_id: order.user_id,
        restaurant_id: order.restaurant_id,
        rating,
        comment,
      } satisfies Partial<ReviewRow> & Pick<ReviewRow, 'order_id' | 'user_id' | 'restaurant_id' | 'rating'>,
      { onConflict: 'order_id' },
    )
    .select(REVIEW_SELECT)
    .single();

  if (error || !data) {
    console.error('[api/reviews POST] upsert failed', error);
    return NextResponse.json({ error: 'Failed to save review.' }, { status: 500 });
  }

  return NextResponse.json(
    { review: mapReview(data as Parameters<typeof mapReview>[0]) },
    { status: 201 },
  );
}
