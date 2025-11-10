import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

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

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error('Failed to fetch restaurants', error);
    return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 });
  }
}


