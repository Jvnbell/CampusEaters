import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

/** Always read live menu data (avoid stale CDN/browser caches of the catalog). */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        menuItems: {
          select: {
            id: true,
            name: true,
            price: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const response = NextResponse.json({
      restaurants: restaurants.map((r) => ({
        ...r,
        menuItems: r.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price.toString(),
        })),
      })),
    });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Failed to fetch restaurants', error);
    return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 });
  }
}


