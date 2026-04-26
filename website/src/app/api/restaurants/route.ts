import { NextResponse } from 'next/server';

import { mapRestaurantWithMenuAndRating } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Always read live menu data (avoid stale CDN/browser caches of the catalog). */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // PostgREST can't infer a relationship from `restaurants` to the
    // `restaurant_ratings` view (views have no foreign keys), so we fetch the
    // aggregate separately and merge by id below.
    const [restaurantsResult, ratingsResult] = await Promise.all([
      supabaseAdmin
        .from('restaurants')
        .select('id, name, location, menu_items(id, name, price)')
        .order('name', { ascending: true }),
      supabaseAdmin
        .from('restaurant_ratings')
        .select('restaurant_id, review_count, average_rating'),
    ]);

    if (restaurantsResult.error) {
      console.error('[API /restaurants GET] Failed to load', restaurantsResult.error);
      return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 });
    }
    if (ratingsResult.error) {
      // Non-fatal — fall through with zero ratings rather than 500'ing the
      // entire browse page.
      console.error('[API /restaurants GET] Failed to load ratings', ratingsResult.error);
    }

    const ratingsById = new Map(
      (ratingsResult.data ?? []).map((r) => [r.restaurant_id, r] as const),
    );

    const response = NextResponse.json({
      restaurants: (restaurantsResult.data ?? []).map((row) =>
        mapRestaurantWithMenuAndRating({
          ...row,
          restaurant_ratings: ratingsById.get(row.id) ?? null,
        } as unknown as Parameters<typeof mapRestaurantWithMenuAndRating>[0]),
      ),
    });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Failed to fetch restaurants', error);
    return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 });
  }
}
