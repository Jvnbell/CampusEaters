import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

import { supabaseAdmin } from '@/lib/supabase/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
  );
}

/**
 * Create a Supabase client for use in Route Handlers and Server Components.
 * Reads session from cookies so API routes can verify the authenticated user.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll can be ignored in Route Handlers when only reading session
        }
      },
    },
  });
}

/**
 * Resolve the authenticated user for the current request.
 *
 * Two paths are supported, in priority order:
 *  1. `Authorization: Bearer <jwt>` header — used by the React Native / Expo
 *     app, which doesn't share cookies with the website.
 *  2. The Supabase cookie session — used by the Next.js website itself.
 *
 * Returns null when neither path produces a valid Supabase user.
 */
export async function getAuthUser() {
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization') ?? headerStore.get('Authorization');

  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      // The admin client bypasses RLS, but auth.getUser(jwt) still validates
      // the JWT against Supabase Auth — so we trust its `user.email`.
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data.user) return data.user;
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}
