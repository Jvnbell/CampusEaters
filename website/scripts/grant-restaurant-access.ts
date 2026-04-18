/**
 * One-off admin script: ensures a Supabase Auth user exists for a given email,
 * then upserts a `public.users` row with role=RESTAURANT bound to a named
 * restaurant. Use it to grant restaurant-staff access without going through
 * the signup flow.
 *
 * Run from website/:
 *   GRANT_EMAIL=troqeendi@gmail.com GRANT_RESTAURANT="Chick-fil-A" \
 *     GRANT_PASSWORD="<optional>" npx tsx scripts/grant-restaurant-access.ts
 *
 * Defaults to email=troqeendi@gmail.com and restaurant=Chick-fil-A.
 */

import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '[grant] Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in website/.env',
  );
  process.exit(1);
}

const email = (process.env.GRANT_EMAIL ?? 'troqeendi@gmail.com').trim().toLowerCase();
const restaurantName = (process.env.GRANT_RESTAURANT ?? 'Chick-fil-A').trim();
const requestedPassword = process.env.GRANT_PASSWORD?.trim();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function generatePassword(): string {
  // url-safe-ish random password, plenty of entropy.
  return randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, 'A').slice(0, 16);
}

async function findRestaurantId(name: string): Promise<string> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', name)
    .maybeSingle();
  if (error) throw new Error(`Lookup failed for restaurant "${name}": ${error.message}`);
  if (!data) {
    throw new Error(
      `No restaurant named "${name}" found. Run "npm run db:seed" first.`,
    );
  }
  return data.id;
}

async function findOrCreateAuthUser(): Promise<{ id: string; createdNow: boolean; password: string | null }> {
  // Search the auth.users table via admin API.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw new Error(`Failed to list auth users: ${listError.message}`);

  const existing = list.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    return { id: existing.id, createdNow: false, password: null };
  }

  const password = requestedPassword ?? generatePassword();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: 'Chick-fil-A',
      last_name: 'Staff',
      role: 'RESTAURANT',
    },
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create auth user: ${createError?.message ?? 'no user returned'}`);
  }
  return { id: created.user.id, createdNow: true, password };
}

async function upsertProfile(restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .upsert(
      {
        email,
        first_name: 'Chick-fil-A',
        last_name: 'Staff',
        role: 'RESTAURANT',
        restaurant_id: restaurantId,
      },
      { onConflict: 'email' },
    );
  if (error) {
    throw new Error(`Failed to upsert public.users row: ${error.message}`);
  }
}

async function main(): Promise<void> {
  console.log(`Granting RESTAURANT access:`);
  console.log(`  email      = ${email}`);
  console.log(`  restaurant = ${restaurantName}\n`);

  const restaurantId = await findRestaurantId(restaurantName);
  console.log(`✓ Found restaurant "${restaurantName}" (id=${restaurantId})`);

  const auth = await findOrCreateAuthUser();
  if (auth.createdNow) {
    console.log(`✓ Created Supabase Auth user (id=${auth.id})`);
    if (auth.password) {
      console.log(`\n  TEMPORARY PASSWORD: ${auth.password}`);
      console.log('  Change it via "Forgot password" once you sign in.\n');
    }
  } else {
    console.log(`✓ Found existing Supabase Auth user (id=${auth.id})`);
  }

  await upsertProfile(restaurantId);
  console.log(`✓ Upserted public.users row with role=RESTAURANT, restaurant_id=${restaurantId}`);

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('grant-restaurant-access failed:', error);
  process.exit(1);
});
