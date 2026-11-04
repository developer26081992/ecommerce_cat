-- Run once in Supabase SQL Editor after migrations 001-003.
begin;
create table public.checkout_attempts (
  id uuid primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  "requestedItems" jsonb not null,
  items jsonb not null,
  "amountTotal" bigint not null check ("amountTotal" > 0 and "amountTotal" <= 99999999),
  currency text not null default 'zar' check (currency = 'zar'),
  state text not null default 'pending' check (state in ('pending','completed','released')),
  "stripeSessionId" text unique,
  "createdAt" timestamptz not null default now(),
  "expiresAt" timestamptz not null default (now() + interval '35 minutes')
);
create index checkout_attempts_user_state_idx on public.checkout_attempts ("userId", state);
create table public.orders (
  id uuid primary key,
  "userId" uuid not null references auth.users(id) on delete cascade,
  "totalAmount" numeric(12,2) not null check ("totalAmount" > 0),
  currency text not null default 'zar' check (currency = 'zar'),
  status text not null default 'paid' check (status = 'paid'),
  "stripeSessionId" text not null unique,
  items jsonb not null,
  "createdAt" timestamptz not null default now()
);
create index orders_user_created_idx on public.orders ("userId", "createdAt" desc);
alter table public.checkout_attempts enable row level security;
alter table public.orders enable row level security;
revoke all on public.checkout_attempts, public.orders from public, anon, authenticated;
grant select on public.checkout_attempts, public.orders to authenticated;
grant select, insert, update, delete on public.checkout_attempts, public.orders to service_role;
create policy "Users can read their own checkout attempts" on public.checkout_attempts
  for select to authenticated using ((select auth.uid()) = "userId");
create policy "Users can read their own orders" on public.orders
  for select to authenticated using ((select auth.uid()) = "userId");

-- A short transaction lock serializes inventory changes for this small catalogue.
-- Reservations are released only after Stripe confirms expiry/cancellation, never
-- by a local clock alone: a delayed webhook must not permit another sale.
create function public.field_form_reserve_checkout(p_id uuid, p_user uuid, p_items jsonb)
returns public.checkout_attempts language plpgsql security definer set search_path = '' as $$
declare
  existing public.checkout_attempts; product public.products;
  item jsonb; snapshot jsonb := '[]'::jsonb; qty integer;
  held bigint; unit_amount bigint; total bigint := 0;
begin
  perform pg_advisory_xact_lock(482193);
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'INVALID_CART';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) v
    where jsonb_typeof(v) <> 'object' or jsonb_typeof(v->'quantity') <> 'number'
    or (v->>'quantity') !~ '^[1-9][0-9]?$' or (v->>'id') !~ '^[0-9a-fA-F-]{36}$') then
    raise exception 'INVALID_CART';
  end if;
  if (select count(distinct v->>'id') from jsonb_array_elements(p_items) v) <> jsonb_array_length(p_items) then
    raise exception 'INVALID_CART';
  end if;
  select * into existing from public.checkout_attempts where id = p_id for update;
  if found then
    if existing."userId" <> p_user or existing."requestedItems" <> p_items then raise exception 'REQUEST_CONFLICT'; end if;
    if existing.state = 'released' then raise exception 'CHECKOUT_RELEASED'; end if;
    return existing;
  end if;
  if (select count(*) from public.checkout_attempts where "userId" = p_user and state = 'pending') >= 3 then
    raise exception 'TOO_MANY_CHECKOUTS';
  end if;
  for item in select v from jsonb_array_elements(p_items) v order by v->>'id' loop
    qty := (item->>'quantity')::integer;
    select * into product from public.products where id = (item->>'id')::uuid for update;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    select coalesce(sum((v->>'quantity')::integer),0) into held
      from public.checkout_attempts a cross join lateral jsonb_array_elements(a.items) v
      where a.state = 'pending' and v->>'id' = product.id::text;
    if product.stock - held < qty then raise exception 'INSUFFICIENT_STOCK'; end if;
    unit_amount := (product.price * 100)::bigint;
    if unit_amount <= 0 or unit_amount > 99999999 then raise exception 'INVALID_PRICE'; end if;
    total := total + unit_amount * qty;
    if total > 99999999 then raise exception 'CART_TOTAL_TOO_LARGE'; end if;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object(
      'id', product.id, 'slug', product.slug, 'name', product.name,
      'imageUrl', product."imageUrl", 'quantity', qty, 'unitAmount', unit_amount));
  end loop;
  insert into public.checkout_attempts (id,"userId","requestedItems",items,"amountTotal")
    values (p_id,p_user,p_items,snapshot,total) returning * into existing;
  return existing;
end;
$$;

create function public.field_form_bind_checkout(p_id uuid, p_session text)
returns void language plpgsql security definer set search_path = '' as $$
declare attempt public.checkout_attempts;
begin
  perform pg_advisory_xact_lock(482193);
  select * into attempt from public.checkout_attempts where id = p_id for update;
  if not found or attempt.state = 'released' then raise exception 'CHECKOUT_UNAVAILABLE'; end if;
  if attempt."stripeSessionId" is not null and attempt."stripeSessionId" <> p_session then raise exception 'SESSION_MISMATCH'; end if;
  update public.checkout_attempts set "stripeSessionId" = p_session where id = p_id;
end;
$$;

create function public.field_form_release_checkout(p_id uuid, p_session text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare attempt public.checkout_attempts;
begin
  perform pg_advisory_xact_lock(482193);
  select * into attempt from public.checkout_attempts where id = p_id for update;
  if not found then return false; end if;
  if attempt."stripeSessionId" is not null and attempt."stripeSessionId" is distinct from p_session then raise exception 'SESSION_MISMATCH'; end if;
  if attempt.state = 'completed' then return false; end if;
  update public.checkout_attempts set state = 'released', "stripeSessionId" = coalesce("stripeSessionId",p_session) where id = p_id;
  return true;
end;
$$;

create function public.field_form_complete_checkout(p_id uuid, p_session text, p_user uuid, p_amount bigint, p_currency text)
returns public.orders language plpgsql security definer set search_path = '' as $$
declare attempt public.checkout_attempts; item jsonb; result public.orders; available integer;
begin
  perform pg_advisory_xact_lock(482193);
  select * into attempt from public.checkout_attempts where id = p_id for update;
  if not found then raise exception 'UNKNOWN_CHECKOUT'; end if;
  if attempt."userId" <> p_user or attempt."amountTotal" <> p_amount or attempt.currency <> p_currency
    or (attempt."stripeSessionId" is not null and attempt."stripeSessionId" <> p_session) then raise exception 'PAYMENT_MISMATCH'; end if;
  if attempt.state = 'completed' then select * into result from public.orders where id = p_id; return result; end if;
  if attempt.state <> 'pending' then raise exception 'CHECKOUT_RELEASED'; end if;
  for item in select v from jsonb_array_elements(attempt.items) v order by v->>'id' loop
    select stock into available from public.products where id = (item->>'id')::uuid for update;
    if not found or available < (item->>'quantity')::integer then raise exception 'INVENTORY_CONFLICT'; end if;
    update public.products set stock = stock - (item->>'quantity')::integer where id = (item->>'id')::uuid;
  end loop;
  insert into public.orders (id,"userId","totalAmount",currency,"stripeSessionId",items)
    values (p_id,p_user,p_amount::numeric / 100,p_currency,p_session,attempt.items) returning * into result;
  update public.checkout_attempts set state = 'completed', "stripeSessionId" = p_session where id = p_id;
  return result;
end;
$$;

revoke all on function public.field_form_reserve_checkout(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.field_form_bind_checkout(uuid,text) from public, anon, authenticated;
revoke all on function public.field_form_release_checkout(uuid,text) from public, anon, authenticated;
revoke all on function public.field_form_complete_checkout(uuid,text,uuid,bigint,text) from public, anon, authenticated;
grant execute on function public.field_form_reserve_checkout(uuid,uuid,jsonb) to service_role;
grant execute on function public.field_form_bind_checkout(uuid,text) to service_role;
grant execute on function public.field_form_release_checkout(uuid,text) to service_role;
grant execute on function public.field_form_complete_checkout(uuid,text,uuid,bigint,text) to service_role;
commit;
