import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  getSessions, deleteSession, deleteNeedsPassword, exportAll, backend,
  getLocalSessions, migrateLocalToRemote,
} from "../lib/storage.js";
import { analyze, deriveRows, minToPace, pad } from "../lib/lactate.js";
import { C } from "../theme.js";

const SERIES = [C.signal, C.cool, C.warm, C.hot, "#8E7CC3", "#6FBF73"];

const METHODS = {
  obla:    { label: "OBLA 4.0",      name: "4 mmol" },
  dmax:    { label: "Dmax",          name: "Dmax" },
  moddmax: { label: "Modified Dmax", name: "Mod Dmax" },
};

const LT1_METHODS = {
  delta:  { label: "base +0.4", name: "base +0.4" },
  loglog: { label: "log-log",   name: "log-log" },
};

/* Where LT1 and LT2 fall on the intensity axis for one test, in whichever
   units the chart is currently plotting. Vertical lines, because a
   threshold is an intensity — the lactate value at it is incidental, and
   with a fixed method like OBLA every test would share one horizontal
   line anyway. */
function thresholdMarks(session, method, xMode, lt1Method = "delta") {
  const r = analyze(deriveRows(session.rows ?? [], session.dist));
  if (!r) return { lt1: null, lt2: null };

  const asX = (hr, perMileSec) =>
    xMode === "hr"
      ? (hr ?? null)
      : perMileSec != null ? perMileSec / 60 : null;

  const lt1src =
    lt1Method === "loglog" ? r.logLog
    : r.lt1 ? { hr: r.lt1.to.hr, perMileSec: r.lt1.to.perMileSec }
    : null;
  const lt1 = lt1src ? asX(lt1src.hr, lt1src.perMileSec) : null;

  const src =
    method === "dmax" ? r.dmax
    : method === "moddmax" ? r.modDmax
    : r.hr4 != null
      ? { hr: r.hr4, perMileSec: r.pace4 ? paceToMin(r.pace4) * 60 : null }
      : null;

  return { lt1, lt2: src ? asX(src.hr, src.perMileSec) : null };
}



/* Analyze — the landing page. Every capture, tick the ones you want,
   then read them two ways: curves overlaid, or thresholds over time. */
export default function Analyze() {
  const nav = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [strays, setStrays] = useState([]);   // local tests not in the DB
  const [importing, setImporting] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [athlete, setAthlete] = useState("all");
  const [lens, setLens] = useState("overlay"); // overlay | trend
  const [method, setMethod] = useState("obla");      // obla | dmax | moddmax
  const [lt1Method, setLt1Method] = useState("delta"); // delta | loglog
  const [xMode, setXMode] = useState("hr");    // hr | pace

  function load() {
    setError(null);
    getSessions()
      .then((s) => {
        const sorted = [...s].sort((a, b) => String(b.date).localeCompare(String(a.date)));
        setSessions(sorted);
        // preselect the two most recent so the page is useful on arrival
        setPicked(new Set(sorted.slice(0, 2).map((x) => String(x.id))));
        /* Tests recorded on this device before the shared database
           existed. Without this they simply disappear from view, which
           looks exactly like data loss. */
        if (backend() === "supabase") {
          const have = new Set(sorted.map((x) => String(x.id)));
          setStrays(getLocalSessions().filter((x) => !have.has(String(x.id))));
        }
        setLoaded(true);
      })
      .catch((e) => {
        setError(e.message);
        setLoaded(true);
      });
  }

  useEffect(load, []);

  const athletes = useMemo(
    () => [...new Set(sessions.map((s) => s.athlete).filter(Boolean))].sort(),
    [sessions]
  );

  const visible = useMemo(
    () => (athlete === "all" ? sessions : sessions.filter((s) => s.athlete === athlete)),
    [sessions, athlete]
  );

  const chosen = useMemo(
    () => visible.filter((s) => picked.has(String(s.id))),
    [visible, picked]
  );

  function toggle(id) {
    setPicked((prev) => {
      const next = new Set(prev);
      const k = String(id);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  const allShown = visible.length > 0 && visible.every((s) => picked.has(String(s.id)));
  function toggleAll() {
    setPicked(allShown ? new Set() : new Set(visible.map((s) => String(s.id))));
  }

  async function remove(s) {
    /* A blocking prompt is right here in a way it was not for the resume
       banner: this is rare, deliberate and irreversible, and stopping the
       world is the point. */
    let pw;
    if (deleteNeedsPassword()) {
      pw = prompt(`Delete "${s.label || s.date}"?\n\nThis cannot be undone. Enter the delete password:`);
      if (pw === null) return;
    } else if (!confirm(`Delete "${s.label || s.date}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteSession(s.id, pw);
      setSessions((prev) => prev.filter((x) => String(x.id) !== String(s.id)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function download() {
    const data = await exportAll();
    const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `lactate-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  if (!loaded) return <div className="lt-card lt-note">Loading…</div>;

  if (error) {
    return (
      <div className="lt-card" style={{ marginTop: 14, borderColor: C.hot }}>
        <div className="lt-eyebrow" style={{ color: C.hot }}>Could not reach the database</div>
        <div className="lt-h1">Saved tests are unavailable</div>
        <div className="lt-sub" style={{ margin: "8px 0 6px" }}>{error}</div>
        <div className="lt-note" style={{ marginBottom: 16 }}>
          Capture still works — a test in progress is held on this device and
          can be saved once the connection is back.
        </div>
        <div className="lt-foot">
          <button className="lt-btn lt-btn-ghost" onClick={() => nav("/capture")}>New capture</button>
          <button className="lt-btn lt-btn-primary" onClick={load} style={{ flex: 2 }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="lt-card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div className="lt-h1">No tests yet</div>
        <div className="lt-sub" style={{ margin: "8px 0 18px" }}>
          Run a step test and it will show up here.
        </div>
        <button className="lt-btn lt-btn-primary" onClick={() => nav("/capture")}>
          New capture
        </button>
      </div>
    );
  }

  async function importStrays() {
    setImporting(true);
    try {
      await migrateLocalToRemote();
      setStrays([]);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      {strays.length > 0 && (
        <div className="lt-resume" style={{ marginTop: 14 }}>
          <div>
            <div className="lt-resume-t">
              {strays.length} test{strays.length === 1 ? "" : "s"} on this device only
            </div>
            <div className="lt-resume-s lt-mono">
              {strays
                .slice(0, 3)
                .map((s) => `${s.date}${s.athlete ? ` · ${s.athlete}` : ""}`)
                .join("  ·  ")}
              {strays.length > 3 ? `  · +${strays.length - 3} more` : ""}
            </div>
            <div className="lt-resume-s">
              Recorded before the shared database existed. They are safe, just
              not uploaded yet.
            </div>
          </div>
          <button className="lt-btn lt-btn-primary" onClick={importStrays} disabled={importing}>
            {importing ? "Uploading…" : "Upload to shared database"}
          </button>
        </div>
      )}
      <div className="lt-analyze">
        {/* ---- left: the list you tick ---- */}
        <div className="lt-card" style={{ marginTop: 14 }}>
          <div className="lt-card-t" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tests · {visible.length}</span>
            <button className="lt-linkbtn" onClick={toggleAll}>
              {allShown ? "clear all" : "select all"}
            </button>
          </div>

          {athletes.length > 1 && (
            <div className="lt-seg" style={{ marginBottom: 10 }}>
              <button
                className={`lt-seg-b ${athlete === "all" ? "on" : ""}`}
                onClick={() => setAthlete("all")}
              >
                Everyone
              </button>
              {athletes.map((a) => (
                <button
                  key={a}
                  className={`lt-seg-b ${athlete === a ? "on" : ""}`}
                  onClick={() => setAthlete(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          )}

          <div className="lt-list">
            {visible.map((s, i) => {
              const rows = deriveRows(s.rows ?? [], s.dist);
              const r = analyze(rows);
              const on = picked.has(String(s.id));
              const colour = SERIES[chosen.findIndex((c) => String(c.id) === String(s.id)) % SERIES.length];
              return (
                <div key={s.id} className={`lt-item ${on ? "on" : ""}`}>
                  <label className="lt-check">
                    <input type="checkbox" checked={on} onChange={() => toggle(s.id)} />
                    <span
                      className="lt-swatch"
                      style={{ background: on ? colour : "transparent", borderColor: on ? colour : C.rule }}
                    />
                  </label>
                  <div className="lt-item-main">
                    <div className="lt-item-t">{s.label || `Test ${s.date}`}</div>
                    <div className="lt-item-s lt-mono">
                      {s.date}
                      {s.athlete ? ` · ${s.athlete}` : ""} · {(s.rows ?? []).length} stages
                    </div>
                    {r?.hr4 && (
                      <div className="lt-item-th lt-mono">
                        4 mmol · {r.hr4} bpm{r.pace4 ? ` · ${r.pace4}/mi` : ""}
                      </div>
                    )}
                  </div>
                  <div className="lt-item-acts">
                    <Link className="lt-linkbtn" to={`/review/${s.id}`}>open</Link>
                    <button className="lt-linkbtn danger" onClick={() => remove(s)}>del</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lt-note" style={{ marginTop: 10, fontSize: 10 }}>
            {backend() === "supabase"
              ? "Saving to the shared database"
              : "Saving to this browser only"}
          </div>
          <div className="lt-foot" style={{ marginTop: 8 }}>
            <button className="lt-btn lt-btn-ghost" onClick={download}>Export all (JSON)</button>
            <button className="lt-btn lt-btn-primary" onClick={() => nav("/capture")} style={{ flex: 2 }}>
              New capture
            </button>
          </div>
        </div>

        {/* ---- right: the two lenses ---- */}
        <div className="lt-card" style={{ marginTop: 14 }}>
          <div className="lt-card-t" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{chosen.length ? `${chosen.length} selected` : "Nothing selected"}</span>
            <div className="lt-seg sm">
              <button className={`lt-seg-b ${lens === "overlay" ? "on" : ""}`} onClick={() => setLens("overlay")}>
                Overlay
              </button>
              <button className={`lt-seg-b ${lens === "trend" ? "on" : ""}`} onClick={() => setLens("trend")}>
                Trend
              </button>
            </div>
          </div>

          {!chosen.length ? (
            <div className="lt-note" style={{ padding: "60px 0", textAlign: "center" }}>
              Tick a test to plot it.
            </div>
          ) : lens === "overlay" ? (
            <Overlay sessions={chosen} xMode={xMode} setXMode={setXMode}
                     method={method} setMethod={setMethod}
                     lt1Method={lt1Method} setLt1Method={setLt1Method} />
          ) : (
            <Trend sessions={chosen} method={method} setMethod={setMethod}
                   lt1Method={lt1Method} setLt1Method={setLt1Method} />
          )}
        </div>
      </div>
    </>
  );
}

/* Curves on shared axes. Uncapped — the artifact could only ever
   compare the last three. */
function Overlay({ sessions, xMode, setXMode, method, setMethod, lt1Method, setLt1Method }) {
  const series = sessions.map((s) => ({
    id: String(s.id),
    name: s.label || s.date,
    points: deriveRows(s.rows ?? [], s.dist)
      .filter((r) => r.lactate != null && (xMode === "hr" ? r.hr != null : r.perMileSec != null))
      .map((r) => ({ x: xMode === "hr" ? r.hr : r.perMileSec / 60, y: r.lactate })),
    marks: thresholdMarks(s, method, xMode, lt1Method),
  }));

  return (
    <>
      <div className="lt-seg sm" style={{ marginBottom: 6 }}>
        <button className={`lt-seg-b ${xMode === "hr" ? "on" : ""}`} onClick={() => setXMode("hr")}>
          vs heart rate
        </button>
        <button className={`lt-seg-b ${xMode === "pace" ? "on" : ""}`} onClick={() => setXMode("pace")}>
          vs pace
        </button>
      </div>
      <MethodPicker method={method} setMethod={setMethod}
                    lt1Method={lt1Method} setLt1Method={setLt1Method} />
      <div className="lt-note" style={{ fontSize: 10, marginBottom: 6 }}>
        LT1 dotted ({LT1_METHODS[lt1Method].name}) · LT2 dashed ({METHODS[method].name}),
        coloured to match each test
      </div>
      <div style={{ height: 340 }}>
        <ResponsiveContainer>
          <LineChart margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
            <CartesianGrid stroke={C.rule} strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="x"
              domain={["dataMin - 2", "dataMax + 2"]}
              reversed={xMode === "pace"}
              tick={{ fill: C.muted, fontSize: 11 }}
              tickFormatter={(v) => (xMode === "hr" ? Math.round(v) : minToPace(v))}
            />
            <YAxis
              tick={{ fill: C.muted, fontSize: 11 }}
              label={{ value: "mmol/L", angle: -90, position: "insideLeft", fill: C.dim, fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: C.panel2, border: `1px solid ${C.rule}`, borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v) => (xMode === "hr" ? `${Math.round(v)} bpm` : `${minToPace(v)}/mi`)}
              formatter={(val, name) => [`${val} mmol/L`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: C.muted, paddingTop: 6 }}
                    verticalAlign="bottom" />
            {series.flatMap((s, i) => {
              const colour = SERIES[i % SERIES.length];
              const out = [];
              // thinner than the curves so they read as annotation
              if (s.marks.lt1 != null)
                out.push(
                  <ReferenceLine key={`${s.id}-lt1`} x={s.marks.lt1} stroke={colour}
                                 strokeWidth={1} strokeDasharray="1 4" strokeOpacity={0.9} />
                );
              if (s.marks.lt2 != null)
                out.push(
                  <ReferenceLine key={`${s.id}-lt2`} x={s.marks.lt2} stroke={colour}
                                 strokeWidth={1} strokeDasharray="7 4" strokeOpacity={0.9} />
                );
              return out;
            })}
            {series.map((s, i) => (
              <Line
                key={s.id}
                data={s.points}
                dataKey="y"
                name={s.name}
                stroke={SERIES[i % SERIES.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                type="monotone"
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* Thresholds over time — the view that needed a backend, and the
   reason any of this is worth keeping. */
function Trend({ sessions, method, setMethod, lt1Method, setLt1Method }) {
  const data = [...sessions]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((s) => {
      const r = analyze(deriveRows(s.rows ?? [], s.dist));
      /* Every method reads off the same raw stages, so switching here
         re-derives the whole history rather than looking anything up. */
      const th =
        method === "dmax" ? r?.dmax
        : method === "moddmax" ? r?.modDmax
        : r ? { hr: r.hr4, pace: r.pace4 } : null;
      return {
        date: s.date,
        label: s.label || s.date,
        hr4: th?.hr ?? null,
        hrLt1: lt1Method === "loglog" ? (r?.logLog?.hr ?? null) : (r?.lt1?.to?.hr ?? null),
        pace4: th?.pace ? paceToMin(th.pace) : null,
      };
    });

  const any = data.some((d) => d.hr4 != null || d.hrLt1 != null || d.pace4 != null);
  if (!any) {
    return (
      <div className="lt-note" style={{ padding: "60px 0", textAlign: "center" }}>
        Nothing to trend for this method yet. Fixed thresholds need three
        stages reaching 4 mmol/L; the Dmax methods need five or more with a
        clear rise.
      </div>
    );
  }

  return (
    <>
      <MethodPicker method={method} setMethod={setMethod}
                    lt1Method={lt1Method} setLt1Method={setLt1Method} />
      <div style={{ height: 282 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={C.rule} strokeDasharray="2 4" />
          <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} />
          <YAxis
            yAxisId="hr"
            domain={[(min) => Math.floor(min - 4), (max) => Math.ceil(max + 4)]}
            allowDecimals={false}
            tick={{ fill: C.muted, fontSize: 11 }}
            label={{ value: "bpm", angle: -90, position: "insideLeft", fill: C.dim, fontSize: 11 }}
          />
          <YAxis
            yAxisId="pace"
            orientation="right"
            reversed
            domain={[(min) => min - 0.25, (max) => max + 0.25]}
            tick={{ fill: C.muted, fontSize: 11 }}
            tickFormatter={minToPace}
            label={{ value: "min/mi", angle: 90, position: "insideRight", fill: C.dim, fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: C.panel2, border: `1px solid ${C.rule}`, borderRadius: 8, fontSize: 12 }}
            formatter={(v, n) => (String(n).startsWith("Pace") ? [`${minToPace(v)}/mi`, n] : [`${v} bpm`, n])}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
          <Line yAxisId="hr" dataKey="hrLt1" name={`HR at LT1 ${LT1_METHODS[lt1Method].name} (bpm)`} stroke={C.cool}
                strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          <Line yAxisId="hr" dataKey="hr4" name={`HR at ${METHODS[method].name} (bpm)`} stroke={C.hot}
                strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          <Line yAxisId="pace" dataKey="pace4" name={`Pace at ${METHODS[method].name} (min/mi)`} stroke={C.signal}
                strokeWidth={3} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </>
  );
}

/* One control for both charts, so the method never differs between the
   two views of the same selection. */
function MethodPicker({ method, setMethod, lt1Method, setLt1Method }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
      <div>
        <div className="lt-picker-l">LT1</div>
        <div className="lt-seg sm">
          {Object.entries(LT1_METHODS).map(([k, m]) => (
            <button key={k} className={`lt-seg-b ${lt1Method === k ? "on" : ""}`}
                    onClick={() => setLt1Method(k)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="lt-picker-l">LT2</div>
        <div className="lt-seg sm">
          {Object.entries(METHODS).map(([k, m]) => (
            <button key={k} className={`lt-seg-b ${method === k ? "on" : ""}`}
                    onClick={() => setMethod(k)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// "7:42" -> 7.7 decimal minutes, for plotting on a numeric axis
function paceToMin(s) {
  const [m, sec] = String(s).split(":").map(Number);
  return Number.isFinite(m) && Number.isFinite(sec) ? m + sec / 60 : null;
}
