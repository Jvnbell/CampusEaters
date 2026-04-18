import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service role key. Bypasses RLS — never
 * import this from any code that ships to the browser.
 *
 * The Next.js API routes use this to read and write CampusEats data, while
 * authentication is still verified through the cookie-bound server client in
 * `@/lib/supabase/server`.
 *
 * We deliberately keep this client untyped (no Database generic): all rows are
 * funnelled through the mappers in `@/lib/db/mappers`, which apply the proper
 * TS types before returning data to API consumers.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}
if (!serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to website/.env (server-only — never NEXT_PUBLIC_).',
  );
}

declare global {
  // Reuse the client across hot-reloads in dev so we don't leak websockets.
  // eslint-disable-next-line no-var
  var __supabaseAdmin: SupabaseClient | undefined;
}

export const supabaseAdmin: SupabaseClient =
  globalThis.__supabaseAdmin ??
  createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__supabaseAdmin = supabaseAdmin;
}
