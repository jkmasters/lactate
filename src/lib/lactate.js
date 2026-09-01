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

   Baseline is the lowest of the first three stages. Lactate often dips
   slightly at stage 2 or 3 as clearance catches up with production, so
   looking across three stages catches a genuine low that a two-stage
   window would miss.

   The pre-test rest and baseline readings are deliberately NOT used
   here. Resting lactate is taken cold and sits well below anything
   measured under load; letting it set the baseline would drag LT1 down
   and make thresholds incomparable with tests recorded before those
   readings existed. They are recorded for reference, not for the math. */
export function analyze(rows) {
  const done = rows
    .filter((r) => r.lactate != null && r.hr != null && r.sec)
    .sort((a, b) => a.hr - b.hr);
  if (done.length < 3) return null;

  const base = Math.min(...done.slice(0, 3).map((r) => r.lactate));

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
    dmax: dmax(rows),
    modDmax: modifiedDmax(rows),
    logLog: logLog(rows),
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

/* ------------------------------------------------------------------ *
 *  Dmax and Modified Dmax
 *
 *  Both find the point on the fitted lactate curve lying furthest from
 *  a chord. Rather than measuring perpendicular distances, they solve
 *  where the tangent matches the chord's slope — the same point, one
 *  quadratic instead of a search.
 *
 *    Dmax          chord spans the first to the last stage
 *    Modified Dmax chord starts at LT1 instead, so an easy opening
 *                  stage cannot drag the answer around
 *
 *  x is velocity in m/s, the usual axis for a running curve. Heart rate
 *  is read back by interpolating the raw stages at the answer.
 * ------------------------------------------------------------------ */

/* Least-squares polynomial fit, normal equations + Gaussian elimination
   with partial pivoting. x is centred on its mean first: velocities
   cubed span two orders of magnitude and the uncentred matrix is badly
   conditioned. Returns coefficients in the centred variable. */
function polyfit(xs, ys, deg = 3) {
  const n = xs.length;
  const xbar = xs.reduce((a, b) => a + b, 0) / n;
  const u = xs.map((x) => x - xbar);
  const m = deg + 1;

  // normal equations: (VtV) c = Vty
  const A = Array.from({ length: m }, () => new Array(m + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += u[k] ** (i + j);
      A[i][j] = s;
    }
    let t = 0;
    for (let k = 0; k < n; k++) t += ys[k] * u[k] ** i;
    A[i][m] = t;
  }

  for (let col = 0; col < m; col++) {
    let piv = col;
    for (let r = col + 1; r < m; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-12) return null; // singular
    [A[col], A[piv]] = [A[piv], A[col]];
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let c = col; c <= m; c++) A[r][c] -= f * A[col][c];
    }
  }

  const c = A.map((row, i) => row[m] / A[i][i]);
  return { c, xbar };
}

const polyval = ({ c, xbar }, x) => {
  const u = x - xbar;
  return c.reduce((sum, ci, i) => sum + ci * u ** i, 0);
};

/* Solve f'(u) = slope for a cubic, returning candidate x values inside
   [lo, hi]. Falls back to the linear case when the cubic term vanishes. */
function tangentAt(fit, slope, lo, hi) {
  const [, c1, c2, c3] = fit.c;
  const out = [];
  if (Math.abs(c3) < 1e-12) {
    if (Math.abs(c2) > 1e-12) out.push((slope - c1) / (2 * c2) + fit.xbar);
  } else {
    const disc = 4 * c2 * c2 - 12 * c3 * (c1 - slope);
    if (disc < 0) return [];
    const r = Math.sqrt(disc);
    out.push((-2 * c2 + r) / (6 * c3) + fit.xbar, (-2 * c2 - r) / (6 * c3) + fit.xbar);
  }
  return out.filter((x) => Number.isFinite(x) && x >= lo && x <= hi);
}

/* Linear interpolation of a stage field at a given velocity. */
function atVelocity(pts, key, v) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (v >= a.v && v <= b.v) {
      const f = b.v === a.v ? 0 : (v - a.v) / (b.v - a.v);
      return a[key] + f * (b[key] - a[key]);
    }
  }
  return null;
}

/* startIdx = 0 gives Dmax; the LT1 stage gives Modified Dmax. */
function dmaxFrom(rows, startIdx) {
  const pts = rows
    .filter((r) => r.lactate != null && r.perMileSec && r.hr != null)
    .map((r) => ({ v: MILE_M / r.perMileSec, y: r.lactate, hr: r.hr, perMileSec: r.perMileSec }))
    .sort((a, b) => a.v - b.v);

  // a cubic through four points is an exact fit with no residual, so the
  // curve is only meaningful from five stages up
  if (pts.length < 5 || startIdx > pts.length - 2) return null;

  const fit = polyfit(pts.map((p) => p.v), pts.map((p) => p.y), 3);
  if (!fit) return null;

  const a = pts[startIdx], b = pts[pts.length - 1];
  if (b.v <= a.v) return null;
  const slope = (b.y - a.y) / (b.v - a.v);

  const cands = tangentAt(fit, slope, a.v, b.v);
  if (!cands.length) return null;

  // furthest from the chord, when the quadratic gives two candidates
  const dist = (x) => Math.abs(slope * (x - a.v) + a.y - polyval(fit, x));
  const v = cands.reduce((best, x) => (dist(x) > dist(best) ? x : best), cands[0]);

  const perMileSec = MILE_M / v;
  return {
    v,
    lactate: +polyval(fit, v).toFixed(2),
    hr: Math.round(atVelocity(pts, "hr", v) ?? NaN) || null,
    pace: `${Math.floor(perMileSec / 60)}:${pad(Math.round(perMileSec % 60))}`,
    perMileSec,
    /* The last stage anchors the chord, so a test that stopped short of
       a genuine maximal effort pulls the answer down — and it does so
       quietly, producing a number that looks perfectly reasonable. Flag
       it rather than hide it. */
    submaximal: b.y < 4.0,
    stages: pts.length,
  };
}

export function dmax(rows) {
  return dmaxFrom(rows, 0);
}

/* The chord starts at the first stage rising >= 0.4 mmol over baseline —
   the same LT1 the fixed-threshold analysis already reports. */
export function modifiedDmax(rows) {
  const pts = rows
    .filter((r) => r.lactate != null && r.perMileSec && r.hr != null)
    .sort((a, b) => MILE_M / a.perMileSec - MILE_M / b.perMileSec);
  if (pts.length < 5) return null;

  const base = Math.min(...pts.slice(0, 3).map((r) => r.lactate));
  let start = -1;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].lactate - base >= 0.4) { start = i; break; }
  }
  if (start < 0 || start > pts.length - 2) return null;
  return dmaxFrom(rows, start);
}

/* ------------------------------------------------------------------ *
 *  Log-log (Beaver et al.)
 *
 *  ln(lactate) against ln(velocity) falls into two roughly straight
 *  segments; where they meet is LT1. Every split of the data is tried,
 *  the one with the lowest combined residual wins, and the threshold is
 *  taken as the intersection of the two fitted lines rather than the
 *  nearest data point — so the answer is not pinned to a stage boundary.
 * ------------------------------------------------------------------ */

/* Ordinary least squares. Returns slope, intercept and residual sum. */
function lineFit(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  if (Math.abs(sxx) < 1e-15) return null;      // vertical, no fit
  const b = sxy / sxx;
  const a = my - b * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i] - (a + b * xs[i])) ** 2;
  return { a, b, sse };
}

export function logLog(rows) {
  const pts = rows
    .filter((r) => r.lactate != null && r.lactate > 0 && r.perMileSec && r.hr != null)
    .map((r) => ({ v: MILE_M / r.perMileSec, y: r.lactate, hr: r.hr }))
    .sort((a, b) => a.v - b.v);

  // two segments of at least two points each
  if (pts.length < 4) return null;

  const X = pts.map((p) => Math.log(p.v));
  const Y = pts.map((p) => Math.log(p.y));

  let best = null;
  for (let k = 1; k <= pts.length - 3; k++) {
    const lo = lineFit(X.slice(0, k + 1), Y.slice(0, k + 1));
    const hi = lineFit(X.slice(k + 1), Y.slice(k + 1));
    if (!lo || !hi) continue;
    const sse = lo.sse + hi.sse;
    if (!best || sse < best.sse) best = { sse, lo, hi, k };
  }
  if (!best) return null;

  // intersection of the two lines
  const { lo, hi } = best;
  if (Math.abs(lo.b - hi.b) < 1e-9) return null;          // parallel
  const xStar = (hi.a - lo.a) / (lo.b - hi.b);
  if (!Number.isFinite(xStar) || xStar < X[0] || xStar > X[X.length - 1]) return null;

  /* A lactate curve breaks upward: past LT1 the second segment must be
     steeper than the first. If the best split does not produce that, the
     data has no breakpoint and the intersection is an artefact of fitting
     two lines to what is really one. */
  const ratio = hi.b / lo.b;
  if (!(ratio > 1)) return null;

  const v = Math.exp(xStar);
  const perMileSec = MILE_M / v;
  return {
    v,
    lactate: +Math.exp(lo.a + lo.b * xStar).toFixed(2),
    hr: Math.round(atVelocity(pts, "hr", v) ?? NaN) || null,
    pace: `${Math.floor(perMileSec / 60)}:${pad(Math.round(perMileSec % 60))}`,
    perMileSec,
    slopeRatio: +ratio.toFixed(2),
    /* Real curves break hard — ratios of 2 and up. A shallow break is
       worth reporting but not worth trusting on its own. */
    weak: ratio < 1.5,
  };
}
