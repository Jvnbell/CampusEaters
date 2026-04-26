import { NextResponse } from 'next/server';

import { mapRestaurantWithMenuAndRating, mapReview } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Detail endpoint for the public restaurant browse / detail pages. */
export const dynamic = 'force-dynamic';

const RESTAURANT_DETAIL_SELECT = 'id, name, location, menu_items(id, name, price)';

const REVIEW_SELECT = `
  id, order_id, user_id, restaurant_id, rating, comment, created_at, updated_at,
  reviewer:users(first_name, last_name)
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ restaurantId: string }> | { restaurantId: string } },
) {
  const { restaurantId } = await Promise.resolve(params);
  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required.' }, { status: 400 });
  }

  // Restaurant, rating aggregate, and recent reviews in parallel. The rating
  // view isn't joinable via PostgREST embed (no FK on a view), so we query it
  // directly and merge by id.
  const [restaurantResult, ratingResult, reviewsResult] = await Promise.all([
    supabaseAdmin
      .from('restaurants')
      .select(RESTAURANT_DETAIL_SELECT)
      .eq('id', restaurantId)
      .maybeSingle(),
    supabaseAdmin
      .from('restaurant_ratings')
      .select('review_count, average_rating')
      .eq('restaurant_id', restaurantId)
      .maybeSingle(),
    supabaseAdmin
      .from('reviews')
      .select(REVIEW_SELECT)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (restaurantResult.error) {
    console.error('[api/restaurants/:id GET] restaurant lookup failed', restaurantResult.error);
    return NextResponse.json({ error: 'Failed to load restaurant.' }, { status: 500 });
  }
  if (!restaurantResult.data) {
    return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
  }
  if (reviewsResult.error) {
    console.error('[api/restaurants/:id GET] reviews lookup failed', reviewsResult.error);
    return NextResponse.json({ error: 'Failed to load reviews.' }, { status: 500 });
  }
  if (ratingResult.error) {
    // Non-fatal: fall through with zeroed rating instead of 500'ing the page.
    console.error('[api/restaurants/:id GET] rating lookup failed', ratingResult.error);
  }

  const response = NextResponse.json({
    restaurant: mapRestaurantWithMenuAndRating({
      ...restaurantResult.data,
      restaurant_ratings: ratingResult.data ?? null,
    } as unknown as Parameters<typeof mapRestaurantWithMenuAndRating>[0]),
    reviews: (reviewsResult.data ?? []).map((row) =>
      mapReview(row as unknown as Parameters<typeof mapReview>[0]),
    ),
  });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
