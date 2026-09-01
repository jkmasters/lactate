-- Lactate — lock down write access
-- Run this AFTER schema.sql, in the Supabase SQL editor.
--
-- Replaces the open policy with something defensible:
--
--   anon can SELECT and INSERT
--   anon cannot UPDATE or DELETE at all
--   deleting goes through delete_test(), which checks a password inside
--   the database, where a client cannot walk around it
--
-- The password is typed by the person doing the deleting. It is never
-- built into the bundle, which is what makes this different from the
-- passphrase screen on the way in.

-- ---------------------------------------------------------------------------
-- 1. the secret
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

create table if not exists admin_secret (
  id        int primary key default 1,
  pass_hash text not null,
  constraint admin_secret_single_row check (id = 1)
);

-- RLS on with no policy at all: anon can neither read nor write this.
-- Only delete_test() reaches it, and only because that runs as definer.
alter table admin_secret enable row level security;

-- >>> CHANGE THIS PASSWORD <<<
insert into admin_secret (id, pass_hash)
values (1, extensions.crypt('change-me', extensions.gen_salt('bf')))
on conflict (id) do update set pass_hash = excluded.pass_hash;

-- ---------------------------------------------------------------------------
-- 2. delete, behind the password
-- ---------------------------------------------------------------------------

create or replace function delete_test(test_id bigint, pass text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ok boolean;
begin
  select (pass_hash = extensions.crypt(pass, pass_hash))
    into ok
    from admin_secret
   where id = 1;

  if not coalesce(ok, false) then
    raise exception 'Wrong password' using errcode = '28000';
  end if;

  delete from tests where id = test_id;
end;
$$;

revoke all on function delete_test(bigint, text) from public;
grant execute on function delete_test(bigint, text) to anon;

-- ---------------------------------------------------------------------------
-- 3. replace the open policy
-- ---------------------------------------------------------------------------

drop policy if exists tests_anon_all on tests;

create policy tests_anon_read on tests
  for select to anon using (true);

create policy tests_anon_insert on tests
  for insert to anon with check (true);

-- deliberately no update or delete policy: with RLS enabled, absent
-- policies deny. Saving a test is an insert; ids are unique per save.
