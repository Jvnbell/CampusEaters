import { NextResponse } from 'next/server';

import { getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Mobile push token registry.
 *
 * The Expo app calls these endpoints on sign-in (POST) and sign-out (DELETE)
 * to keep public.device_tokens in sync. The actual push-fanout happens in
 * lib/push.ts when an order's status changes.
 *
 * Auth is required — only the signed-in user can register or remove tokens
 * tied to their own profile. We rely on the Bearer-token auth wired into
 * lib/supabase/server.ts, so the same routes work for cookie sessions too.
 */

type PostBody = {
  token?: string;
  platform?: 'ios' | 'android' | 'web' | null;
};

const VALID_PLATFORMS = new Set(['ios', 'android', 'web']);

function isExpoPushToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('ExponentPushToken[') || value.startsWith('ExpoPushToken[')) &&
    value.endsWith(']') &&
    value.length < 200
  );
}

export async function POST(request: Request) {
  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (!auth.profile) {
    return NextResponse.json(
      { error: 'No CampusEats profile found for your account.' },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as PostBody;

  if (!isExpoPushToken(body.token)) {
    return NextResponse.json(
      { error: 'token must be a valid Expo push token (ExponentPushToken[…]).' },
      { status: 400 },
    );
  }

  const platform =
    body.platform && VALID_PLATFORMS.has(body.platform) ? body.platform : null;

  // Upsert by token so re-installing the app on the same device doesn't leave
  // a stale row attached to an old user_id; if the same token shows up under
  // a new user, we move it.
  const { error } = await supabaseAdmin.from('device_tokens').upsert(
    {
      user_id: auth.profile.id,
      token: body.token,
      platform,
    },
    { onConflict: 'token' },
  );

  if (error) {
    console.error('[api/users/me/push-tokens POST] upsert failed', error);
    return NextResponse.json({ error: 'Failed to register push token.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (!auth.profile) {
    return NextResponse.json(
      { error: 'No CampusEats profile found for your account.' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!isExpoPushToken(token)) {
    return NextResponse.json({ error: 'Provide a valid token query parameter.' }, { status: 400 });
  }

  // Scope the delete to the current user — even with a stolen token you
  // can't unregister someone else's device.
  const { error } = await supabaseAdmin
    .from('device_tokens')
    .delete()
    .eq('user_id', auth.profile.id)
    .eq('token', token);

  if (error) {
    console.error('[api/users/me/push-tokens DELETE] failed', error);
    return NextResponse.json({ error: 'Failed to remove push token.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
