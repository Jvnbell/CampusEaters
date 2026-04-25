import { NextResponse } from 'next/server';

import { mapRestaurantWithMenuAndRating } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { RestaurantRatingRow } from '@/types/db';

/** Always read live menu data (avoid stale CDN/browser caches of the catalog). */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Two parallel reads instead of one embedded select. PostgREST can't
    // auto-detect a foreign-key relationship to `restaurant_ratings` because
    // it's a view, not a table — embedding it (`restaurant_ratings(...)`)
    // throws PGRST200. We merge the rating aggregates in JS instead.
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
      // Ratings are best-effort; log and treat every restaurant as unrated.
      console.error('[API /restaurants GET] Failed to load ratings', ratingsResult.error);
    }

    const ratingsByRestaurant = new Map<string, Pick<RestaurantRatingRow, 'review_count' | 'average_rating'>>();
    for (const row of (ratingsResult.data ?? []) as RestaurantRatingRow[]) {
      ratingsByRestaurant.set(row.restaurant_id, {
        review_count: row.review_count,
        average_rating: row.average_rating,
      });
    }

    const restaurants = (restaurantsResult.data ?? []).map((row) => {
      const ratingRow = ratingsByRestaurant.get((row as { id: string }).id) ?? null;
      return mapRestaurantWithMenuAndRating({
        ...(row as Parameters<typeof mapRestaurantWithMenuAndRating>[0]),
        restaurant_ratings: ratingRow,
      });
    });

    const response = NextResponse.json({ restaurants });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (error) {
    console.error('Failed to fetch restaurants', error);
    return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 });
  }
}
