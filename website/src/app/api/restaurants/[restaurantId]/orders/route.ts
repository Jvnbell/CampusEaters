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
    // First, let's check what orders exist for this restaurant and their actual statuses
    const allOrders = await prisma.order.findMany({
      where: { restaurantId },
      select: { id: true, orderNumber: true, status: true },
    });
    console.log(`[API] All orders for restaurant ${restaurantId}:`, allOrders);
    console.log(`[API] Order statuses breakdown:`, {
      SENT: allOrders.filter(o => o.status === 'SENT').length,
      RECEIVED: allOrders.filter(o => o.status === 'RECEIVED').length,
      SHIPPING: allOrders.filter(o => o.status === 'SHIPPING').length,
      DELIVERED: allOrders.filter(o => o.status === 'DELIVERED').length,
    });
    
    // Use NOT instead of IN to be more explicit about excluding DELIVERED
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

    // Double-check: filter out any DELIVERED orders that might have slipped through
    const filteredOrders = activeOrders.filter((order) => {
      const isDelivered = order.status === 'DELIVERED';
      if (isDelivered) {
        console.warn(`[API] Found DELIVERED order that slipped through: #${order.orderNumber} (ID: ${order.id})`);
      }
      return !isDelivered;
    });
    
    console.log(`[API] Query returned ${activeOrders.length} orders`);
    console.log(`[API] After filtering DELIVERED: ${filteredOrders.length} active orders`);
    console.log(`[API] Final order statuses:`, filteredOrders.map((o) => ({ 
      number: o.orderNumber, 
      status: o.status,
      statusType: typeof o.status 
    })));
    
    if (filteredOrders.length !== activeOrders.length) {
      console.warn(`[API] WARNING: Filtered out ${activeOrders.length - filteredOrders.length} DELIVERED orders that shouldn't have been returned by query!`);
      const deliveredOrders = activeOrders.filter(o => o.status === 'DELIVERED');
      console.warn(`[API] DELIVERED orders that were returned:`, deliveredOrders.map(o => ({ 
        number: o.orderNumber, 
        id: o.id,
        status: o.status 
      })));
    }
    
    return NextResponse.json({ orders: filteredOrders });
  } catch (error) {
    console.error('Failed to fetch restaurant orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
  }
}



