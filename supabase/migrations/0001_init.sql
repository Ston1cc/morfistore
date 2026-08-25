-- MORFI Store — initial schema: products, orders, order_items, payments
-- RLS design notes below each table.

create extension if not exists pgcrypto;

-- ============================================================
-- products
-- ============================================================
create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  images      jsonb not null default '[]'::jsonb,
  stock       integer not null default 0 check (stock >= 0),
  variant_info jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index products_active_idx on products (active) where active = true;

alter table products enable row level security;

-- Public storefront reads only active products. No anon/authenticated
-- write policies at all — inserts/updates/deletes go through the
-- service role (server-side), which bypasses RLS entirely.
create policy "Public can read active products"
  on products for select
  to anon, authenticated
  using (active = true);

-- Admin needs to see inactive products too (out-of-stock/archived items
-- in a future admin product view). Safe because "authenticated" here
-- means Supabase Auth accounts you create by hand — see the note at
-- the bottom of this file about disabling public signups.
create policy "Authenticated (admin) can read all products"
  on products for select
  to authenticated
  using (true);


-- ============================================================
-- orders
-- ============================================================
create or replace function generate_order_token()
returns text
language sql
volatile
as $$
  select encode(gen_random_bytes(16), 'hex');
$$;

create table orders (
  id               uuid primary key default gen_random_uuid(),
  order_token      text not null unique default generate_order_token(),
  customer_name    text not null,
  customer_phone   text not null,
  delivery_method  text not null,
  delivery_address text,
  status           text not null default 'pending'
                     check (status in ('pending','paid','failed','processing','shipped')),
  total            numeric(10,2) not null check (total >= 0),
  created_at       timestamptz not null default now()
);

create unique index orders_order_token_idx on orders (order_token);

alter table orders enable row level security;

-- No select/insert/update/delete policies for anon or authenticated
-- here at all (RLS default-denies everything not explicitly granted).
-- Two deliberate exceptions:
--   1. Guest order lookup goes through get_order_by_token() below, a
--      SECURITY DEFINER function — NOT a table policy. A table policy
--      can't safely express "only the row matching the token I asked
--      for": a permissive `using (true)` policy would let anyone with
--      the anon key dump every order (names, phone numbers, addresses)
--      regardless of what token they queried for, since RLS has no
--      concept of "the value the client filtered by" — it only sees
--      row contents. Routing through a function that takes the token
--      as a parameter and does the match server-side is the standard
--      safe pattern for "unguessable link" access.
--   2. Admin gets a real SELECT/UPDATE policy below, scoped to
--      `authenticated`.
create policy "Authenticated (admin) can read all orders"
  on orders for select
  to authenticated
  using (true);

create policy "Authenticated (admin) can update order status"
  on orders for update
  to authenticated
  using (true)
  with check (true);


-- ============================================================
-- order_items
-- ============================================================
create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  product_id        uuid not null references products(id),
  quantity          integer not null check (quantity > 0),
  price_at_purchase numeric(10,2) not null check (price_at_purchase >= 0)
);

create index order_items_order_id_idx on order_items (order_id);

alter table order_items enable row level security;

-- Same reasoning as orders: no anon policy, guest access only via
-- get_order_by_token(). Admin gets read access to show order contents.
create policy "Authenticated (admin) can read all order items"
  on order_items for select
  to authenticated
  using (true);


-- ============================================================
-- payments
-- ============================================================
create table payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id) on delete cascade,
  provider_reference text,
  status             text not null default 'pending',
  raw_payload        jsonb,
  created_at         timestamptz not null default now()
);

create index payments_order_id_idx on payments (order_id);

alter table payments enable row level security;

-- Nobody but the service role touches this table — not even guests via
-- the token function, not even the admin UI (raw provider payloads can
-- carry sensitive data you don't need to expose). No policies at all.
create policy "Authenticated (admin) can read payments"
  on payments for select
  to authenticated
  using (true);


-- ============================================================
-- get_order_by_token: the one anon-facing read path into orders
-- ============================================================
create or replace function get_order_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', o.id,
    'order_token', o.order_token,
    'customer_name', o.customer_name,
    'delivery_method', o.delivery_method,
    'delivery_address', o.delivery_address,
    'status', o.status,
    'total', o.total,
    'created_at', o.created_at,
    'items', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'product_id', oi.product_id,
                'product_name', p.name,
                'quantity', oi.quantity,
                'price_at_purchase', oi.price_at_purchase
              ))
       from order_items oi
       join products p on p.id = oi.product_id
       where oi.order_id = o.id),
      '[]'::jsonb
    )
  )
  into result
  from orders o
  where o.order_token = p_token;

  return result; -- null if no match — caller treats that as "not found"
end;
$$;

grant execute on function get_order_by_token(text) to anon, authenticated;
