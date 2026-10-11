-- =====================================================================
-- Smoke Shop Accessories: price quoting + multiple wholesale documents
-- Run this ONCE in Supabase > SQL Editor > New query > paste > Run.
-- It only ADDS new tables and functions. It does not change or delete
-- anything that already exists (orders, place_order, catalog, etc.).
-- Safe to run again if something fails halfway.
-- =====================================================================

-- ---------- helpers ----------
create or replace function public.q_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------- 1. who may use quoting ----------
-- Wholesale = allowed by default. Retail = only when admin switches it on.
-- A row here is an admin override (on or off) for one customer.
create table if not exists public.quote_permissions (
  customer_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null,
  updated_at timestamptz not null default now()
);

create or replace function public.q_allowed(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select qp.enabled from public.quote_permissions qp where qp.customer_id = uid),
    (select p.role = 'wholesale' from public.profiles p where p.id = uid),
    false)
$$;

-- ---------- 2. how many pieces unlock quoting (by price band) ----------
create table if not exists public.quote_rules (
  id bigint generated always as identity primary key,
  min_price numeric(10,2) not null default 0,
  max_price numeric(10,2),            -- empty = no upper limit
  min_qty int not null check (min_qty >= 1)
);
-- Starting values (change them any time in Admin > Quotes > Rules):
insert into public.quote_rules (min_price, max_price, min_qty)
select * from (values (0::numeric, 20::numeric, 15), (20, 60, 6), (60, null, 3)) v(a, b, c)
where not exists (select 1 from public.quote_rules);

-- ---------- 3. quotes, offers, saved prices ----------
do $$
declare pt text;
begin
  select format_type(a.atttypid, a.atttypmod) into pt
  from pg_attribute a where a.attrelid = 'public.products'::regclass and a.attname = 'id' and not a.attisdropped;

  execute format($f$
    create table if not exists public.quotes (
      id bigint generated always as identity primary key,
      customer_id uuid not null references public.profiles(id) on delete cascade,
      product_id %s not null references public.products(id) on delete cascade,
      qty int not null check (qty >= 1),
      list_price numeric(10,2) not null,
      customer_price numeric(10,2),      -- customer's latest offer
      store_price numeric(10,2),         -- store's latest counter
      final_price numeric(10,2),
      min_qty_applies int,               -- saved price applies from this many pieces
      status text not null default 'pending'
        check (status in ('pending','countered','accepted','declined','rejected')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )$f$, pt);

  execute format($f$
    create table if not exists public.customer_prices (
      id bigint generated always as identity primary key,
      customer_id uuid not null references public.profiles(id) on delete cascade,
      product_id %s not null references public.products(id) on delete cascade,
      price numeric(10,2) not null,
      min_qty int not null default 1,
      quote_id bigint references public.quotes(id) on delete set null,
      created_at timestamptz not null default now(),
      unique (customer_id, product_id)
    )$f$, pt);
end $$;

create table if not exists public.quote_offers (
  id bigint generated always as identity primary key,
  quote_id bigint not null references public.quotes(id) on delete cascade,
  actor text not null check (actor in ('customer','admin')),
  action text not null default 'offer',   -- offer, counter, accept, reject, decline
  price numeric(10,2),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists quotes_customer_idx on public.quotes (customer_id, product_id);
create index if not exists quotes_status_idx on public.quotes (status);
create index if not exists quote_offers_quote_idx on public.quote_offers (quote_id);

-- ---------- 4. row level security (read only; all writes go through functions) ----------
alter table public.quote_permissions enable row level security;
alter table public.quote_rules enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_offers enable row level security;
alter table public.customer_prices enable row level security;

drop policy if exists qp_read on public.quote_permissions;
create policy qp_read on public.quote_permissions for select using (customer_id = auth.uid() or public.q_is_admin());
drop policy if exists qr_read on public.quote_rules;
create policy qr_read on public.quote_rules for select using (true);
drop policy if exists q_read on public.quotes;
create policy q_read on public.quotes for select using (customer_id = auth.uid() or public.q_is_admin());
drop policy if exists qo_read on public.quote_offers;
create policy qo_read on public.quote_offers for select using (
  exists (select 1 from public.quotes q where q.id = quote_id and (q.customer_id = auth.uid() or public.q_is_admin())));
drop policy if exists cp_read on public.customer_prices;
create policy cp_read on public.customer_prices for select using (customer_id = auth.uid() or public.q_is_admin());

-- ---------- 5. functions ----------
-- What the logged-in customer may do + the quantity rules.
create or replace function public.quote_my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'allowed', public.q_allowed(auth.uid()),
    'rules', coalesce((select jsonb_agg(jsonb_build_object('min_price', min_price, 'max_price', max_price, 'min_qty', min_qty) order by min_price) from public.quote_rules), '[]'::jsonb))
$$;

-- The regular price this customer pays (retail, or wholesale after their extra discount).
create or replace function public.q_ref_price(uid uuid, pid text) returns numeric
language sql stable security definer set search_path = public as $$
  select case when p.role = 'wholesale'
              then round(pr.wholesale_price * (1 - coalesce(p.price_adjust_pct, 0) / 100.0), 2)
              else pr.retail_price end
  from public.products pr, public.profiles p
  where pr.id::text = pid and p.id = uid
$$;

create or replace function public.q_min_qty(price numeric) returns int
language sql stable security definer set search_path = public as $$
  select min_qty from public.quote_rules
  where price >= min_price and (max_price is null or price < max_price)
  order by min_price desc limit 1
$$;

-- Customer sends a first quote request for one item.
create or replace function public.quote_submit(p_product text, p_qty int, p_price numeric, p_list numeric, p_note text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_pid public.products.id%type;
  v_ref numeric; v_list numeric; v_min int; v_saved record; v_id bigint;
begin
  if uid is null then raise exception 'Please log in.'; end if;
  if not exists (select 1 from public.profiles where id = uid and status = 'approved') then
    raise exception 'Your account is not approved yet.'; end if;
  if not public.q_allowed(uid) then raise exception 'Price quotes are not available on your account.'; end if;

  select id into v_pid from public.products where id::text = p_product;
  if v_pid is null then raise exception 'Item not found.'; end if;
  v_ref := public.q_ref_price(uid, p_product);
  if v_ref is null then raise exception 'This item has no price yet.'; end if;
  v_list := least(v_ref, coalesce(nullif(p_list, 0), v_ref));

  select * into v_saved from public.customer_prices where customer_id = uid and product_id = v_pid;
  if found then v_list := least(v_list, v_saved.price); end if;

  v_min := public.q_min_qty(v_ref);
  if v_min is null or p_qty is null or p_qty < v_min then
    raise exception 'Quote requests are not open for this quantity.'; end if;
  if p_price is null or p_price <= 0 then raise exception 'Enter the price you want per piece.'; end if;
  if p_price >= v_list then raise exception 'Your price must be lower than the current price of $%.', to_char(v_list, 'FM999990.00'); end if;

  if exists (select 1 from public.quotes where customer_id = uid and product_id = v_pid and status <> 'accepted') then
    raise exception 'You already have a quote open for this item. Open it and use "Send a new price".'; end if;

  insert into public.quotes (customer_id, product_id, qty, list_price, customer_price, status)
  values (uid, v_pid, p_qty, v_list, round(p_price, 2), 'pending') returning id into v_id;
  insert into public.quote_offers (quote_id, actor, action, price, note)
  values (v_id, 'customer', 'offer', round(p_price, 2), nullif(left(p_note, 300), ''));
  return v_id;
end $$;

-- Customer sends a NEW price on an existing quote (never the same amount as before).
create or replace function public.quote_requote(p_quote bigint, p_price numeric, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q public.quotes%rowtype; v_ref numeric; v_list numeric;
begin
  select * into q from public.quotes where id = p_quote and customer_id = uid for update;
  if not found then raise exception 'Quote not found.'; end if;
  if q.status not in ('countered', 'declined', 'rejected') then
    raise exception 'You can send a new price after the store replies.'; end if;
  if not public.q_allowed(uid) then raise exception 'Price quotes are not available on your account.'; end if;
  if p_price is null or p_price <= 0 then raise exception 'Enter the price you want per piece.'; end if;

  v_ref := public.q_ref_price(uid, q.product_id::text);
  v_list := least(q.list_price, coalesce(v_ref, q.list_price));
  if p_price >= v_list then raise exception 'Your price must be lower than the current price of $%.', to_char(v_list, 'FM999990.00'); end if;

  if exists (
    select 1 from public.quote_offers o join public.quotes qq on qq.id = o.quote_id
    where qq.customer_id = uid and qq.product_id = q.product_id and o.actor = 'customer' and o.price = round(p_price, 2)
  ) then raise exception 'You already asked for that price. Please send a different amount.'; end if;

  update public.quotes set status = 'pending', customer_price = round(p_price, 2), store_price = null,
         list_price = v_list, updated_at = now() where id = q.id;
  insert into public.quote_offers (quote_id, actor, action, price, note)
  values (q.id, 'customer', 'offer', round(p_price, 2), nullif(left(p_note, 300), ''));
end $$;

-- Customer accepts or declines the store's counter-offer.
create or replace function public.quote_respond(p_quote bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q public.quotes%rowtype;
begin
  select * into q from public.quotes where id = p_quote and customer_id = uid for update;
  if not found then raise exception 'Quote not found.'; end if;
  if q.status <> 'countered' then raise exception 'There is no store offer to answer right now.'; end if;

  if p_accept then
    update public.quotes set status = 'accepted', final_price = q.store_price, updated_at = now() where id = q.id;
    insert into public.customer_prices (customer_id, product_id, price, min_qty, quote_id)
    values (uid, q.product_id, q.store_price, coalesce(q.min_qty_applies, q.qty), q.id)
    on conflict (customer_id, product_id) do update
      set price = excluded.price, min_qty = excluded.min_qty, quote_id = excluded.quote_id, created_at = now();
    insert into public.quote_offers (quote_id, actor, action, price) values (q.id, 'customer', 'accept', q.store_price);
  else
    update public.quotes set status = 'declined', updated_at = now() where id = q.id;
    insert into public.quote_offers (quote_id, actor, action, price) values (q.id, 'customer', 'decline', q.store_price);
  end if;
end $$;

-- Admin: accept the customer's price, counter with another price, or reject.
create or replace function public.quote_admin_respond(p_quote bigint, p_action text, p_price numeric default null, p_note text default null, p_min_qty int default null)
returns void language plpgsql security definer set search_path = public as $$
declare q public.quotes%rowtype; v_min int;
begin
  if not public.q_is_admin() then raise exception 'Admin only.'; end if;
  select * into q from public.quotes where id = p_quote for update;
  if not found then raise exception 'Quote not found.'; end if;
  if q.status not in ('pending', 'declined') then raise exception 'This quote is not waiting for you.'; end if;
  v_min := greatest(1, coalesce(p_min_qty, q.qty));

  if p_action = 'accept' then
    if q.status <> 'pending' then raise exception 'The customer declined your last offer. Send a new price or reject.'; end if;
    update public.quotes set status = 'accepted', final_price = q.customer_price, min_qty_applies = v_min, updated_at = now() where id = q.id;
    insert into public.customer_prices (customer_id, product_id, price, min_qty, quote_id)
    values (q.customer_id, q.product_id, q.customer_price, v_min, q.id)
    on conflict (customer_id, product_id) do update
      set price = excluded.price, min_qty = excluded.min_qty, quote_id = excluded.quote_id, created_at = now();
    insert into public.quote_offers (quote_id, actor, action, price, note) values (q.id, 'admin', 'accept', q.customer_price, nullif(left(p_note, 300), ''));

  elsif p_action = 'counter' then
    if p_price is null or p_price <= 0 then raise exception 'Enter your price.'; end if;
    if p_price < coalesce(q.customer_price, 0) then raise exception 'Your counter is lower than what the customer asked for.'; end if;
    if p_price >= q.list_price then raise exception 'Your counter must be lower than the current price of $%.', to_char(q.list_price, 'FM999990.00'); end if;
    if p_price = q.customer_price then raise exception 'That is the customer''s price. Use "Accept their price".'; end if;
    update public.quotes set status = 'countered', store_price = round(p_price, 2), min_qty_applies = v_min, updated_at = now() where id = q.id;
    insert into public.quote_offers (quote_id, actor, action, price, note) values (q.id, 'admin', 'counter', round(p_price, 2), nullif(left(p_note, 300), ''));

  elsif p_action = 'reject' then
    update public.quotes set status = 'rejected', updated_at = now() where id = q.id;
    insert into public.quote_offers (quote_id, actor, action, note) values (q.id, 'admin', 'reject', nullif(left(p_note, 300), ''));
  else
    raise exception 'Unknown action.';
  end if;
end $$;

-- Admin: switch quoting on/off for one customer (retail = on only when you allow it).
create or replace function public.quote_set_permission(p_customer uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.q_is_admin() then raise exception 'Admin only.'; end if;
  insert into public.quote_permissions (customer_id, enabled) values (p_customer, p_enabled)
  on conflict (customer_id) do update set enabled = excluded.enabled, updated_at = now();
end $$;

-- Admin: replace the quantity rules.
create or replace function public.quote_save_rules(p_rules jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.q_is_admin() then raise exception 'Admin only.'; end if;
  if jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) = 0 then raise exception 'Add at least one rule.'; end if;
  delete from public.quote_rules where true;
  insert into public.quote_rules (min_price, max_price, min_qty)
  select coalesce((r->>'min_price')::numeric, 0), nullif(r->>'max_price', '')::numeric, greatest(1, (r->>'min_qty')::int)
  from jsonb_array_elements(p_rules) r;
end $$;

-- Admin: remove a customer's saved price.
create or replace function public.quote_delete_saved_price(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.q_is_admin() then raise exception 'Admin only.'; end if;
  delete from public.customer_prices where id = p_id;
end $$;

grant execute on function public.quote_my_access() to authenticated;
grant execute on function public.quote_submit(text, int, numeric, numeric, text) to authenticated;
grant execute on function public.quote_requote(bigint, numeric, text) to authenticated;
grant execute on function public.quote_respond(bigint, boolean) to authenticated;
grant execute on function public.quote_admin_respond(bigint, text, numeric, text, int) to authenticated;
grant execute on function public.quote_set_permission(uuid, boolean) to authenticated;
grant execute on function public.quote_save_rules(jsonb) to authenticated;
grant execute on function public.quote_delete_saved_price(bigint) to authenticated;

-- ---------- 6. wholesale: many license / permit pictures ----------
create table if not exists public.wholesale_documents (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null default 'other'
    check (doc_type in ('tobacco_license', 'tax_permit', 'ecig_permit', 'other')),
  path text not null,
  file_name text,
  created_at timestamptz not null default now()
);
create index if not exists wholesale_documents_customer_idx on public.wholesale_documents (customer_id);
alter table public.wholesale_documents enable row level security;

drop policy if exists wd_read on public.wholesale_documents;
create policy wd_read on public.wholesale_documents for select using (customer_id = auth.uid() or public.q_is_admin());
drop policy if exists wd_insert on public.wholesale_documents;
create policy wd_insert on public.wholesale_documents for insert
  with check (customer_id = auth.uid() and path like auth.uid()::text || '/%');
drop policy if exists wd_delete on public.wholesale_documents;
create policy wd_delete on public.wholesale_documents for delete using (customer_id = auth.uid());
