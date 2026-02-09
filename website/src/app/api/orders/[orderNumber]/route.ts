import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getAuthUserAndProfile, unauthorized, forbidden } from '@/lib/api-auth';

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
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
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
        bot: {
          select: {
            id: true,
            primaryLocation: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

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


