/**
 * Promote an existing CampusEats account (or create a new one) to ADMIN.
 *
 * Admins can access the operations console at /operations.
 *
 * Run from website/:
 *   GRANT_EMAIL=you@spartans.ut.edu npx tsx scripts/grant-admin.ts
 *
 * If the auth user does not exist yet, set GRANT_PASSWORD too (or accept the
 * generated one printed to stdout).
 */

import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '[grant-admin] Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in website/.env',
  );
  process.exit(1);
}

const email = process.env.GRANT_EMAIL?.trim().toLowerCase();
if (!email) {
  console.error('[grant-admin] Set GRANT_EMAIL=<email> when running this script.');
  process.exit(1);
}

const requestedPassword = process.env.GRANT_PASSWORD?.trim();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function generatePassword() {
  return randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, 'A').slice(0, 16);
}

async function findOrCreateAuthUser(): Promise<{
  id: string;
  createdNow: boolean;
  password: string | null;
}> {
  const { data: list, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(`Failed to list auth users: ${error.message}`);

  const users = (list.users ?? []) as Array<{ id: string; email?: string | null }>;
  const existing = users.find((u) => u.email?.toLowerCase() === email);
  if (existing) return { id: existing.id, createdNow: false, password: null };

  const password = requestedPassword ?? generatePassword();
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'Ops', last_name: 'Admin', role: 'ADMIN' },
  });
  if (createErr || !created.user) {
    throw new Error(`Failed to create auth user: ${createErr?.message ?? 'no user returned'}`);
  }
  return { id: created.user.id, createdNow: true, password };
}

async function upsertProfile(): Promise<void> {
  const { error } = await supabase
    .from('users')
    .upsert(
      {
        email,
        first_name: 'Ops',
        last_name: 'Admin',
        role: 'ADMIN',
        restaurant_id: null,
      },
      { onConflict: 'email' },
    );
  if (error) throw new Error(`Failed to upsert public.users row: ${error.message}`);
}

async function main() {
  console.log(`Granting ADMIN to ${email}\n`);

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

  await upsertProfile();
  console.log('✓ Upserted public.users row with role=ADMIN');
  console.log('\nDone. Sign in, then visit /operations.');
}

main().catch((error) => {
  console.error('grant-admin failed:', error);
  process.exit(1);
});
