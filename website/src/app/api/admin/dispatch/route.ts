import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DispatchResult } from '@/types/db';

export const dynamic = 'force-dynamic';

type RawAssignment = {
  order_id: string;
  order_number: number;
  bot_id: string;
  bot_name: string;
  score: number | string;
  battery: number | null;
};

type RawDispatchResult = {
  considered_orders: number;
  assigned: number;
  unassigned: number;
  assignments: RawAssignment[];
  dispatched_at: string;
};

/**
 * Triggers the SQL fleet dispatcher.
 *
 * The real magic lives in `public.dispatch_pending_orders` (see
 * supabase/migrations/0005_cs_features.sql): a concurrency-safe greedy
 * matcher that picks the best idle bot for each pending order using a
 * distance + battery cost function, guarded by FOR UPDATE SKIP LOCKED so
 * two concurrent dispatch calls never assign the same bot twice.
 */
export async function POST(request: Request) {
  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (auth.profile?.role !== 'ADMIN') {
    return forbidden('Only administrators can trigger fleet dispatch.');
  }

  let minBattery = 20;
  let maxAssignments = 100;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      minBattery?: number;
      maxAssignments?: number;
    };
    if (typeof body.minBattery === 'number' && body.minBattery >= 0 && body.minBattery <= 100) {
      minBattery = Math.trunc(body.minBattery);
    }
    if (
      typeof body.maxAssignments === 'number' &&
      body.maxAssignments > 0 &&
      body.maxAssignments <= 1000
    ) {
      maxAssignments = Math.trunc(body.maxAssignments);
    }
  } catch {
    // empty body is fine — use defaults
  }

  const { data, error } = await supabaseAdmin.rpc('dispatch_pending_orders', {
    p_min_battery: minBattery,
    p_max_assignments: maxAssignments,
  });

  if (error) {
    console.error('[api/admin/dispatch] RPC failed', error);
    return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 });
  }

  const raw = (data as RawDispatchResult) ?? {
    considered_orders: 0,
    assigned: 0,
    unassigned: 0,
    assignments: [],
    dispatched_at: new Date().toISOString(),
  };

  const result: DispatchResult = {
    consideredOrders: raw.considered_orders,
    assigned: raw.assigned,
    unassigned: raw.unassigned,
    assignments: (raw.assignments ?? []).map((a) => ({
      orderId: a.order_id,
      orderNumber: a.order_number,
      botId: a.bot_id,
      botName: a.bot_name,
      score: Number(a.score),
      battery: a.battery ?? null,
    })),
    dispatchedAt: raw.dispatched_at,
  };

  return NextResponse.json(result);
}
