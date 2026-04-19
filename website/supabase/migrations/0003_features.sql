-- Feature additions: ratings & feedback, browse-restaurants aggregates, fleet map.
--
-- This migration adds:
--   1. public.reviews          — one rating + comment per delivered order
--   2. public.restaurant_ratings (view) — aggregate rating + count per restaurant
--   3. public.bots.position_x / position_y — 0..100 % coordinates for the live
--      fleet map in the operations console
--
-- Safe to re-run: every object uses IF NOT EXISTS / drop-and-recreate (for the
-- view), and column adds are conditional.

-- ---------------------------------------------------------------------------
-- 1. Reviews
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id            text primary key default gen_random_uuid()::text,
  order_id      text not null unique references public.orders(id)      on delete cascade,
  user_id       text not null         references public.users(id)       on delete cascade,
  restaurant_id text not null         references public.restaurants(id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists reviews_restaurant_id_idx on public.reviews(restaurant_id);
create index if not exists reviews_user_id_idx       on public.reviews(user_id);
create index if not exists reviews_created_at_idx    on public.reviews(created_at desc);

-- updated_at trigger (mirrors the pattern in 0001_drop_prisma.sql)
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at' and tgrelid = 'public.reviews'::regclass
  ) then
    execute 'create trigger set_updated_at before update on public.reviews '
         || 'for each row execute function extensions.moddatetime(updated_at)';
  end if;
end $$;

alter table public.reviews enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Aggregate rating per restaurant
--
-- Exposed as a view so the API can join `restaurants` ↔ `restaurant_ratings`
-- in a single query without us maintaining a denormalised counter column.
-- ---------------------------------------------------------------------------
create or replace view public.restaurant_ratings as
select
  r.id                                  as restaurant_id,
  count(rv.id)                          as review_count,
  coalesce(round(avg(rv.rating)::numeric, 2), 0)::numeric(3, 2) as average_rating
from public.restaurants r
left join public.reviews rv on rv.restaurant_id = r.id
group by r.id;

comment on view public.restaurant_ratings is
  'One row per restaurant with the count + 2-decimal average of its reviews. Restaurants with no reviews appear with average_rating = 0 and review_count = 0.';

-- ---------------------------------------------------------------------------
-- 3. Live fleet map coordinates
--
-- We deliberately use a unitless 0..100 percentage system so the operations
-- map UI can render at any resolution without a real geo projection.
-- ---------------------------------------------------------------------------
alter table public.bots
  add column if not exists position_x numeric(5, 2),
  add column if not exists position_y numeric(5, 2);

alter table public.bots
  drop constraint if exists bots_position_x_range,
  drop constraint if exists bots_position_y_range;

alter table public.bots
  add constraint bots_position_x_range
    check (position_x is null or (position_x between 0 and 100)),
  add constraint bots_position_y_range
    check (position_y is null or (position_y between 0 and 100));

-- Backfill positions for any pre-existing bots so the map isn't empty.
-- We hash the bot id into the 10..90 range on each axis so dots are spread
-- out and don't sit on top of each other.
update public.bots
   set position_x = 10 + (abs(hashtext(id || ':x')) % 80)::numeric,
       position_y = 10 + (abs(hashtext(id || ':y')) % 80)::numeric
 where position_x is null
    or position_y is null;
