-- Migrate from the legacy Prisma schema (PascalCase tables, camelCase columns)
-- to a Supabase-idiomatic snake_case schema.
--
-- This migration deliberately DOES NOT copy users, orders, order_items, or bots
-- from the legacy Prisma tables — they're dropped and rebuilt empty. Run
-- `npm run db:seed` (or `SEED_USER_COUNT=0 npm run db:seed` for catalog-only)
-- afterwards to repopulate restaurants and menu items.
--
-- Safe to run multiple times: object creation uses IF NOT EXISTS, and the old
-- tables are dropped with IF EXISTS at the end.
--
-- Apply via Supabase SQL Editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists moddatetime schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_role') then
    create type public.account_role as enum ('USER', 'ADMIN', 'RESTAURANT');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('SENT', 'RECEIVED', 'SHIPPING', 'DELIVERED');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.restaurants (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  location    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.users (
  id            text primary key default gen_random_uuid()::text,
  first_name    text not null,
  last_name     text not null,
  email         text not null unique,
  phone_number  text,
  restaurant_id text references public.restaurants(id) on delete set null,
  role          public.account_role not null default 'USER',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.menu_items (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  price         numeric(10, 2) not null,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists menu_items_restaurant_id_idx on public.menu_items(restaurant_id);

create table if not exists public.bots (
  id                text primary key default gen_random_uuid()::text,
  primary_location  text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- order_number is monotonic and assigned atomically by the create_order RPC.
create sequence if not exists public.orders_order_number_seq start 1001;

create table if not exists public.orders (
  id                text primary key default gen_random_uuid()::text,
  order_number      integer not null unique default nextval('public.orders_order_number_seq'),
  user_id           text not null references public.users(id) on delete cascade,
  restaurant_id     text not null references public.restaurants(id) on delete cascade,
  bot_id            text references public.bots(id) on delete set null,
  delivery_location text not null,
  status            public.order_status not null default 'SENT',
  placed_at         timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_user_id_idx       on public.orders(user_id);
create index if not exists orders_restaurant_id_idx on public.orders(restaurant_id);
create index if not exists orders_bot_id_idx        on public.orders(bot_id);
create index if not exists orders_placed_at_idx     on public.orders(placed_at desc);

alter sequence public.orders_order_number_seq owned by public.orders.order_number;

create table if not exists public.order_items (
  id           text primary key default gen_random_uuid()::text,
  order_id     text not null references public.orders(id) on delete cascade,
  menu_item_id text not null references public.menu_items(id) on delete cascade,
  quantity     integer not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (order_id, menu_item_id)
);
create index if not exists order_items_menu_item_id_idx on public.order_items(menu_item_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers (Supabase has no Prisma-style @updatedAt)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['restaurants', 'users', 'menu_items', 'bots', 'orders', 'order_items'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I '
      || 'for each row execute function extensions.moddatetime(updated_at)',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Drop legacy Prisma tables. We do NOT copy data over — the new schema starts
-- empty and is repopulated via `npm run db:seed`.
-- ---------------------------------------------------------------------------
drop table if exists public."OrderItem"  cascade;
drop table if exists public."Order"      cascade;
drop table if exists public."MenuItem"   cascade;
drop table if exists public."User"       cascade;
drop table if exists public."Restaurant" cascade;
drop table if exists public."Bot"        cascade;
drop table if exists public._prisma_migrations cascade;

-- Drop the legacy Prisma-generated enum if it exists (we now use lower_case enums).
do $$
begin
  if exists (select 1 from pg_type where typname = 'OrderStatus') then
    drop type public."OrderStatus" cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Atomic order creation RPC
--
-- The Next.js API calls supabase.rpc('create_order', { ... }) so the order
-- number assignment + line-item insertion happen in one transaction, and we
-- get a single round trip instead of N+1 inserts.
--
-- p_items: jsonb array of { menu_item_id: text, quantity: int }.
-- ---------------------------------------------------------------------------
create or replace function public.create_order(
  p_user_id           text,
  p_restaurant_id     text,
  p_delivery_location text,
  p_items             jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id text;
  new_order    public.orders%rowtype;
  item         jsonb;
  found_item_count int;
  requested_item_count int;
begin
  if p_user_id is null or p_restaurant_id is null then
    raise exception 'create_order: user_id and restaurant_id are required'
      using errcode = '22023';
  end if;

  if p_delivery_location is null or length(trim(p_delivery_location)) = 0 then
    raise exception 'create_order: delivery_location is required'
      using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'create_order: items must be a non-empty array'
      using errcode = '22023';
  end if;

  -- Validate every line refers to a menu item that belongs to this restaurant.
  requested_item_count := jsonb_array_length(p_items);
  select count(*) into found_item_count
  from jsonb_array_elements(p_items) as it
  join public.menu_items mi
    on mi.id = (it->>'menu_item_id')
   and mi.restaurant_id = p_restaurant_id;

  if found_item_count <> requested_item_count then
    raise exception 'create_order: one or more menu items do not belong to restaurant %', p_restaurant_id
      using errcode = 'P0001';
  end if;

  insert into public.orders (user_id, restaurant_id, delivery_location)
  values (p_user_id, p_restaurant_id, p_delivery_location)
  returning * into new_order;

  new_order_id := new_order.id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (order_id, menu_item_id, quantity)
    values (
      new_order_id,
      item->>'menu_item_id',
      coalesce((item->>'quantity')::int, 1)
    );
  end loop;

  return jsonb_build_object(
    'id',                new_order.id,
    'order_number',      new_order.order_number,
    'user_id',           new_order.user_id,
    'restaurant_id',     new_order.restaurant_id,
    'bot_id',            new_order.bot_id,
    'delivery_location', new_order.delivery_location,
    'status',            new_order.status,
    'placed_at',         new_order.placed_at,
    'updated_at',        new_order.updated_at
  );
end;
$$;

revoke all on function public.create_order(text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: enable on every table. The Next.js API talks to Postgres with the
-- service_role key (which bypasses RLS), so we deliberately add no policies.
-- If you ever expose these tables to the anon key, write explicit policies
-- before disabling RLS.
-- ---------------------------------------------------------------------------
alter table public.restaurants enable row level security;
alter table public.users       enable row level security;
alter table public.menu_items  enable row level security;
alter table public.bots        enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
