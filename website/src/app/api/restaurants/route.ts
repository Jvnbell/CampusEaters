import { NextResponse } from 'next/server';

import { mapRestaurantWithMenu } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Always read live menu data (avoid stale CDN/browser caches of the catalog). */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, location, menu_items(id, name, price)')
      .order('name', { ascending: true });

    if (error) {
      console.error('[API /restaurants GET] Failed to load', error);
      return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 });
    }

    const response = NextResponse.json({
      restaurants: (data ?? []).map((row) =>
        mapRestaurantWithMenu(row as Parameters<typeof mapRestaurantWithMenu>[0]),
      ),
    });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Failed to fetch restaurants', error);
    return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 });
  }
}
