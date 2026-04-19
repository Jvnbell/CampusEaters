-- Push notifications: device tokens + realtime publication.
--
-- Adds:
--   1. public.device_tokens — one row per (user, expo_push_token). Stores
--      Expo push tokens registered by the React Native app so the website
--      API can send notifications when an order's status changes.
--   2. Indexes for fast user-scoped lookups + uniqueness on the token.
--
-- Realtime UI updates use Supabase Realtime *broadcast* channels rather
-- than postgres_changes, so no policy changes to the orders table are
-- needed — see website/src/lib/realtime.ts for the publishing side.
--
-- Safe to re-run.

create table if not exists public.device_tokens (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null references public.users(id) on delete cascade,
  token       text not null unique,
  -- 'ios' | 'android' | 'web' | null. Used to route platform-specific
  -- notification payloads later (e.g. iOS-only sound files).
  platform    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);

-- updated_at trigger (matches the pattern used by other tables).
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'set_updated_at'
       and tgrelid = 'public.device_tokens'::regclass
  ) then
    execute 'create trigger set_updated_at before update on public.device_tokens '
         || 'for each row execute function extensions.moddatetime(updated_at)';
  end if;
end $$;

alter table public.device_tokens enable row level security;

comment on table public.device_tokens is
  'Expo push tokens registered by the mobile app. The Next.js API uses these to fan out notifications via the Expo Push API when order statuses change.';
