import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { orderNumber: string } },
) {
  const orderNumber = Number(params.orderNumber);

  if (Number.isNaN(orderNumber)) {
    return NextResponse.json({ error: 'Invalid order number' }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
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

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Failed to fetch order', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}


