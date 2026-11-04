-- Apply in Supabase SQL Editor. Public clients may read but cannot mutate catalogue data.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  "imageUrl" text not null,
  "categoryId" uuid not null references public.categories(id),
  featured boolean not null default false,
  "createdAt" timestamptz not null default now()
);
create index products_category_idx on public.products ("categoryId");
alter table public.categories enable row level security;
alter table public.products enable row level security;
create policy "Anyone can read categories" on public.categories for select to anon, authenticated using (true);
create policy "Anyone can read products" on public.products for select to anon, authenticated using (true);
revoke all on public.products, public.categories from anon, authenticated;
grant select on public.products, public.categories to anon, authenticated;
-- Public storage bucket prepared for later product uploads; no anonymous upload policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
