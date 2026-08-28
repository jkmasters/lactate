/* ------------------------------------------------------------------ *
 *  Lactate math — ported verbatim from the artifact baseline (9821237)
 *
 *  Everything here is pure: no React, no storage, no DOM. That is
 *  deliberate. These are the functions whose output we care about
 *  being *right*, so they stay testable in isolation and unchanged
 *  from the version that was validated trackside.
 * ------------------------------------------------------------------ */

export const MILE_M = 1609.344;

export const pad = (n) => String(n).padStart(2, "0");

// decimal minutes -> m:ss, guarding the 9.999 -> "9:60" rollover
export function minToPace(v) {
  let m = Math.floor(v);
  let s = Math.round((v - m) * 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}:${pad(s)}`;
}

export function paceFrom(sec, meters) {
  if (!sec || !meters) return null;
  const perMile = (sec * MILE_M) / meters;
  const perKm = (sec * 1000) / meters;
  return {
    mile: `${Math.floor(perMile / 60)}:${pad(Math.round(perMile % 60))}`,
    km: `${Math.floor(perKm / 60)}:${pad(Math.round(perKm % 60))}`,
    ms: (meters / sec).toFixed(2),
    mph: ((meters / sec) * 2.2369363).toFixed(1),
    perMileSec: perMile,
  };
}

/* Linear interpolation to find the value of `key` at a target lactate.
   Walks consecutive stages looking for the bracket where lactate crosses
   `target`, then interpolates within it. Returns null if never crossed. */
export function interpAt(rows, target, key) {
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1],
      b = rows[i];
    if (a.lactate < target && b.lactate >= target) {
      const f = (target - a.lactate) / (b.lactate - a.lactate);
      return a[key] + f * (b[key] - a[key]);
    }
  }
  return null;
}

/* Threshold analysis.

   Three methods, all derived from raw stage data so they can be
   recomputed if the method ever changes:
     - LT1      first stage rising >= 0.4 mmol above baseline
     - OBLA 4.0 fixed 4 mmol, interpolated to HR and pace
     - base+1   baseline + 1.0 mmol, interpolated to HR

   Baseline is the lower of the first two stages, which assumes the
   test opens easy enough that stage 1 or 2 is genuinely aerobic. */
export function analyze(rows) {
  const done = rows
    .filter((r) => r.lactate != null && r.hr != null && r.sec)
    .sort((a, b) => a.hr - b.hr);
  if (done.length < 3) return null;

  const base = Math.min(...done.slice(0, 2).map((r) => r.lactate));

  // LT1: first stage rising >= 0.4 mmol above the running baseline
  let lt1 = null;
  for (let i = 1; i < done.length; i++) {
    if (done[i].lactate - base >= 0.4) {
      lt1 = { from: done[i - 1], to: done[i] };
      break;
    }
  }

  const hr4 = interpAt(done, 4.0, "hr");
  const pace4 = interpAt(done, 4.0, "perMileSec");
  const hrBase1 = interpAt(done, base + 1.0, "hr");

  return {
    base,
    lt1,
    hr4: hr4 ? Math.round(hr4) : null,
    pace4: pace4 ? `${Math.floor(pace4 / 60)}:${pad(Math.round(pace4 % 60))}` : null,
    hrBase1: hrBase1 ? Math.round(hrBase1) : null,
    max: done[done.length - 1],
  };
}

/* Derive display rows from raw stage input.

   Pace fields are computed, never stored — `sec` and `dist` are the
   source of truth. Keeping the derived paces out of persistence stops
   them drifting out of sync with the times they came from. */
export function deriveRows(stages, dist) {
  return stages.map((s, i) => {
    const sec = s.min || s.sec ? (+s.min || 0) * 60 + (+s.sec || 0) : null;
    const p = paceFrom(sec, dist);
    return {
      n: i + 1,
      target: s.target,
      note: s.note || "",
      hr: s.hr === "" || s.hr == null ? null : +s.hr,
      lactate: s.lact === "" || s.lact == null ? null : +s.lact,
      sec,
      pace: p?.mile ?? null,
      km: p?.km ?? null,
      ms: p?.ms ?? null,
      mph: p?.mph ?? null,
      perMileSec: p?.perMileSec ?? null,
    };
  });
}
