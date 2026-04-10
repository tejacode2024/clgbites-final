-- ══════════════════════════════════════════════════
--  CLGBITES × Nelakuditi — Supabase Schema
--  Run this in Supabase → SQL Editor → New Query
-- ══════════════════════════════════════════════════

-- 1. ORDERS TABLE
create table if not exists orders (
  id            bigint generated always as identity primary key,
  customer_name text        not null,
  customer_phone text       not null,
  items         jsonb       not null,          -- [{id, name, price, qty}]
  delivery_type text        not null default 'delivery',  -- 'delivery' | 'pickup'
  payment_mode  text        not null default 'cod',       -- 'cod' | 'prepaid'
  total         integer     not null,
  created_at    timestamptz not null default now()
);

-- Index for faster date-range queries on admin page
create index if not exists orders_created_at_idx on orders(created_at desc);

-- 2. CONFIG TABLE  (single-row, id=1 always)
create table if not exists config (
  id            integer     primary key default 1,
  site_online   boolean     not null default true,
  item_flags    jsonb       not null default '{}'::jsonb,  -- {itemId: bool}
  updated_at    timestamptz not null default now()
);

-- Seed the one config row (safe to run multiple times)
insert into config (id, site_online, item_flags)
values (1, true, '{}')
on conflict (id) do nothing;

-- 3. ROW-LEVEL SECURITY
--    orders: anyone can INSERT, only service_role can SELECT/DELETE
alter table orders enable row level security;

create policy "Anyone can place an order"
  on orders for insert
  with check (true);

create policy "Service role can read orders"
  on orders for select
  using (auth.role() = 'service_role');

create policy "Service role can delete orders"
  on orders for delete
  using (auth.role() = 'service_role');

--    config: anyone can read, only service_role can write
alter table config enable row level security;

create policy "Anyone can read config"
  on config for select
  using (true);

create policy "Service role can update config"
  on config for update
  using (auth.role() = 'service_role');
