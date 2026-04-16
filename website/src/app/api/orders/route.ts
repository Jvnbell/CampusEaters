import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/email';
import { getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';

type CreateOrderBody = {
  restaurantId: string;
  userId?: string; // ignored; server uses authenticated user's profile id
  deliveryLocation: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
};

const generateOrderNumber = async () => {
  const aggregate = await prisma.order.aggregate({
    _max: {
      orderNumber: true,
    },
  });

  const nextNumber = (aggregate._max.orderNumber ?? 1000) + 1;
  return nextNumber;
};

/** Combine duplicate menu lines (same id) into one row with summed quantity. */
const mergeLineItems = (items: Array<{ menuItemId: string; quantity: number }>) => {
  const map = new Map<string, number>();
  for (const { menuItemId, quantity } of items) {
    map.set(menuItemId, (map.get(menuItemId) ?? 0) + quantity);
  }
  return [...map.entries()].map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
};

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

    if (!restaurantId || !deliveryLocation || !Array.isArray(body.items) || body.items.length === 0) {
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
        .filter((item) => item.menuItemId.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0),
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

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });
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

    const requestedMenuIds = [...new Set(sanitizedItems.map((item) => item.menuItemId))];

    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        id: {
          in: requestedMenuIds,
        },
      },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (menuItems.length !== requestedMenuIds.length) {
      const foundIds = new Set(menuItems.map((m) => m.id));
      const missingMenuItemIds = requestedMenuIds.filter((id) => !foundIds.has(id));
      console.warn('[API /orders POST] Menu items not found for restaurant', {
        restaurantId,
        missingMenuItemIds,
        requestedCount: requestedMenuIds.length,
        foundCount: menuItems.length,
      });
      return NextResponse.json(
        {
          error:
            'One or more menu items are invalid or no longer available. Run `npx prisma db seed` in /website if the database was empty, then refresh and try again.',
          code: 'MENU_ITEMS_NOT_FOUND',
          missingMenuItemIds,
        },
        { status: 400 },
      );
    }

    const orderNumber = await generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId,
        userId: auth.profile.id,
        deliveryLocation,
        orderItems: {
          create: sanitizedItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    // Send email notification when order is created (status is SENT by default)
    if (order.user && order.restaurant) {
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
    } else {
      console.warn('[API /orders POST] Cannot send email - missing user or restaurant data');
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Failed to create order', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json(
          {
            error:
              'Could not place order because the restaurant or menu data is out of date. Refresh the page and try again.',
            code: 'FOREIGN_KEY',
          },
          { status: 400 },
        );
      }
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            error: 'Duplicate menu line on this order. Refresh the page and try again.',
            code: 'DUPLICATE_LINE_ITEM',
          },
          { status: 400 },
        );
      }
    }
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();
    if (!auth.profile) {
      return NextResponse.json(
        { error: 'No CampusEats profile found for your account.' },
        { status: 403 },
      );
    }

    const orders = await prisma.order.findMany({
      where: { userId: auth.profile.id },
      include: {
        restaurant: {
          select: {
            name: true,
            location: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            menuItem: {
              select: {
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        placedAt: 'desc',
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Failed to fetch orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}


