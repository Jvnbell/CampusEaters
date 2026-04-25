import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { OrderEvent, OrderEventRow } from '@/types/db';

export const dynamic = 'force-dynamic';

/**
 * Admin-only feed of the immutable order event log.
 *
 * This is the `order_events` append-only table (see migration 0005). Every
 * insert + status/bot change on `public.orders` lands here via a trigger,
 * and mutating the log is blocked at the DB level.
 */
export async function GET(request: Request) {
  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (auth.profile?.role !== 'ADMIN') {
    return forbidden('Only administrators can view the audit log.');
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.trunc(rawLimit), 500)) : 50;

  const { data, error } = await supabaseAdmin
    .from('order_events')
    .select('id, order_id, event, old_status, new_status, old_bot_id, new_bot_id, created_at')
    .order('id', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[api/admin/audit] Query failed', error);
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 });
  }

  const rows = (data ?? []) as OrderEventRow[];
  const events: OrderEvent[] = rows.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    event: r.event,
    oldStatus: r.old_status,
    newStatus: r.new_status,
    oldBotId: r.old_bot_id,
    newBotId: r.new_bot_id,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ events }, {
    headers: { 'Cache-Control': 'no-store, must-revalidate' },
  });
}
