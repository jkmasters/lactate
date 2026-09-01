# Lactate

Step-test recorder and analysis for running lactate testing.

Three screens:

- **Capture** — run a graded step test trackside on a laptop. Entry on the
  left, the lactate curve building on the right, so you can see whether the
  threshold has been bracketed and add a stage if it hasn't.
- **Review** — one test: thresholds, curve, stage table, CSV export.
- **Analyze** — every test, tick the ones you want, then read them as
  overlaid curves or as thresholds trending over time.

## Thresholds

Computed from raw stage data, never stored as the source of truth, so
that adding a method later can be re-run against every historical test.

Fixed concentration:

| method | definition |
| --- | --- |
| LT1 | first stage rising ≥ 0.4 mmol above baseline |
| base +1.0 | baseline + 1.0 mmol, interpolated to HR |
| OBLA 4.0 | fixed 4 mmol, interpolated to HR and pace |

Curve shape:

| method | finds | how |
| --- | --- | --- |
| log-log | LT1 | breakpoint of ln(lactate) vs ln(velocity) |
| Dmax | LT2 | chord from the first stage to the last |
| Modified Dmax | LT2 | chord from LT1 to the last |

Log-log tries every split of the data, keeps the one with the lowest
combined residual, and takes the intersection of the two fitted lines
rather than the nearest stage. A lactate curve breaks upward, so a split
whose second segment is not steeper than the first is rejected as no
breakpoint at all; a shallow break still reports but is flagged.

The Dmax pair solve where the tangent to a fitted cubic matches the
chord's slope, which is the same point as the maximum perpendicular
distance without searching for it.

Both need five or more stages (a cubic through four points is an exact
fit and says nothing) and a genuinely maximal final stage, since the last
point anchors the chord. A test finishing below 4 mmol still reports but
is flagged in Review: it will read low, Dmax more so than Modified Dmax.

Baseline is the lowest of the first three stages — lactate often dips at
stage 2 or 3 as clearance catches up, and a three-stage window catches
that. The pre-test rest and baseline readings are recorded for reference
but do not feed the threshold math.

The Stegmann IAT is not implemented: it needs lactate sampled during
recovery, which this protocol does not collect.

## Running it

```bash
npm install
npm run dev
```

## Layout

```
src/
  lib/lactate.js   pure math, ported verbatim from the original artifact
  lib/storage.js   the entire persistence surface (localStorage today)
  pages/           Capture, Review, Analyze
  theme.js         palette + stylesheet
```

`lib/storage.js` is deliberately the only module that touches persistence,
so moving to a backend is a change to one file.

## Storage

Two backends behind one interface (`src/lib/storage.js`):

- **Supabase** when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are
  set at build time — shared between devices
- **localStorage** otherwise — per-browser, no setup

The fallback is deliberate: a missing env var degrades to a working
offline app rather than a blank page. Analyze shows which is live.

An in-progress test is always held locally, so a save failure or a lost
connection never costs you a test that has already been run.

## Setup

1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL editor, then `supabase/harden.sql`
   — change the password in `harden.sql` before running it
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify under
   Site configuration → Environment variables, and in `.env.local` for
   development
4. Optionally set `VITE_PASSPHRASE` for the shared passphrase screen

## Access

The publishable key ships in the bundle, so what actually controls
access is the row level security policy:

| role | can |
| --- | --- |
| anon | read, insert |
| anon | **not** update, **not** delete |

Deleting goes through `delete_test()`, a `security definer` function that
checks a password inside Postgres. The password is typed at the point of
use, so it never enters the bundle — unlike the entry passphrase, which
hides the UI and nothing more.

Worst case with a leaked key is junk rows, which are recoverable.
Destruction and tampering are not reachable.

To move data recorded before the backend existed, call
`migrateLocalToRemote()` from `src/lib/storage.js`, or use Export all
(JSON) and import it.
