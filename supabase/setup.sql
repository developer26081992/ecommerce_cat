-- Field & Form: run once in the target project SQL Editor on a fresh catalogue schema.
-- This transaction applies both migrations and the sample catalogue together.
begin;
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

-- Explicit grants also support projects without automatic public-schema grants.
-- PUBLIC is inherited by every role; revoke it as well as direct client grants.
revoke all on public.products, public.categories from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.products, public.categories to anon, authenticated;
grant select, insert, update, delete on public.products, public.categories to service_role;

-- Sample catalogue with local illustrative image paths. Safe to re-run.
insert into public.categories (id,name,slug) values
('10000000-0000-4000-8000-000000000001','Ceramics','ceramics'),
('10000000-0000-4000-8000-000000000002','Textiles','textiles'),
('10000000-0000-4000-8000-000000000003','Living','living')
on conflict (id) do nothing;

insert into public.products (id,slug,name,description,price,stock,"imageUrl","categoryId",featured) values
('20000000-0000-4000-8000-000000000001','terra-vase','Terra vase','An earthy silhouette for a single stem or a quiet corner. This sculptural stoneware vase has a softly textured, unglazed finish. Each piece brings a little warmth to the everyday.',420,8,'/products/vase.svg','10000000-0000-4000-8000-000000000001',true),
('20000000-0000-4000-8000-000000000002','everyday-mug','Everyday mug','A generous, rounded mug for slow mornings. Glazed stoneware with a comfortable handle and a natural clay foot. Holds 350 ml. Dishwasher safe.',185,16,'/products/mug.svg','10000000-0000-4000-8000-000000000001',true),
('20000000-0000-4000-8000-000000000003','linen-throw','Linen throw','A soft, breathable layer in a gentle olive tone. Drape it over your favourite chair or keep it close on cooler evenings. 130 × 180 cm. Gentle cold wash.',890,5,'/products/throw.svg','10000000-0000-4000-8000-000000000002',true),
('20000000-0000-4000-8000-000000000004','oak-serving-board','Oak serving board','Simple lines, a generous surface, and the warmth of natural oak. Made for bread, shared snacks, and easy gatherings. 38 × 20 cm. Hand wash and oil occasionally.',365,10,'/products/board.svg','10000000-0000-4000-8000-000000000003',true),
('20000000-0000-4000-8000-000000000005','gather-bowl','Gather bowl','A low, wide bowl in a soft chalk glaze. A lovely home for seasonal fruit or a shared salad. Stoneware, 26 cm diameter. Dishwasher safe.',340,7,'/products/bowl.svg','10000000-0000-4000-8000-000000000001',false),
('20000000-0000-4000-8000-000000000006','woven-cushion','Woven cushion','Rich texture, a quiet terracotta tone, and a soft cotton weave. An effortless finishing touch for your sofa. 45 × 45 cm, with removable cover.',450,0,'/products/cushion.svg','10000000-0000-4000-8000-000000000002',false)
on conflict (id) do nothing;

commit;