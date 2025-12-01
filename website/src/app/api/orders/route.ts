import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/email';

type CreateOrderBody = {
  restaurantId: string;
  userId: string;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderBody;

    if (
      !body.restaurantId ||
      !body.userId ||
      !body.deliveryLocation ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, userId, deliveryLocation, and at least one item.' },
        { status: 400 },
      );
    }

    const sanitizedItems = body.items
      .filter((item) => item.menuItemId && item.quantity > 0)
      .map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      }));

    if (sanitizedItems.length === 0) {
      return NextResponse.json({ error: 'No valid menu items were provided.' }, { status: 400 });
    }

    // Ensure all menu items belong to the selected restaurant
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: {
          in: sanitizedItems.map((item) => item.menuItemId),
        },
      },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    const invalidItem = menuItems.find((item) => item.restaurantId !== body.restaurantId);
    if (invalidItem) {
      return NextResponse.json({ error: 'Menu items must belong to the selected restaurant.' }, { status: 400 });
    }

    const orderNumber = await generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId: body.restaurantId,
        userId: body.userId,
        deliveryLocation: body.deliveryLocation,
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
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId query parameter.' }, { status: 400 });
    }

    const orders = await prisma.order.findMany({
      where: { userId },
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


