import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/email';

const VALID_STATUSES = ['SENT', 'RECEIVED', 'SHIPPING', 'DELIVERED'] as const;

type UpdatePayload = {
  status?: (typeof VALID_STATUSES)[number];
  botId?: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } },
) {
  const resolvedParams = await Promise.resolve(params);
  const { orderId } = resolvedParams;

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
  }
  
  console.log(`[API] Updating order ${orderId}`);

  const body = (await request.json()) as UpdatePayload;

  if (!body.status && body.botId === undefined) {
    return NextResponse.json({ error: 'Provide at least one field to update.' }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status provided.' }, { status: 400 });
  }

  try {
    // Get current order to check if status is changing
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        orderNumber: true,
        deliveryLocation: true,
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

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const statusChanged = body.status && body.status !== currentOrder.status;
    
    console.log(`[API] Current status: ${currentOrder.status}, New status: ${body.status}, Changed: ${statusChanged}`);

    const updateData: { status?: string; botId?: string | null } = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.botId !== undefined) {
      updateData.botId = body.botId;
    }

    console.log(`[API] Update data:`, updateData);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
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
    
    console.log(`[API] Order updated successfully. Order #${updatedOrder.orderNumber} status is now: ${updatedOrder.status}`);

    // Send email notification if status changed
    if (statusChanged && body.status && updatedOrder.user && updatedOrder.restaurant) {
      console.log('[API /orders/id PATCH] Sending status update email...');
      await sendOrderStatusEmail({
        userEmail: updatedOrder.user.email,
        userName: `${updatedOrder.user.firstName} ${updatedOrder.user.lastName}`,
        orderNumber: updatedOrder.orderNumber,
        status: body.status,
        restaurantName: updatedOrder.restaurant.name,
        deliveryLocation: updatedOrder.deliveryLocation,
      });
      console.log('[API /orders/id PATCH] Email notification sent');
    } else if (body.status && !statusChanged) {
      console.log('[API /orders/id PATCH] Status unchanged, skipping email');
    } else {
      console.log('[API /orders/id PATCH] No status change or missing data, skipping email');
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Failed to update order', error);
    return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
  }
}



