-- Run as postgres/SQL Editor after both migrations and seed.sql.
-- Read-only assertions, followed by real SELECTs under each client role.
begin;
do $$
declare role_name text; table_name text; privilege_name text;
begin
  foreach table_name in array array['products', 'categories'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass) then
      raise exception 'RLS is disabled on %', table_name;
    end if;
    foreach role_name in array array['anon', 'authenticated'] loop
      if not has_table_privilege(role_name, 'public.' || table_name, 'SELECT') then
        raise exception '% cannot read %', role_name, table_name;
      end if;
      foreach privilege_name in array array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        if has_table_privilege(role_name, 'public.' || table_name, privilege_name) then
          raise exception 'Unexpected % privilege: % on %', privilege_name, role_name, table_name;
        end if;
      end loop;
      if has_any_column_privilege(role_name, 'public.' || table_name, 'INSERT')
        or has_any_column_privilege(role_name, 'public.' || table_name, 'UPDATE') then
        raise exception 'Unexpected column write grant: % on %', role_name, table_name;
      end if;
    end loop;
  end loop;
  if not exists (select 1 from storage.buckets where id = 'product-images' and public and 'image/png' = any(allowed_mime_types)) then
    raise exception 'Public product-images bucket missing or PNG disabled';
  end if;
end $$;

set local role anon;
do $$ begin
  if (select count(*) from public.categories where id::text like '10000000-0000-4000-8000-%') <> 3
    or (select count(*) from public.products where id::text like '20000000-0000-4000-8000-%') <> 6 then
    raise exception 'Anonymous role cannot read the complete seed catalogue';
  end if;
end $$;
reset role;

set local role authenticated;
do $$ begin
  if (select count(*) from public.categories where id::text like '10000000-0000-4000-8000-%') <> 3
    or (select count(*) from public.products where id::text like '20000000-0000-4000-8000-%') <> 6 then
    raise exception 'Authenticated role cannot read the complete seed catalogue';
  end if;
end $$;
reset role;

-- Inspect any existing Storage policies, especially broad write policies in reused projects.
select policyname, roles, cmd, qual, with_check from pg_policies
where schemaname = 'storage' and tablename = 'objects';
rollback;
