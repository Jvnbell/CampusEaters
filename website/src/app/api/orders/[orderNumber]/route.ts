import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { mapOrderWithRelations } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ORDER_WITH_RELATIONS_SELECT = `
  id, order_number, user_id, restaurant_id, bot_id, delivery_location, status, placed_at, updated_at,
  restaurant:restaurants(name, location),
  user:users(id, first_name, last_name, email),
  bot:bots(id, primary_location),
  order_items(id, quantity, menu_item:menu_items(name, price))
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderNumber: string }> | { orderNumber: string } },
) {
  const resolvedParams = await Promise.resolve(params);
  const orderNumber = Number(resolvedParams.orderNumber);

  if (Number.isNaN(orderNumber)) {
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

  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(ORDER_WITH_RELATIONS_SELECT)
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error) {
      console.error('[API /orders/[orderNumber] GET] Query failed', error);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = mapOrderWithRelations(data as Parameters<typeof mapOrderWithRelations>[0]);

    const isOwner = order.userId === auth.profile.id;
    const isAdmin = auth.profile.role === 'ADMIN';
    const isRestaurantOrder =
      auth.profile.role === 'RESTAURANT' && auth.profile.restaurantId === order.restaurantId;
    if (!isOwner && !isAdmin && !isRestaurantOrder) {
      return forbidden('You can only view your own orders or orders for your restaurant.');
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Failed to fetch order', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
