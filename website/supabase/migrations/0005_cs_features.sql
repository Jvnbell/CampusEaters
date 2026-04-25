-- CS-flavoured feature additions: concurrency-safe fleet dispatcher,
-- immutable audit log, EWMA ETA predictor, SQL analytics with percentiles,
-- request idempotency, and per-user sliding-window rate limiting.
--
-- Everything here is additive and idempotent — safe to re-run in any order.

-- ---------------------------------------------------------------------------
-- 1. Restaurant coordinates (unitless 0..100 grid, matches bots.position_*)
--    so the dispatcher can compute Euclidean distance on the same plane.
-- ---------------------------------------------------------------------------
alter table public.restaurants
  add column if not exists position_x numeric(5, 2),
  add column if not exists position_y numeric(5, 2);

alter table public.restaurants
  drop constraint if exists restaurants_position_x_range,
  drop constraint if exists restaurants_position_y_range;

alter table public.restaurants
  add constraint restaurants_position_x_range
    check (position_x is null or (position_x between 0 and 100)),
  add constraint restaurants_position_y_range
    check (position_y is null or (position_y between 0 and 100));

-- Deterministic backfill using the same hash trick as bots so demo data is
-- spread out across the grid rather than piled on top of each other.
update public.restaurants
   set position_x = 10 + (abs(hashtext(id || ':x')) % 80)::numeric,
       position_y = 10 + (abs(hashtext(id || ':y')) % 80)::numeric
 where position_x is null
    or position_y is null;

-- ---------------------------------------------------------------------------
-- 2. Immutable order event log (audit trail)
--
-- Every insert + status/bot change on `orders` is captured here via a
-- trigger. Rows are append-only: no updates or deletes. The analytics view
-- below derives `delivered_at` from this log so delivery-time percentiles
-- reflect the actual state-transition timestamp, not `orders.updated_at`
-- which can change for unrelated reasons.
-- ---------------------------------------------------------------------------
create table if not exists public.order_events (
  id          bigserial primary key,
  order_id    text not null references public.orders(id) on delete cascade,
  event       text not null check (event in ('created', 'status_changed', 'bot_assigned')),
  old_status  public.order_status,
  new_status  public.order_status,
  old_bot_id  text,
  new_bot_id  text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists order_events_order_id_idx   on public.order_events(order_id);
create index if not exists order_events_created_at_idx on public.order_events(created_at desc);
create index if not exists order_events_event_idx      on public.order_events(event);

alter table public.order_events enable row level security;

comment on table public.order_events is
  'Append-only audit log of order state transitions. Written by trg_order_events on public.orders.';

-- Block mutation/deletion so the log stays truly immutable.
create or replace function public.order_events_reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'order_events is append-only';
end;
$$;

drop trigger if exists order_events_no_update on public.order_events;
drop trigger if exists order_events_no_delete on public.order_events;
create trigger order_events_no_update before update on public.order_events
  for each row execute function public.order_events_reject_mutation();
create trigger order_events_no_delete before delete on public.order_events
  for each row execute function public.order_events_reject_mutation();

-- Trigger on orders: record INSERT + any status/bot change.
create or replace function public.record_order_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, event, new_status, new_bot_id)
    values (new.id, 'created', new.status, new.bot_id);
    return new;
  end if;

  -- UPDATE
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, event, old_status, new_status)
    values (new.id, 'status_changed', old.status, new.status);
  end if;
  if new.bot_id is distinct from old.bot_id then
    insert into public.order_events (order_id, event, old_bot_id, new_bot_id)
    values (new.id, 'bot_assigned', old.bot_id, new.bot_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_events on public.orders;
create trigger trg_order_events
  after insert or update on public.orders
  for each row execute function public.record_order_event();

-- ---------------------------------------------------------------------------
-- 3. Idempotency keys
--
-- The API route stashes a `(user_id, key)` pair after a successful order
-- creation. A retry with the same Idempotency-Key header returns the
-- originally created order instead of creating a duplicate.
-- ---------------------------------------------------------------------------
create table if not exists public.idempotency_keys (
  user_id      text not null references public.users(id) on delete cascade,
  key          text not null,
  order_id     text not null references public.orders(id) on delete cascade,
  request_hash text not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists idempotency_keys_created_at_idx on public.idempotency_keys(created_at desc);
alter table public.idempotency_keys enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Sliding-window rate limit on order placement
--
-- Returns { allowed, used, remaining, reset_at }. We count orders placed by
-- the user in the last `p_window_seconds` seconds — no extra table needed.
-- ---------------------------------------------------------------------------
create or replace function public.check_order_rate_limit(
  p_user_id         text,
  p_max             int default 10,
  p_window_seconds  int default 60
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  window_start timestamptz;
  used         int;
  earliest_in_window timestamptz;
begin
  window_start := now() - make_interval(secs => p_window_seconds);

  select count(*), min(placed_at)
    into used, earliest_in_window
    from public.orders
   where user_id = p_user_id
     and placed_at >= window_start;

  return jsonb_build_object(
    'allowed',   used < p_max,
    'used',      used,
    'remaining', greatest(0, p_max - used),
    'reset_at',  coalesce(earliest_in_window + make_interval(secs => p_window_seconds), now())
  );
end;
$$;

revoke all on function public.check_order_rate_limit(text, int, int) from public;
grant execute on function public.check_order_rate_limit(text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Delivery metrics view
--
-- Joins every delivered order to its last 'status_changed' → DELIVERED event
-- so duration_seconds reflects the real state-transition time.
-- ---------------------------------------------------------------------------
create or replace view public.order_delivery_metrics as
with delivered_events as (
  select
    order_id,
    max(created_at) as delivered_at
  from public.order_events
  where event = 'status_changed'
    and new_status = 'DELIVERED'
  group by order_id
)
select
  o.id                                        as order_id,
  o.order_number,
  o.user_id,
  o.restaurant_id,
  o.bot_id,
  o.placed_at,
  d.delivered_at,
  extract(epoch from (d.delivered_at - o.placed_at))::numeric as duration_seconds
from public.orders o
join delivered_events d on d.order_id = o.id
where o.status = 'DELIVERED';

comment on view public.order_delivery_metrics is
  'Per-delivered-order metrics. duration_seconds = delivered_at - placed_at, with delivered_at pulled from order_events (immutable).';

-- ---------------------------------------------------------------------------
-- 6. ETA prediction via exponentially weighted moving average
--
-- Weights newer deliveries more heavily than old ones:
--   ewma_{k} = alpha * sample_{k} + (1 - alpha) * ewma_{k-1}
--
-- Falls back to the global average if a specific restaurant has no history.
-- Returns NULL when there's not a single completed delivery anywhere — the
-- UI treats NULL as "calculating…".
-- ---------------------------------------------------------------------------
create or replace function public.predict_delivery_eta(
  p_restaurant_id text,
  p_alpha         numeric default 0.3,
  p_sample_limit  int     default 20
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sample record;
  ewma          numeric;
  n             int := 0;
  global_avg    numeric;
begin
  if p_alpha <= 0 or p_alpha > 1 then
    raise exception 'predict_delivery_eta: alpha must be in (0, 1], got %', p_alpha
      using errcode = '22023';
  end if;

  for sample in
    select duration_seconds
      from public.order_delivery_metrics
     where restaurant_id = p_restaurant_id
     order by delivered_at desc
     limit p_sample_limit
  loop
    if n = 0 then
      ewma := sample.duration_seconds;
    else
      ewma := p_alpha * sample.duration_seconds + (1 - p_alpha) * ewma;
    end if;
    n := n + 1;
  end loop;

  if n = 0 then
    select avg(duration_seconds)
      into global_avg
      from public.order_delivery_metrics
     where duration_seconds > 0;

    return jsonb_build_object(
      'seconds',     global_avg,
      'sample_size', 0,
      'source',      case when global_avg is null then 'none' else 'global' end
    );
  end if;

  return jsonb_build_object(
    'seconds',     round(ewma, 2),
    'sample_size', n,
    'source',      'restaurant'
  );
end;
$$;

revoke all on function public.predict_delivery_eta(text, numeric, int) from public;
grant execute on function public.predict_delivery_eta(text, numeric, int) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Fleet analytics — one jsonb blob powering the admin dashboard
--
-- Uses PERCENTILE_CONT for p50/p90/p95/p99 and generate_series so missing
-- days still appear as zero-valued points on the time-series chart.
-- ---------------------------------------------------------------------------
create or replace function public.fleet_analytics(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  bounded_days int := greatest(1, least(coalesce(p_days, 30), 365));
  result       jsonb;
  daily        jsonb;
  pct          jsonb;
  top_r        jsonb;
  fleet        jsonb;
  totals       jsonb;
begin
  -- Daily order volume + avg delivery time (left-joined against generate_series
  -- so every day in the window shows up, even zero-order days).
  with days as (
    select generate_series(
      date_trunc('day', now()) - make_interval(days => bounded_days - 1),
      date_trunc('day', now()),
      interval '1 day'
    )::date as day
  ),
  placed as (
    select date_trunc('day', placed_at)::date as day, count(*) as orders_placed
      from public.orders
     where placed_at >= now() - make_interval(days => bounded_days)
     group by 1
  ),
  delivered as (
    select date_trunc('day', delivered_at)::date as day,
           count(*) as orders_delivered,
           avg(duration_seconds)::numeric(10,2) as avg_delivery_seconds
      from public.order_delivery_metrics
     where delivered_at >= now() - make_interval(days => bounded_days)
     group by 1
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'day',                   to_char(d.day, 'YYYY-MM-DD'),
             'orders_placed',         coalesce(p.orders_placed, 0),
             'orders_delivered',      coalesce(dl.orders_delivered, 0),
             'avg_delivery_seconds',  coalesce(dl.avg_delivery_seconds, 0)
           ) order by d.day
         ), '[]'::jsonb)
    into daily
    from days d
    left join placed    p  on p.day  = d.day
    left join delivered dl on dl.day = d.day;

  -- Delivery-time percentiles over the same window.
  select jsonb_build_object(
           'p50', percentile_cont(0.50) within group (order by duration_seconds)::numeric(10,2),
           'p90', percentile_cont(0.90) within group (order by duration_seconds)::numeric(10,2),
           'p95', percentile_cont(0.95) within group (order by duration_seconds)::numeric(10,2),
           'p99', percentile_cont(0.99) within group (order by duration_seconds)::numeric(10,2),
           'samples', count(*)
         )
    into pct
    from public.order_delivery_metrics
   where delivered_at >= now() - make_interval(days => bounded_days)
     and duration_seconds > 0;

  -- Top restaurants by completed orders in the window, with average rating.
  with counts as (
    select restaurant_id, count(*) as orders
      from public.order_delivery_metrics
     where delivered_at >= now() - make_interval(days => bounded_days)
     group by restaurant_id
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'restaurant_id',  c.restaurant_id,
             'name',           r.name,
             'orders',         c.orders,
             'avg_rating',     coalesce(rr.average_rating, 0),
             'review_count',   coalesce(rr.review_count, 0)
           ) order by c.orders desc
         ), '[]'::jsonb)
    into top_r
    from counts c
    join public.restaurants r on r.id = c.restaurant_id
    left join public.restaurant_ratings rr on rr.restaurant_id = c.restaurant_id;

  -- Current fleet snapshot.
  select coalesce(jsonb_agg(
           jsonb_build_object('status', status, 'count', cnt) order by status
         ), '[]'::jsonb)
    into fleet
    from (
      select status::text, count(*) as cnt
        from public.bots
       group by status
    ) s;

  -- Totals for the header tiles.
  select jsonb_build_object(
           'orders_placed',    (select count(*) from public.orders
                                 where placed_at >= now() - make_interval(days => bounded_days)),
           'orders_delivered', (select count(*) from public.order_delivery_metrics
                                 where delivered_at >= now() - make_interval(days => bounded_days)),
           'avg_delivery_seconds', (select avg(duration_seconds)::numeric(10,2)
                                      from public.order_delivery_metrics
                                     where delivered_at >= now() - make_interval(days => bounded_days)),
           'active_bots',      (select count(*) from public.bots
                                 where status not in ('OFFLINE', 'MAINTENANCE'))
         )
    into totals;

  result := jsonb_build_object(
    'window_days', bounded_days,
    'generated_at', now(),
    'totals',       totals,
    'daily',        daily,
    'percentiles',  pct,
    'top_restaurants', top_r,
    'fleet_status', fleet
  );

  return result;
end;
$$;

revoke all on function public.fleet_analytics(int) from public;
grant execute on function public.fleet_analytics(int) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Concurrency-safe fleet dispatcher
--
-- Greedy assignment: for each unassigned pending order (oldest first), pick
-- the best available bot using a cost function:
--     cost = distance(bot, restaurant) - 0.3 * (battery - 50)
--
-- A closer bot wins; a higher-battery bot wins ties. Bots are locked with
-- FOR UPDATE SKIP LOCKED so two concurrent dispatcher invocations never
-- assign the same bot to two different orders — the second caller just
-- skips the locked row and picks the next-best.
--
-- Returns { assignments: [...], unassigned: n, considered_orders: n }.
-- Every assignment also writes an 'bot_assigned' event via the trigger.
-- ---------------------------------------------------------------------------
create or replace function public.dispatch_pending_orders(
  p_min_battery int default 20,
  p_max_assignments int default 100
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_order record;
  chosen_bot    record;
  assignments   jsonb := '[]'::jsonb;
  unassigned    int := 0;
  considered    int := 0;
begin
  for pending_order in
    select o.id,
           o.order_number,
           o.restaurant_id,
           r.position_x as rest_x,
           r.position_y as rest_y
      from public.orders o
      join public.restaurants r on r.id = o.restaurant_id
     where o.bot_id is null
       and o.status in ('SENT', 'RECEIVED')
     order by o.placed_at asc
     limit p_max_assignments
  loop
    considered := considered + 1;

    -- FOR UPDATE SKIP LOCKED: atomic pick-and-lock of the best idle bot.
    -- If another dispatcher call has already locked the top-ranked bot for
    -- another order, we transparently fall through to the next candidate.
    select b.id, b.name, b.position_x, b.position_y, b.battery_level,
           (
             -- Euclidean distance on the 0..100 grid.
             sqrt(
               power(coalesce(b.position_x, 50) - coalesce(pending_order.rest_x, 50), 2) +
               power(coalesce(b.position_y, 50) - coalesce(pending_order.rest_y, 50), 2)
             )
             - 0.3 * (coalesce(b.battery_level, 50) - 50)
           ) as score
      into chosen_bot
      from public.bots b
     where b.status = 'IDLE'
       and (b.battery_level is null or b.battery_level >= p_min_battery)
     order by score asc
     limit 1
     for update of b skip locked;

    if chosen_bot.id is null then
      unassigned := unassigned + 1;
      continue;
    end if;

    -- Transition the bot + assign the order. Both writes fire the audit trigger.
    update public.bots
       set status = 'EN_ROUTE_PICKUP',
           current_location = 'En route to ' ||
             (select name from public.restaurants where id = pending_order.restaurant_id),
           last_heartbeat_at = now()
     where id = chosen_bot.id;

    update public.orders
       set bot_id = chosen_bot.id
     where id = pending_order.id;

    assignments := assignments || jsonb_build_object(
      'order_id',     pending_order.id,
      'order_number', pending_order.order_number,
      'bot_id',       chosen_bot.id,
      'bot_name',     chosen_bot.name,
      'score',        round(chosen_bot.score::numeric, 3),
      'battery',      chosen_bot.battery_level
    );
  end loop;

  return jsonb_build_object(
    'considered_orders', considered,
    'assigned',          jsonb_array_length(assignments),
    'unassigned',        unassigned,
    'assignments',       assignments,
    'dispatched_at',     now()
  );
end;
$$;

revoke all on function public.dispatch_pending_orders(int, int) from public;
grant execute on function public.dispatch_pending_orders(int, int) to service_role;

comment on function public.dispatch_pending_orders(int, int) is
  'Greedy, concurrency-safe fleet dispatcher. FOR UPDATE SKIP LOCKED on bots prevents two concurrent callers from double-assigning a bot.';

-- ---------------------------------------------------------------------------
-- 9. Backfill: create synthetic order_events for pre-existing orders so
-- the audit log and delivery_metrics view aren't empty on first load.
-- ---------------------------------------------------------------------------
insert into public.order_events (order_id, event, new_status, created_at)
select o.id, 'created', o.status, o.placed_at
  from public.orders o
  left join public.order_events oe
         on oe.order_id = o.id and oe.event = 'created'
 where oe.id is null;

-- For orders that are already DELIVERED but have no delivered event, fake one
-- at orders.updated_at so percentiles show something on day one.
insert into public.order_events (order_id, event, old_status, new_status, created_at)
select o.id, 'status_changed', 'SHIPPING'::public.order_status, 'DELIVERED'::public.order_status, o.updated_at
  from public.orders o
  left join public.order_events oe
         on oe.order_id = o.id and oe.event = 'status_changed' and oe.new_status = 'DELIVERED'
 where o.status = 'DELIVERED' and oe.id is null;
