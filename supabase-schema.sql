-- ══════════════════════════════════════════════════
--  CLGBITES × Nelakuditi — Supabase Schema
-- ══════════════════════════════════════════════════

-- 1. ORDERS TABLE
create table if not exists orders (
  id             bigserial primary key,          -- id IS the token number
  customer_name  text        not null,
  customer_phone text        not null,
  items          jsonb       not null,
  payment_mode   text        not null default 'cod',
  total          integer     not null,
  pay_status     text        not null default 'pending',
  pending_amount integer     default null,
  deliver_status text        not null default 'pending',
  created_at     timestamptz not null default now()
);

create index if not exists orders_created_at_idx on orders(created_at desc);

-- 2. CONFIG TABLE
create table if not exists config (
  id            integer     primary key default 1,
  site_online   boolean     not null default true,
  item_flags    jsonb       not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

insert into config (id, site_online, item_flags)
values (1, true, '{}')
on conflict (id) do nothing;

-- 3. FUNCTION: reset sequence so next id starts from 1 after clearing all orders
create or replace function reset_orders_sequence()
returns void language plpgsql as $$
begin
  perform setval(pg_get_serial_sequence('orders', 'id'), 1, false);
end;
$$;

-- 4. ROW-LEVEL SECURITY
alter table orders enable row level security;

create policy "Anyone can place an order"
  on orders for insert with check (true);

create policy "Service role can read orders"
  on orders for select using (auth.role() = 'service_role');

create policy "Service role can delete orders"
  on orders for delete using (auth.role() = 'service_role');

alter table config enable row level security;

create policy "Anyone can read config"
  on config for select using (true);

create policy "Service role can update config"
  on config for update using (auth.role() = 'service_role');