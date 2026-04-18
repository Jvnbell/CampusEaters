import { NextResponse } from 'next/server';

import { mapAuthProfile } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/supabase/server';
import type { AuthProfile } from '@/types/db';

export type { AuthProfile };

/**
 * Resolve the authenticated Supabase user and their CampusEats profile row.
 * Returns null when the request has no valid session; `profile` is null when
 * the Supabase user has no matching row in `public.users` yet (auto-provision
 * happens in the /api/users route).
 */
export async function getAuthUserAndProfile(): Promise<{
  authUser: { id: string; email: string };
  profile: AuthProfile | null;
} | null> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return null;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, role, restaurant_id')
    .eq('email', authUser.email)
    .maybeSingle();

  if (error) {
    // Don't crash the route — surface as "no profile" so the caller can decide.
    console.error('[api-auth] Failed to load profile for', authUser.email, error);
    return {
      authUser: { id: authUser.id, email: authUser.email },
      profile: null,
    };
  }

  return {
    authUser: { id: authUser.id, email: authUser.email },
    profile: data ? mapAuthProfile(data) : null,
  };
}

/** 401 JSON response for unauthenticated requests. */
export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
}

/** 403 JSON response when the user lacks permission. */
export function forbidden(message = 'You do not have permission to perform this action.') {
  return NextResponse.json({ error: message }, { status: 403 });
}
