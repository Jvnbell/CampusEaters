import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  AnalyticsDaily,
  AnalyticsFleetStatus,
  AnalyticsPercentiles,
  AnalyticsTopRestaurant,
  AnalyticsTotals,
  BotStatus,
  FleetAnalytics,
} from '@/types/db';

export const dynamic = 'force-dynamic';

type RawDaily = {
  day: string;
  orders_placed: number;
  orders_delivered: number;
  avg_delivery_seconds: number | string;
};

type RawPercentiles = {
  p50: number | string | null;
  p90: number | string | null;
  p95: number | string | null;
  p99: number | string | null;
  samples: number;
};

type RawTopRestaurant = {
  restaurant_id: string;
  name: string;
  orders: number;
  avg_rating: number | string;
  review_count: number;
};

type RawFleetBucket = { status: BotStatus; count: number };

type RawTotals = {
  orders_placed: number;
  orders_delivered: number;
  avg_delivery_seconds: number | string | null;
  active_bots: number;
};

type RawAnalytics = {
  window_days: number;
  generated_at: string;
  totals: RawTotals;
  daily: RawDaily[];
  percentiles: RawPercentiles;
  top_restaurants: RawTopRestaurant[];
  fleet_status: RawFleetBucket[];
};

const toNum = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toNullableNum = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Fleet-wide analytics dashboard feed.
 *
 * Backed by `public.fleet_analytics(p_days int)` which uses PERCENTILE_CONT
 * and window CTEs to compute percentiles, daily throughput, and leaderboards
 * in a single database round-trip.
 */
export async function GET(request: Request) {
  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (auth.profile?.role !== 'ADMIN') {
    return forbidden('Only administrators can view analytics.');
  }

  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get('days') ?? '30');
  const days = Number.isFinite(rawDays) ? Math.max(1, Math.min(Math.trunc(rawDays), 365)) : 30;

  const { data, error } = await supabaseAdmin.rpc('fleet_analytics', { p_days: days });

  if (error) {
    console.error('[api/admin/analytics] RPC failed', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }

  const raw = data as RawAnalytics;

  const totals: AnalyticsTotals = {
    ordersPlaced: raw.totals.orders_placed,
    ordersDelivered: raw.totals.orders_delivered,
    avgDeliverySeconds: toNullableNum(raw.totals.avg_delivery_seconds),
    activeBots: raw.totals.active_bots,
  };

  const daily: AnalyticsDaily[] = (raw.daily ?? []).map((d) => ({
    day: d.day,
    ordersPlaced: d.orders_placed,
    ordersDelivered: d.orders_delivered,
    avgDeliverySeconds: toNum(d.avg_delivery_seconds),
  }));

  const percentiles: AnalyticsPercentiles = {
    p50: toNullableNum(raw.percentiles?.p50),
    p90: toNullableNum(raw.percentiles?.p90),
    p95: toNullableNum(raw.percentiles?.p95),
    p99: toNullableNum(raw.percentiles?.p99),
    samples: raw.percentiles?.samples ?? 0,
  };

  const topRestaurants: AnalyticsTopRestaurant[] = (raw.top_restaurants ?? []).map((r) => ({
    restaurantId: r.restaurant_id,
    name: r.name,
    orders: r.orders,
    avgRating: toNum(r.avg_rating),
    reviewCount: r.review_count,
  }));

  const fleetStatus: AnalyticsFleetStatus[] = (raw.fleet_status ?? []).map((f) => ({
    status: f.status,
    count: f.count,
  }));

  const payload: FleetAnalytics = {
    windowDays: raw.window_days,
    generatedAt: raw.generated_at,
    totals,
    daily,
    percentiles,
    topRestaurants,
    fleetStatus,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store, must-revalidate' },
  });
}
