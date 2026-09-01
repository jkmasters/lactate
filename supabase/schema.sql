-- Lactate — schema
-- Run this in the Supabase SQL editor (Database → SQL Editor → New query).

-- One row per test. Stage data is JSONB rather than a child table: the app
-- always loads and saves a whole test, computes thresholds client-side, and
-- the dataset is two people's training history, not something that needs
-- relational querying. Trading joinability for a schema that is quick to
-- reason about and hard to get wrong.
--
-- What is NOT traded away: stages hold the raw recorded values, and every
-- threshold is derived from them at read time. Changing the threshold method
-- later still re-runs against all historical tests.

create table if not exists tests (
  id          bigint primary key,          -- Date.now() from the client
  athlete     text,
  date        date not null,
  label       text,
  hr_max      int,
  dist_m      int,
  temp        text,
  wind        text,
  notes       text,
  rest        jsonb,                       -- {hr, lact, note} taken cold
  baseline    jsonb,                       -- {hr, lact, note} after warm-up
  stages      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tests_date_idx    on tests (date desc);
create index if not exists tests_athlete_idx on tests (athlete);

-- keep updated_at honest
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tests_touch on tests;
create trigger tests_touch before update on tests
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- READ THIS BEFORE RUNNING IT.
--
-- There is no login, by design — so these policies grant the anonymous role
-- full read and write access. The anon key ships inside the JavaScript bundle
-- of a public site, which means anyone who opens the page, or finds the key
-- in it, can read, edit and delete every row in this table. The passphrase
-- screen in the app does not change that: it gates the UI, not the database.
--
-- That is a deliberate trade for a two-person tool with no sensitive data in
-- it. The mitigation is the "Export all (JSON)" button — take a copy after
-- each test and a bad day costs you nothing.
--
-- To close it properly later: move writes behind a Netlify Function holding
-- the service key, and drop these policies.
-- ---------------------------------------------------------------------------

alter table tests enable row level security;

drop policy if exists tests_anon_all on tests;
create policy tests_anon_all on tests
  for all
  to anon
  using (true)
  with check (true);
