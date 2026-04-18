import { NextResponse } from 'next/server';

import { mapUserProfile } from '@/lib/db/mappers';
import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/supabase/server';
import type { AccountRole, UserRow } from '@/types/db';

/** Pull the profile fields from Supabase user metadata, falling back to sane defaults. */
function profileFromSupabaseMetadata(
  email: string,
  metadata: Record<string, unknown> | null | undefined,
): { firstName: string; lastName: string; phoneNumber: string | null; role: AccountRole } {
  const meta = metadata ?? {};
  let firstName = String(meta.first_name ?? meta.firstName ?? '').trim();
  let lastName = String(meta.last_name ?? meta.lastName ?? '').trim();
  const full = String(meta.full_name ?? meta.name ?? '').trim();
  if ((!firstName || !lastName) && full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (!firstName && parts.length) firstName = parts[0]!;
    if (!lastName && parts.length > 1) lastName = parts.slice(1).join(' ');
  }
  const local = email.split('@')[0] ?? 'user';
  if (!firstName) firstName = local;
  if (!lastName) lastName = 'User';

  const rawPhone = String(meta.phone_number ?? meta.phoneNumber ?? '').trim();
  const phoneNumber = rawPhone.length ? rawPhone : null;

  const rawRole = String(meta.role ?? '').trim().toUpperCase();
  const role: AccountRole =
    rawRole === 'ADMIN' || rawRole === 'RESTAURANT' ? (rawRole as AccountRole) : 'USER';

  return { firstName, lastName, phoneNumber, role };
}

const PROFILE_COLUMNS =
  'id, first_name, last_name, email, phone_number, role, restaurant_id, created_at, updated_at';

export async function GET(request: Request) {
  try {
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (email) {
      const isOwnProfile = auth.authUser.email.toLowerCase() === email.toLowerCase();
      const isAdmin = auth.profile?.role === 'ADMIN';
      if (!isOwnProfile && !isAdmin) {
        return forbidden('You can only view your own profile.');
      }

      // For own-profile lookups, use the session email so we match the row exactly even
      // if the query string casing differs from what's stored.
      const lookupEmail = isOwnProfile ? auth.authUser.email : email;

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('users')
        .select(PROFILE_COLUMNS)
        .eq('email', lookupEmail)
        .maybeSingle();

      if (fetchError) {
        console.error('[API /users GET] Lookup failed', fetchError);
        return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
      }

      let user = existing as UserRow | null;

      // Auto-provision: Supabase account exists but no app row yet.
      if (!user && isOwnProfile) {
        const supabaseUser = await getAuthUser();
        if (
          supabaseUser?.email &&
          supabaseUser.email.toLowerCase() === auth.authUser.email.toLowerCase()
        ) {
          const { firstName, lastName, phoneNumber, role } = profileFromSupabaseMetadata(
            supabaseUser.email,
            supabaseUser.user_metadata as Record<string, unknown> | undefined,
          );

          const { data: created, error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              email: supabaseUser.email,
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              role,
            })
            .select(PROFILE_COLUMNS)
            .single();

          if (insertError) {
            // Race: another request just provisioned this user. Re-fetch.
            if (insertError.code === '23505') {
              const { data: refetched } = await supabaseAdmin
                .from('users')
                .select(PROFILE_COLUMNS)
                .eq('email', supabaseUser.email)
                .maybeSingle();
              user = (refetched as UserRow | null) ?? null;
            } else {
              console.error('[API /users GET] Auto-provision failed', insertError);
              return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
            }
          } else {
            user = created as UserRow;
          }
        }
      }

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const response = NextResponse.json({ user: mapUserProfile(user) });
      response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
      return response;
    }

    if (auth.profile?.role !== 'ADMIN') {
      return forbidden('Only administrators can list all users.');
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(PROFILE_COLUMNS)
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true });

    if (error) {
      console.error('[API /users GET] List failed', error);
      return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
    }

    return NextResponse.json({ users: (data ?? []).map((row) => mapUserProfile(row as UserRow)) });
  } catch (error) {
    console.error('Failed to fetch users', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthUserAndProfile();
    if (!auth) return unauthorized();

    const body = (await request.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      restaurantId?: string;
      role?: AccountRole;
    };

    if (!body.email || !body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: 'email, firstName, and lastName are required.' },
        { status: 400 },
      );
    }

    const isOwnProfile = auth.authUser.email.toLowerCase() === body.email.toLowerCase();
    const isAdmin = auth.profile?.role === 'ADMIN';
    if (!isOwnProfile && !isAdmin) {
      return forbidden('You can only create or update your own profile.');
    }
    if (!isAdmin && body.role !== undefined && body.role !== auth.profile?.role) {
      return forbidden('Only administrators can change user roles.');
    }

    const payload = {
      email: body.email,
      first_name: body.firstName,
      last_name: body.lastName,
      phone_number: body.phoneNumber ?? null,
      restaurant_id: body.restaurantId ?? null,
      role: body.role ?? 'USER',
    };

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(payload, { onConflict: 'email' })
      .select(PROFILE_COLUMNS)
      .single();

    if (error) {
      console.error('[API /users POST] Upsert failed', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: 'Failed to create user profile',
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ user: mapUserProfile(data as UserRow) }, { status: 201 });
  } catch (error) {
    console.error('[API /users POST] Failed to create user profile', error);
    return NextResponse.json(
      {
        error: 'Failed to create user profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
