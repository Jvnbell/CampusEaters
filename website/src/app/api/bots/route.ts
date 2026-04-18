import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { mapBotWithCurrentOrder } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BotRow } from '@/types/db';

export const dynamic = 'force-dynamic';

/**
 * Operations console feed.
 *
 * Returns every bot in the fleet, plus the single in-flight order it is
 * currently fulfilling (if any). Admin-only — bots represent infrastructure,
 * not user-facing data.
 */
export async function GET() {
  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (auth.profile?.role !== 'ADMIN') {
    return forbidden('Only operations admins can view the bot fleet.');
  }

  const { data: bots, error: botsError } = await supabaseAdmin
    .from('bots')
    .select(
      'id, name, status, primary_location, current_location, battery_level, last_heartbeat_at, created_at, updated_at',
    )
    .order('name', { ascending: true });

  if (botsError) {
    console.error('[api/bots] Failed to load bots', botsError);
    return NextResponse.json({ error: 'Failed to load bots.' }, { status: 500 });
  }

  const botRows = (bots ?? []) as BotRow[];
  const botIds = botRows.map((bot) => bot.id);

  type ActiveOrder = {
    id: string;
    order_number: number;
    status: 'SENT' | 'RECEIVED' | 'SHIPPING' | 'DELIVERED';
    delivery_location: string;
    placed_at: string;
    bot_id: string | null;
    restaurant: { id: string; name: string; location: string } | null;
    user: { first_name: string; last_name: string; email: string } | null;
  };

  let activeOrders: ActiveOrder[] = [];
  if (botIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_number, status, delivery_location, placed_at, bot_id, restaurant:restaurants(id, name, location), user:users(first_name, last_name, email)',
      )
      .in('bot_id', botIds)
      .neq('status', 'DELIVERED')
      .order('placed_at', { ascending: true });

    if (error) {
      console.error('[api/bots] Failed to load active orders', error);
      return NextResponse.json({ error: 'Failed to load active orders.' }, { status: 500 });
    }

    activeOrders = (data ?? []) as unknown as ActiveOrder[];
  }

  // A bot might (in theory) be linked to multiple non-delivered orders if data is dirty.
  // Pick the oldest non-delivered one as the "current" assignment.
  const orderByBot = new Map<string, ActiveOrder>();
  for (const order of activeOrders) {
    if (!order.bot_id) continue;
    if (!orderByBot.has(order.bot_id)) {
      orderByBot.set(order.bot_id, order);
    }
  }

  const payload = botRows.map((bot) =>
    mapBotWithCurrentOrder(bot, orderByBot.get(bot.id) ?? null),
  );

  return NextResponse.json(
    { bots: payload },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } },
  );
}
