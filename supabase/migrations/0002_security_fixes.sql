-- MORFI Store — fixes from Supabase linter run on 0001_init.sql
--
-- 1. function_search_path_mutable: pin search_path on every function,
--    not just the SECURITY DEFINER ones — an unpinned search_path is
--    a hijack vector if an attacker can create objects in a schema
--    that resolves earlier than intended.
--
-- 2. rls_policy_always_true on orders UPDATE (authenticated): the
--    existing `using (true) with check (true)` policy lets an admin
--    session rewrite customer_name/phone/total/etc, not just flip
--    status. RLS's WITH CHECK only ever sees the candidate new row —
--    it can't compare against OLD — so "only status may change" isn't
--    expressible as a policy at all. That needs a trigger, which can
--    see both NEW and OLD.

create or replace function generate_order_token()
returns text
language sql
volatile
set search_path = public, extensions, pg_temp
as $$
  select encode(gen_random_bytes(16), 'hex');
$$;

create or replace function get_order_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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

  return result;
end;
$$;

-- Scoped to `authenticated` only via the trigger's WHEN clause:
-- service_role (server-side code — create-order, payment webhook)
-- bypasses RLS entirely and still needs to write any column. This
-- trigger only fires for browser-session admin updates.
create or replace function prevent_order_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.customer_name    is distinct from old.customer_name
     or new.customer_phone   is distinct from old.customer_phone
     or new.delivery_method  is distinct from old.delivery_method
     or new.delivery_address is distinct from old.delivery_address
     or new.total            is distinct from old.total
     or new.order_token      is distinct from old.order_token
     or new.created_at       is distinct from old.created_at
  then
    raise exception 'Only status can be updated on this row';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_restrict_admin_update on orders;
create trigger orders_restrict_admin_update
  before update on orders
  for each row
  when (auth.role() = 'authenticated')
  execute function prevent_order_field_changes();
