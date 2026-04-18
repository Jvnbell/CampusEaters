import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { mapOrderWithRelations } from '@/lib/db/mappers';
import { sendOrderStatusEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { OrderStatus } from '@/types/db';

const VALID_STATUSES: OrderStatus[] = ['SENT', 'RECEIVED', 'SHIPPING', 'DELIVERED'];

type UpdatePayload = {
  status?: OrderStatus;
  botId?: string | null;
};

const ORDER_WITH_RELATIONS_SELECT = `
  id, order_number, user_id, restaurant_id, bot_id, delivery_location, status, placed_at, updated_at,
  restaurant:restaurants(name, location),
  user:users(id, first_name, last_name, email),
  bot:bots(id, primary_location),
  order_items(id, quantity, menu_item:menu_items(name, price))
`;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } },
) {
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
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
  const isRestaurant = auth.profile.role === 'RESTAURANT' && auth.profile.restaurantId;

  if (!isAdmin && !isRestaurant) {
    return forbidden('Only restaurant staff or administrators can update order status.');
  }

  const body = (await request.json()) as UpdatePayload;

  if (!body.status && body.botId === undefined) {
    return NextResponse.json({ error: 'Provide at least one field to update.' }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
  }

  try {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, status, restaurant_id')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      console.error('[API /orders/id PATCH] Lookup failed', fetchError);
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (isRestaurant && existing.restaurant_id !== auth.profile.restaurantId) {
      return forbidden('You can only update orders for your own restaurant.');
    }

    const statusChanged = !!body.status && body.status !== existing.status;

    const updatePayload: { status?: OrderStatus; bot_id?: string | null } = {};
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.botId !== undefined) updatePayload.bot_id = body.botId;

    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select(ORDER_WITH_RELATIONS_SELECT)
      .single();

    if (updateError || !updatedRow) {
      console.error('[API /orders/id PATCH] Update failed', updateError);
      return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
    }

    const order = mapOrderWithRelations(
      updatedRow as Parameters<typeof mapOrderWithRelations>[0],
    );

    if (statusChanged && body.status && order.user) {
      console.log('[API /orders/id PATCH] Sending status update email...');
      await sendOrderStatusEmail({
        userEmail: order.user.email,
        userName: `${order.user.firstName} ${order.user.lastName}`,
        orderNumber: order.orderNumber,
        status: body.status,
        restaurantName: order.restaurant.name,
        deliveryLocation: order.deliveryLocation,
      });
      console.log('[API /orders/id PATCH] Email notification sent');
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Failed to update order', error);
    return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
  }
}
