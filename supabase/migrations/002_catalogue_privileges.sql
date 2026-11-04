-- Explicit grants also support projects without automatic public-schema grants.
-- PUBLIC is inherited by every role; revoke it as well as direct client grants.
revoke all on public.products, public.categories from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.products, public.categories to anon, authenticated;
grant select, insert, update, delete on public.products, public.categories to service_role;
