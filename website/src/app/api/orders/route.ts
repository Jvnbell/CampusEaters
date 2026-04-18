import { NextResponse } from 'next/server';

import { getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { mapOrderWithRelations } from '@/lib/db/mappers';
import { sendOrderStatusEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase/admin';

type CreateOrderBody = {
  restaurantId: string;
  userId?: string; // ignored; server uses authenticated user's profile id
  deliveryLocation: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
};

const ORDER_WITH_RELATIONS_SELECT = `
  id, order_number, user_id, restaurant_id, bot_id, delivery_location, status, placed_at, updated_at,
  restaurant:restaurants(name, location),
  user:users(id, first_name, last_name, email),
  order_items(id, quantity, menu_item:menu_items(name, price))
`;

/** Combine duplicate menu lines (same id) into one row with summed quantity. */
function mergeLineItems(
  items: Array<{ menuItemId: string; quantity: number }>,
): Array<{ menuItemId: string; quantity: number }> {
  const map = new Map<string, number>();
  for (const { menuItemId, quantity } of items) {
    map.set(menuItemId, (map.get(menuItemId) ?? 0) + quantity);
  }
  return Array.from(map.entries()).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();
    if (!auth.profile) {
      return NextResponse.json(
        { error: 'No CampusEats profile found for your account. Please contact an administrator.' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateOrderBody;

    const restaurantId = String(body.restaurantId ?? '').trim();
    const deliveryLocation =
      typeof body.deliveryLocation === 'string'
        ? body.deliveryLocation.trim()
        : String(body.deliveryLocation ?? '').trim();

    if (
      !restaurantId ||
      !deliveryLocation ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: restaurantId, deliveryLocation, and at least one item. Delivery location cannot be blank.',
          code: 'INVALID_BODY',
        },
        { status: 400 },
      );
    }

    const sanitizedItems = mergeLineItems(
      body.items
        .map((item) => ({
          menuItemId: String(item?.menuItemId ?? '').trim(),
          quantity: Number(item?.quantity),
        }))
        .filter(
          (item) =>
            item.menuItemId.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0,
        ),
    );

    if (sanitizedItems.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid menu items were provided. Select at least one item with quantity ≥ 1.',
          code: 'NO_LINE_ITEMS',
        },
        { status: 400 },
      );
    }

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .maybeSingle();

    if (restaurantError) {
      console.error('[API /orders POST] Restaurant lookup failed', restaurantError);
      return NextResponse.json({ error: 'Failed to validate restaurant' }, { status: 500 });
    }
    if (!restaurant) {
      return NextResponse.json(
        {
          error: 'Invalid restaurant. Refresh the page and select a restaurant again.',
          code: 'RESTAURANT_NOT_FOUND',
          restaurantId,
        },
        { status: 400 },
      );
    }

    const requestedMenuIds = Array.from(
      new Set(sanitizedItems.map((item) => item.menuItemId)),
    );

    const { data: foundMenuItems, error: menuError } = await supabaseAdmin
      .from('menu_items')
      .select('id, restaurant_id')
      .eq('restaurant_id', restaurantId)
      .in('id', requestedMenuIds);

    if (menuError) {
      console.error('[API /orders POST] Menu lookup failed', menuError);
      return NextResponse.json({ error: 'Failed to validate menu items' }, { status: 500 });
    }

    if ((foundMenuItems ?? []).length !== requestedMenuIds.length) {
      const foundIds = new Set((foundMenuItems ?? []).map((m) => m.id));
      const missingMenuItemIds = requestedMenuIds.filter((id) => !foundIds.has(id));
      console.warn('[API /orders POST] Menu items not found for restaurant', {
        restaurantId,
        missingMenuItemIds,
        requestedCount: requestedMenuIds.length,
        foundCount: (foundMenuItems ?? []).length,
      });
      return NextResponse.json(
        {
          error:
            'One or more menu items are invalid or no longer available. Re-seed the catalog (npm run db:seed) and refresh the page, then try again.',
          code: 'MENU_ITEMS_NOT_FOUND',
          missingMenuItemIds,
        },
        { status: 400 },
      );
    }

    const { data: created, error: createError } = await supabaseAdmin.rpc('create_order', {
      p_user_id: auth.profile.id,
      p_restaurant_id: restaurantId,
      p_delivery_location: deliveryLocation,
      p_items: sanitizedItems.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
      })),
    });

    if (createError || !created) {
      console.error('[API /orders POST] create_order RPC failed', createError);
      // 23503 = foreign key, 23505 = unique
      if (createError?.code === '23503') {
        return NextResponse.json(
          {
            error:
              'Could not place order because the restaurant or menu data is out of date. Refresh the page and try again.',
            code: 'FOREIGN_KEY',
          },
          { status: 400 },
        );
      }
      if (createError?.code === '23505') {
        return NextResponse.json(
          {
            error: 'Duplicate menu line on this order. Refresh the page and try again.',
            code: 'DUPLICATE_LINE_ITEM',
          },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const newOrderId = (created as { id: string }).id;

    const { data: orderRow, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select(ORDER_WITH_RELATIONS_SELECT)
      .eq('id', newOrderId)
      .single();

    if (fetchError || !orderRow) {
      console.error('[API /orders POST] Failed to load created order', fetchError);
      return NextResponse.json({ error: 'Order created but could not load it' }, { status: 500 });
    }

    const order = mapOrderWithRelations(orderRow as Parameters<typeof mapOrderWithRelations>[0]);

    if (order.user) {
      console.log('[API /orders POST] Sending order confirmation email...');
      await sendOrderStatusEmail({
        userEmail: order.user.email,
        userName: `${order.user.firstName} ${order.user.lastName}`,
        orderNumber: order.orderNumber,
        status: order.status,
        restaurantName: order.restaurant.name,
        deliveryLocation: order.deliveryLocation,
      });
      console.log('[API /orders POST] Email notification sent');
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Failed to create order', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();
    if (!auth.profile) {
      return NextResponse.json(
        { error: 'No CampusEats profile found for your account.' },
        { status: 403 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(ORDER_WITH_RELATIONS_SELECT)
      .eq('user_id', auth.profile.id)
      .order('placed_at', { ascending: false });

    if (error) {
      console.error('[API /orders GET] Query failed', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    const orders = (data ?? []).map((row) =>
      mapOrderWithRelations(row as Parameters<typeof mapOrderWithRelations>[0]),
    );

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Failed to fetch orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
