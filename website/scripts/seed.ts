/**
 * Seed the catalog (restaurants + menu items) and optionally a batch of demo
 * users. Talks directly to Supabase via the service-role key — no Prisma.
 *
 * Run from website/:
 *   npm run db:seed                            # default: catalog only (no demo users)
 *   SEED_USER_COUNT=10000 npm run db:seed      # also insert 10k demo users
 *
 * Required env in website/.env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '[seed] Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in website/.env',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const USER_COUNT = Math.max(0, Number.parseInt(process.env.SEED_USER_COUNT ?? '0', 10));
const BATCH_SIZE = 1_000;

const restaurantsData = [
  {
    name: 'Chick-fil-A',
    location: 'University of Tampa - Spartan Shops',
    menuItems: [
      { name: 'Original Chicken Sandwich', price: '5.29' },
      { name: 'Chick-n-Strips (3 count)', price: '4.75' },
      { name: 'Spicy Chicken Deluxe Sandwich', price: '6.25' },
      { name: 'Freshly Brewed Iced Tea (Sweet)', price: '1.99' },
      { name: 'Chick-fil-A Lemonade', price: '2.49' },
    ],
  },
  {
    name: 'Aussie Grill',
    location: 'University of Tampa - Food Court',
    menuItems: [
      { name: 'Crispy Chicken Sandwich', price: '7.49' },
      { name: 'BBQ Brisket Sandwich', price: '8.99' },
      { name: 'Grilled Chicken Caesar Wrap', price: '7.75' },
      { name: 'House-Made Lemonade', price: '2.25' },
      { name: 'Bottled Spring Water', price: '1.75' },
    ],
  },
];

async function wipe() {
  // Order matters: children first.
  for (const table of ['order_items', 'orders', 'menu_items', 'users', 'restaurants'] as const) {
    // .neq with an unrealistic value matches every row when no .eq filter exists.
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) {
      console.error(`[seed] Failed to wipe ${table}:`, error.message);
      throw error;
    }
  }
}

async function seedCatalog() {
  for (const restaurant of restaurantsData) {
    const { data: created, error: insertErr } = await supabase
      .from('restaurants')
      .insert({ name: restaurant.name, location: restaurant.location })
      .select('id')
      .single();

    if (insertErr || !created) {
      throw new Error(`Failed to create restaurant ${restaurant.name}: ${insertErr?.message}`);
    }

    const items = restaurant.menuItems.map((item) => ({
      name: item.name,
      price: item.price,
      restaurant_id: created.id,
    }));
    const { error: itemsErr } = await supabase.from('menu_items').insert(items);
    if (itemsErr) {
      throw new Error(`Failed to create menu items for ${restaurant.name}: ${itemsErr.message}`);
    }
  }
}

async function seedUsers() {
  if (USER_COUNT === 0) {
    console.log('Skipping bulk users (SEED_USER_COUNT=0).');
    return;
  }
  console.log(`Seeding ${USER_COUNT} users...`);
  for (let i = 0; i < USER_COUNT; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, USER_COUNT - i);
    const users = Array.from({ length: batchSize }, (_, j) => ({
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      email: `user${i + j}@campuseaters.example.com`,
      phone_number:
        faker.helpers.maybe(() => faker.phone.number(), { probability: 0.7 }) ?? null,
      role: 'USER' as const,
    }));
    const { error } = await supabase.from('users').insert(users);
    if (error) {
      throw new Error(`Failed to insert users batch starting at ${i}: ${error.message}`);
    }
    console.log(`  Created users ${i + 1}-${i + batchSize}`);
  }
  console.log(`✓ Seeded ${USER_COUNT} users`);
}

async function main() {
  console.log('Wiping existing data...');
  await wipe();
  console.log('✓ Wipe complete');

  await seedUsers();

  console.log('Seeding restaurants + menu items...');
  await seedCatalog();
  console.log('✓ Catalog seeded');
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
