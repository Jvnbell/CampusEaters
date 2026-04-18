/**
 * Load script: creates 100 orders per minute for 10 minutes (1000 orders total)
 * and mocks restaurant fulfillment by advancing order statuses over time.
 *
 * Run from website/: npx tsx scripts/order-load.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

const ORDERS_PER_MINUTE = 100;
const DURATION_MINUTES = 10;
const FULFILLMENT_BATCH = 100;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '[order-load] Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in website/.env',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type RestaurantWithMenu = {
  id: string;
  name: string;
  menu_items: { id: string }[];
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function createOrder(
  restaurant: RestaurantWithMenu,
  userId: string,
): Promise<void> {
  const numItems = 1 + Math.floor(Math.random() * Math.min(3, restaurant.menu_items.length));
  const menuItems = pickN(restaurant.menu_items, numItems);
  const deliveryLocation = faker.location.streetAddress({ useFullAddress: true });

  const { error } = await supabase.rpc('create_order', {
    p_user_id: userId,
    p_restaurant_id: restaurant.id,
    p_delivery_location: deliveryLocation,
    p_items: menuItems.map((mi) => ({
      menu_item_id: mi.id,
      quantity: 1 + Math.floor(Math.random() * 2),
    })),
  });
  if (error) {
    throw new Error(`create_order RPC failed: ${error.message}`);
  }
}

async function advanceFulfillment(): Promise<void> {
  const transitions: Array<{ from: 'SENT' | 'RECEIVED' | 'SHIPPING'; to: string }> = [
    { from: 'SENT', to: 'RECEIVED' },
    { from: 'RECEIVED', to: 'SHIPPING' },
    { from: 'SHIPPING', to: 'DELIVERED' },
  ];

  for (const { from, to } of transitions) {
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('status', from)
      .order('placed_at', { ascending: true })
      .limit(FULFILLMENT_BATCH);

    if (error) {
      console.error(`[order-load] Failed to read ${from} orders:`, error.message);
      continue;
    }
    if (!data?.length) continue;

    const ids = data.map((row) => row.id);
    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: to })
      .in('id', ids);
    if (updateErr) {
      console.error(`[order-load] Failed to advance ${from} → ${to}:`, updateErr.message);
      continue;
    }
    console.log(`  Fulfillment: ${ids.length} ${from} → ${to}`);
  }
}

async function main(): Promise<void> {
  const { data: restaurants, error: restaurantsErr } = await supabase
    .from('restaurants')
    .select('id, name, menu_items(id)');

  if (restaurantsErr) {
    throw new Error(`Failed to load restaurants: ${restaurantsErr.message}`);
  }
  if (!restaurants?.length) {
    throw new Error('No restaurants found. Run `npm run db:seed` first.');
  }

  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id')
    .limit(50_000);
  if (usersErr) throw new Error(`Failed to load users: ${usersErr.message}`);
  if (!users?.length) {
    throw new Error('No users found. Run `npm run db:seed` first.');
  }

  const restaurantList = restaurants as RestaurantWithMenu[];
  const userIds = users.map((u) => u.id);

  console.log(`Restaurants: ${restaurantList.length}, Users: ${userIds.length}`);
  console.log(
    `Creating ${ORDERS_PER_MINUTE} orders/minute for ${DURATION_MINUTES} minutes (${ORDERS_PER_MINUTE * DURATION_MINUTES} total).\n`,
  );

  for (let minute = 0; minute < DURATION_MINUTES; minute++) {
    const minuteStart = Date.now();
    console.log(`--- Minute ${minute + 1}/${DURATION_MINUTES} ---`);

    for (let i = 0; i < ORDERS_PER_MINUTE; i++) {
      const restaurant = pick(restaurantList);
      const userId = pick(userIds);
      await createOrder(restaurant, userId);
    }
    console.log(`  Created ${ORDERS_PER_MINUTE} orders`);

    await advanceFulfillment();

    const elapsed = Date.now() - minuteStart;
    const wait = Math.max(0, 60_000 - elapsed);
    if (wait > 0 && minute < DURATION_MINUTES - 1) {
      console.log(`  Waiting ${(wait / 1000).toFixed(1)}s until next minute...\n`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  // Final per-status counts.
  const statuses = ['SENT', 'RECEIVED', 'SHIPPING', 'DELIVERED'] as const;
  console.log('\nDone. Order counts by status:');
  for (const status of statuses) {
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    if (error) {
      console.error(`  ${status}: error (${error.message})`);
    } else {
      console.log(`  ${status}: ${count ?? 0}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
