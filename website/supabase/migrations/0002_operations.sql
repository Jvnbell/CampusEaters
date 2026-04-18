-- Operations / robot fleet schema additions.
--
-- Adds fields the operations dashboard needs to display each bot at a glance:
-- a human-readable name, a real-time status enum, current location, battery
-- level, and a heartbeat timestamp for offline detection.
--
-- Safe to re-run: every column is added with IF NOT EXISTS, the enum is gated
-- by pg_type, and the values are backfilled defensively.

-- ---------------------------------------------------------------------------
-- bot_status enum (mirrors the operations console state machine)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'bot_status') then
    create type public.bot_status as enum (
      'IDLE',                -- on standby, waiting for an assignment
      'EN_ROUTE_PICKUP',     -- heading to the restaurant
      'AT_RESTAURANT',       -- waiting on / collecting the order
      'EN_ROUTE_DELIVERY',   -- carrying the order to the dropoff
      'AT_DROPOFF',          -- waiting for recipient to claim
      'RETURNING',           -- heading back to home base
      'CHARGING',            -- docked, recharging
      'OFFLINE',             -- no recent heartbeat
      'MAINTENANCE'          -- taken out of service
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Extend bots table
-- ---------------------------------------------------------------------------
alter table public.bots
  add column if not exists name              text,
  add column if not exists status            public.bot_status not null default 'OFFLINE',
  add column if not exists current_location  text,
  add column if not exists battery_level     integer,
  add column if not exists last_heartbeat_at timestamptz;

-- Backfill name / current_location for any rows that pre-date this migration.
update public.bots
   set name = coalesce(name, 'Bot ' || substr(id, 1, 6)),
       current_location = coalesce(current_location, primary_location)
 where name is null
    or current_location is null;

-- After backfill, lock down the columns we want non-null going forward.
alter table public.bots
  alter column name set not null,
  alter column current_location set not null;

-- battery is 0..100 when present
alter table public.bots
  drop constraint if exists bots_battery_level_range;
alter table public.bots
  add constraint bots_battery_level_range
  check (battery_level is null or (battery_level between 0 and 100));

-- Unique, nice-to-display name.
create unique index if not exists bots_name_key on public.bots(name);

-- Helpful index for "what is bot X doing right now?"
create index if not exists orders_bot_id_active_idx
  on public.orders (bot_id)
  where status <> 'DELIVERED';
