import { NextResponse } from 'next/server';

import { forbidden, getAuthUserAndProfile, unauthorized } from '@/lib/api-auth';
import { mapBot } from '@/lib/db/mappers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { BOT_STATUSES, type BotRow, type BotStatus } from '@/types/db';

export const dynamic = 'force-dynamic';

type PatchBody = {
  status?: BotStatus;
  currentLocation?: string;
  batteryLevel?: number | null;
  positionX?: number | null;
  positionY?: number | null;
};

type ParseResult =
  | { ok: true; value: number | null; error?: undefined }
  | { ok: false; value?: undefined; error: string };

const parsePercent = (value: unknown, label: string): ParseResult => {
  if (value === null) return { ok: true, value: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { ok: false, error: `${label} must be a number between 0 and 100.` };
  }
  return { ok: true, value: Math.round(n * 100) / 100 };
};

/**
 * Operations admin can update a bot's live status, current location, and
 * battery level. Touching any field also bumps `last_heartbeat_at`.
 */
export async function PATCH(
  request: Request,
  context: { params: { botId: string } },
) {
  const auth = await getAuthUserAndProfile();
  if (!auth) return unauthorized();
  if (auth.profile?.role !== 'ADMIN') {
    return forbidden('Only operations admins can update bots.');
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    last_heartbeat_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    if (!BOT_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status "${body.status}".` }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.currentLocation !== undefined) {
    const trimmed = body.currentLocation.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'currentLocation cannot be empty.' }, { status: 400 });
    }
    update.current_location = trimmed;
  }

  if (body.batteryLevel !== undefined) {
    if (body.batteryLevel === null) {
      update.battery_level = null;
    } else {
      const lvl = Number(body.batteryLevel);
      if (!Number.isFinite(lvl) || lvl < 0 || lvl > 100) {
        return NextResponse.json(
          { error: 'batteryLevel must be between 0 and 100.' },
          { status: 400 },
        );
      }
      update.battery_level = Math.round(lvl);
    }
  }

  if (body.positionX !== undefined) {
    const parsed = parsePercent(body.positionX, 'positionX');
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
    update.position_x = parsed.value ?? null;
  }
  if (body.positionY !== undefined) {
    const parsed = parsePercent(body.positionY, 'positionY');
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
    update.position_y = parsed.value ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from('bots')
    .update(update)
    .eq('id', context.params.botId)
    .select(
      'id, name, status, primary_location, current_location, battery_level, last_heartbeat_at, position_x, position_y, created_at, updated_at',
    )
    .maybeSingle();

  if (error) {
    console.error('[api/bots/PATCH] Update failed', error);
    return NextResponse.json({ error: 'Failed to update bot.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Bot not found.' }, { status: 404 });
  }

  return NextResponse.json(
    { bot: mapBot(data as BotRow) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
