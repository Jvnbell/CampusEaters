import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

const VALID_STATUSES = ['SENT', 'RECEIVED', 'SHIPPING', 'DELIVERED'] as const;

type UpdatePayload = {
  status?: (typeof VALID_STATUSES)[number];
  botId?: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  const { orderId } = params;

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
  }

  const body = (await request.json()) as UpdatePayload;

  if (!body.status && body.botId === undefined) {
    return NextResponse.json({ error: 'Provide at least one field to update.' }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: body.status,
        botId: body.botId,
      },
      include: {
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

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Failed to update order', error);
    return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
  }
}


