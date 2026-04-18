import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { mapOrderWithRelations } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ORDER_WITH_RELATIONS_SELECT = `
  id, order_number, user_id, restaurant_id, bot_id, delivery_location, status, placed_at, updated_at,
  user:users(first_name, last_name, email),
  order_items(id, quantity, menu_item:menu_items(name, price))
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ restaurantId: string }> | { restaurantId: string } },
) {
  const resolvedParams = await Promise.resolve(params);
  const { restaurantId } = resolvedParams;

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required.' }, { status: 400 });
  }

  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (!auth.profile) {
    return NextResponse.json(
      { error: 'No CampusEats profile found for your account.' },
      { status: 403 },
    );
  }

  const isAdmin = auth.profile.role === 'ADMIN';
  const isOwnRestaurant =
    auth.profile.role === 'RESTAURANT' && auth.profile.restaurantId === restaurantId;
  if (!isAdmin && !isOwnRestaurant) {
    return forbidden('You can only view orders for your own restaurant.');
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(ORDER_WITH_RELATIONS_SELECT)
      .eq('restaurant_id', restaurantId)
      .neq('status', 'DELIVERED')
      .order('placed_at', { ascending: true });

    if (error) {
      console.error('[API /restaurants/[id]/orders GET] Query failed', error);
      return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
    }

    const orders = (data ?? []).map((row) =>
      mapOrderWithRelations(row as Parameters<typeof mapOrderWithRelations>[0]),
    );

    const response = NextResponse.json({ orders });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('[API] Failed to fetch restaurant orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
  }
}
