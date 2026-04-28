import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase/admin';

type Body = { email?: string };

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // ignore
  }

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  const perPage = 200;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const user = (data?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email);
    if (!user) {
      if ((data?.users ?? []).length < perPage) break;
      continue;
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}
