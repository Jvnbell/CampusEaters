import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { restaurantId: string } },
) {
  const { restaurantId } = params;

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required.' }, { status: 400 });
  }

  try {
    const activeOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: {
          not: 'DELIVERED',
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
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
        placedAt: 'asc',
      },
    });

    return NextResponse.json({ orders: activeOrders });
  } catch (error) {
    console.error('Failed to fetch restaurant orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
  }
}



