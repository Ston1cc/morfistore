-- MORFI Store — atomic order creation
--
-- Wraps "validate stock/price, insert order, insert order_items, decrement
-- stock" in a single Postgres function so it all happens in one
-- transaction: any failure (bad product, insufficient stock) rolls back
-- everything, and `select ... for update` on each product row prevents
-- two concurrent checkouts from both passing the stock check and
-- overselling the same item.
--
-- Prices are never taken from the caller — price_at_purchase and the
-- order total are both read from the products table inside this
-- function, using the same row lock. Only the /api/create-order
-- serverless function (service_role) is meant to call this — see the
-- revoke at the bottom.

create or replace function create_order(
  p_customer_name    text,
  p_customer_phone   text,
  p_delivery_method  text,
  p_delivery_address text,
  p_items            jsonb
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_order_id    uuid;
  v_order_token text;
  v_total       numeric(10,2) := 0;
  v_item        jsonb;
  v_product     products%rowtype;
  v_qty         integer;
begin
  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'customer_name is required';
  end if;
  if p_customer_phone is null or btrim(p_customer_phone) = '' then
    raise exception 'customer_phone is required';
  end if;
  if p_delivery_method is null or btrim(p_delivery_method) = '' then
    raise exception 'delivery_method is required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  insert into orders (customer_name, customer_phone, delivery_method, delivery_address, total)
  values (p_customer_name, p_customer_phone, p_delivery_method, p_delivery_address, 0)
  returning id, order_token into v_order_id, v_order_token;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity in order item: %', v_item;
    end if;

    select * into v_product
    from products
    where id = (v_item->>'product_id')::uuid
    for update;

    if not found or not v_product.active then
      raise exception 'Product % is not available', v_item->>'product_id';
    end if;

    if v_product.stock < v_qty then
      raise exception 'Not enough stock for %', v_product.name;
    end if;

    insert into order_items (order_id, product_id, quantity, price_at_purchase)
    values (v_order_id, v_product.id, v_qty, v_product.price);

    update products set stock = stock - v_qty where id = v_product.id;

    v_total := v_total + v_product.price * v_qty;
  end loop;

  update orders set total = v_total where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_token', v_order_token,
    'total', v_total
  );
end;
$$;

-- No anon/authenticated execute grant — only service_role (which
-- bypasses grants) is meant to reach this. Ordinary Postgres function
-- creation grants EXECUTE to PUBLIC by default, so this has to be
-- revoked explicitly.
revoke all on function create_order(text, text, text, text, jsonb) from public;
