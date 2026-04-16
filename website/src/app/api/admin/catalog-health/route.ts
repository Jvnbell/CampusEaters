import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Admin-only snapshot of restaurant/menu data. Used to surface setup issues (e.g. empty catalog after deploy).
 */
export async function GET() {
  try {
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();
    if (auth.profile?.role !== 'ADMIN') {
      return forbidden('Only administrators can view catalog health.');
    }

    const [menuItemCount, restaurantCount] = await Promise.all([
      prisma.menuItem.count(),
      prisma.restaurant.count(),
    ]);

    return NextResponse.json({
      menuItemCount,
      restaurantCount,
      hasMenuCatalog: menuItemCount > 0,
    });
  } catch (error) {
    console.error('[admin/catalog-health] Failed to load counts', error);
    return NextResponse.json({ error: 'Failed to load catalog health' }, { status: 500 });
  }
}
