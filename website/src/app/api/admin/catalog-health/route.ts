import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Admin-only snapshot of restaurant/menu data. Used to surface setup issues
 * (e.g. empty catalog after deploy).
 */
export async function GET() {
  try {
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();
    if (auth.profile?.role !== 'ADMIN') {
      return forbidden('Only administrators can view catalog health.');
    }

    const [menuItemsResult, restaurantsResult] = await Promise.all([
      supabaseAdmin.from('menu_items').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('restaurants').select('id', { count: 'exact', head: true }),
    ]);

    if (menuItemsResult.error || restaurantsResult.error) {
      console.error(
        '[admin/catalog-health] Count failed',
        menuItemsResult.error ?? restaurantsResult.error,
      );
      return NextResponse.json({ error: 'Failed to load catalog health' }, { status: 500 });
    }

    const menuItemCount = menuItemsResult.count ?? 0;
    const restaurantCount = restaurantsResult.count ?? 0;

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
