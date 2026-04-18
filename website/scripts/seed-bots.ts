/**
 * Idempotent seed of the operations fleet.
 *
 * Inserts (or updates by name) three demo robots so the operations console
 * has something to render. Run this AFTER applying
 * supabase/migrations/0002_operations.sql.
 *
 * Run from website/:
 *   npx tsx scripts/seed-bots.ts
 *
 * Required env in website/.env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    '[seed-bots] Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in website/.env',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fleet = [
  {
    name: 'Spartan-01',
    primary_location: 'Vaughn Center Loading Dock',
    current_location: 'Vaughn Center Loading Dock',
    status: 'IDLE' as const,
    battery_level: 92,
  },
  {
    name: 'Spartan-02',
    primary_location: 'Plant Hall Courtyard',
    current_location: 'Plant Hall Courtyard',
    status: 'CHARGING' as const,
    battery_level: 41,
  },
  {
    name: 'Spartan-03',
    primary_location: 'Sykes College of Business',
    current_location: 'Sykes College of Business',
    status: 'OFFLINE' as const,
    battery_level: 0,
  },
];

async function main() {
  console.log(`Seeding ${fleet.length} bots (idempotent upsert by name)...`);

  for (const bot of fleet) {
    const { data, error } = await supabase
      .from('bots')
      .upsert(
        {
          ...bot,
          last_heartbeat_at: new Date().toISOString(),
        },
        { onConflict: 'name' },
      )
      .select('id, name, status')
      .single();

    if (error) {
      console.error(`[seed-bots] Failed to upsert ${bot.name}: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ✓ ${data.name}  status=${data.status}  id=${data.id}`);
  }

  console.log('\nDone. Open /operations to see them.');
}

main().catch((error) => {
  console.error('seed-bots failed:', error);
  process.exit(1);
});
