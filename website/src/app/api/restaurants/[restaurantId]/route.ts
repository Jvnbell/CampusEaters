import { NextResponse } from 'next/server';

import { mapRestaurantWithMenuAndRating, mapReview } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Detail endpoint for the public restaurant browse / detail pages. */
export const dynamic = 'force-dynamic';

const RESTAURANT_DETAIL_SELECT =
  'id, name, location, ' +
  'menu_items(id, name, price), ' +
  'restaurant_ratings(review_count, average_rating)';

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

  // Restaurant + menu + rating aggregate in one round trip.
  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .select(RESTAURANT_DETAIL_SELECT)
    .eq('id', restaurantId)
    .maybeSingle();

  if (restaurantError) {
    console.error('[api/restaurants/:id GET] restaurant lookup failed', restaurantError);
    return NextResponse.json({ error: 'Failed to load restaurant.' }, { status: 500 });
  }
  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
  }

  // Most recent 50 reviews — enough for the "recent reviews" section without
  // paginating yet. Reviewer names are joined for display.
  const { data: reviewsData, error: reviewsError } = await supabaseAdmin
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (reviewsError) {
    console.error('[api/restaurants/:id GET] reviews lookup failed', reviewsError);
    return NextResponse.json({ error: 'Failed to load reviews.' }, { status: 500 });
  }

  const response = NextResponse.json({
    restaurant: mapRestaurantWithMenuAndRating(
      restaurant as unknown as Parameters<typeof mapRestaurantWithMenuAndRating>[0],
    ),
    reviews: (reviewsData ?? []).map((row) =>
      mapReview(row as unknown as Parameters<typeof mapReview>[0]),
    ),
  });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
