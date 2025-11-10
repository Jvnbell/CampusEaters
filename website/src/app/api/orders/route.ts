import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

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
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Failed to create order', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}


