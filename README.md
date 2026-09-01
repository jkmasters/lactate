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

| method | definition |
| --- | --- |
| LT1 | first stage rising ≥ 0.4 mmol above baseline |
| base +1.0 | baseline + 1.0 mmol, interpolated to HR |
| OBLA 4.0 | fixed 4 mmol, interpolated to HR and pace |

Baseline is the lowest of the first three stages — lactate often dips at
stage 2 or 3 as clearance catches up, and a three-stage window catches
that. The pre-test rest and baseline readings are recorded for reference
but do not feed the threshold math.

Dmax and log-log are not implemented.

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

## Status

Data lives in `localStorage` — per-browser, not shared between devices.
Supabase and the shared passphrase gate are next.
