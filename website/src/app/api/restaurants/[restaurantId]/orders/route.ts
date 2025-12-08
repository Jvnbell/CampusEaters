import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ restaurantId: string }> | { restaurantId: string } },
) {
  const resolvedParams = await Promise.resolve(params);
  const { restaurantId } = resolvedParams;

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required.' }, { status: 400 });
  }

  try {
    // WORKAROUND: Prisma Data Proxy appears to have caching issues where filtering by restaurantId
    // returns stale data. We'll fetch recent orders with a time filter to bypass cache and filter in memory.
    console.log(`[API] Fetching recent orders and filtering in memory to work around Data Proxy cache...`);
    
    // Get orders from the last 30 days to ensure we capture recent orders and bypass some caching
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let allOrdersWithDetails = await prisma.order.findMany({
      where: {
        placedAt: {
          gte: thirtyDaysAgo, // Only get orders from last 30 days
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
        placedAt: 'desc',
      },
      take: 100, // Increased limit to ensure we get all recent orders
    });
    
    console.log(`[API] Found ${allOrdersWithDetails.length} total orders in database (last 30 days)`);
    console.log(`[API] Before filtering:`, allOrdersWithDetails.map(o => ({
      orderNumber: o.orderNumber,
      status: o.status,
      restaurantId: o.restaurantId,
      placedAt: o.placedAt.toISOString(),
    })));
    
    // Also check if we should query by orderNumber to catch very recent orders that might be missed
    // Get the highest order number we found
    const maxOrderNumber = allOrdersWithDetails.length > 0 
      ? Math.max(...allOrdersWithDetails.map(o => o.orderNumber))
      : 0;
    
    console.log(`[API] Max order number found: ${maxOrderNumber}`);
    
    // If we have orders but might be missing recent ones, query by orderNumber as well
    // This is a backup to catch orders that might not be in the time-based query
    if (maxOrderNumber > 0) {
      const recentOrdersByNumber = await prisma.order.findMany({
        where: {
          orderNumber: {
            gte: Math.max(1, maxOrderNumber - 10), // Get last 10 order numbers as backup
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          restaurantId: true,
          placedAt: true,
        },
      });
      
      console.log(`[API] Found ${recentOrdersByNumber.length} orders by orderNumber query`);
      
      // Merge any orders we found by orderNumber that weren't in the time-based query
      const existingIds = new Set(allOrdersWithDetails.map(o => o.id));
      const missingOrders = recentOrdersByNumber.filter(o => !existingIds.has(o.id));
      
      if (missingOrders.length > 0) {
        console.log(`[API] Found ${missingOrders.length} orders missing from time-based query, fetching full details...`);
        
        // Fetch full details for missing orders
        const missingOrdersFull = await Promise.all(
          missingOrders.map(async (order) => {
            try {
              return await prisma.order.findUnique({
                where: { id: order.id },
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
              });
            } catch (e) {
              console.error(`[API] Error fetching missing order ${order.id}:`, e);
              return null;
            }
          })
        );
        
        // Add missing orders to our list
        const validMissingOrders = missingOrdersFull.filter((o): o is NonNullable<typeof o> => o !== null);
        allOrdersWithDetails = [...allOrdersWithDetails, ...validMissingOrders];
        console.log(`[API] Total orders after merging: ${allOrdersWithDetails.length}`);
      }
    }
    
    // Filter in memory for the specific restaurant and active statuses
    // EXCLUDE DELIVERED explicitly to handle any remaining cache staleness
    const activeOrders = allOrdersWithDetails.filter(
      (order) =>
        order.restaurantId === restaurantId &&
        order.status !== 'DELIVERED' &&
        (order.status === 'SENT' || order.status === 'RECEIVED' || order.status === 'SHIPPING')
    );
    
    console.log(`[API] Filtered to ${activeOrders.length} active orders for restaurant ${restaurantId}`);
    
    // Sort by placedAt ascending for display
    activeOrders.sort((a, b) => a.placedAt.getTime() - b.placedAt.getTime());
    
    console.log(`[API] Active orders details:`, activeOrders.map(o => ({
      orderNumber: o.orderNumber,
      status: o.status,
      id: o.id,
    })));
    
    return NextResponse.json({ orders: activeOrders });
  } catch (error) {
    console.error('[API] Failed to fetch restaurant orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
  }
}



