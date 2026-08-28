import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ *
 *  Lactate Step Test — trackside recorder
 * ------------------------------------------------------------------ */

const C = {
  ground: "#11151B",
  panel: "#1A2029",
  panel2: "#212932",
  rule: "#2E3846",
  ink: "#E9EEF3",
  muted: "#7E8DA0",
  dim: "#55626F",
  signal: "#F2C14E",
  cool: "#4FB3C9",
  warm: "#E39A4B",
  hot: "#E2564A",
};

const STORE_KEY = "lactate:sessions";
const MILE_M = 1609.344;

const css = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

.lt-root {
  --ground:${C.ground}; --panel:${C.panel}; --panel2:${C.panel2};
  --rule:${C.rule}; --ink:${C.ink}; --muted:${C.muted}; --dim:${C.dim};
  --signal:${C.signal}; --cool:${C.cool}; --warm:${C.warm}; --hot:${C.hot};
  background:var(--ground); color:var(--ink); min-height:100%;
  font-family:'Archivo','Helvetica Neue',Arial,sans-serif;
  -webkit-font-smoothing:antialiased; padding:18px 14px 40px;
}
.lt-root *,.lt-root *::before,.lt-root *::after{box-sizing:border-box;}
.lt-wrap{max-width:760px;margin:0 auto;}
.lt-mono{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;}

.lt-eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);
  font-weight:600;font-family:'JetBrains Mono',monospace;}
.lt-h1{font-size:26px;font-weight:700;letter-spacing:-.02em;margin:4px 0 2px;line-height:1.1;}
.lt-sub{font-size:13px;color:var(--muted);line-height:1.5;}

.lt-card{background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:16px;margin-top:14px;}
.lt-card-t{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
  font-weight:600;margin-bottom:12px;font-family:'JetBrains Mono',monospace;}

.lt-grid{display:grid;gap:10px;}
.lt-g2{grid-template-columns:1fr 1fr;}
.lt-g3{grid-template-columns:repeat(3,1fr);}

.lt-field label{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--dim);font-weight:600;margin-bottom:5px;font-family:'JetBrains Mono',monospace;}
.lt-input{width:100%;background:var(--panel2);border:1px solid var(--rule);border-radius:7px;
  color:var(--ink);padding:11px 12px;font-size:16px;font-family:'JetBrains Mono',monospace;
  font-variant-numeric:tabular-nums;outline:none;transition:border-color .12s,box-shadow .12s;}
.lt-input:focus{border-color:var(--signal);box-shadow:0 0 0 3px rgba(242,193,78,.16);}
.lt-input::placeholder{color:#495663;}

.lt-big{font-size:30px;padding:16px 12px;text-align:center;font-weight:500;letter-spacing:.02em;}

.lt-btn{border:1px solid var(--rule);background:var(--panel2);color:var(--ink);border-radius:8px;
  padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;
  letter-spacing:.02em;transition:background .12s,border-color .12s;}
.lt-btn:hover{background:#28323d;}
.lt-btn:focus-visible{outline:2px solid var(--signal);outline-offset:2px;}
.lt-btn-primary{background:var(--signal);color:#171310;border-color:var(--signal);}
.lt-btn-primary:hover{background:#f7cf6c;}
.lt-btn-primary:disabled{opacity:.34;cursor:not-allowed;background:var(--signal);}
.lt-btn-lg{width:100%;padding:16px;font-size:15px;}
.lt-btn-ghost{background:transparent;color:var(--muted);}
.lt-btn-ghost:hover{background:var(--panel2);color:var(--ink);}

/* lane strip — the signature: stage progress drawn as track lanes,
   each completed lane's fill height encodes its lactate reading */
.lt-lanes{display:flex;gap:3px;align-items:flex-end;height:62px;margin:6px 0 2px;}
.lt-lane{flex:1;position:relative;background:var(--panel2);border-radius:3px;height:100%;
  overflow:hidden;cursor:pointer;border:1px solid transparent;transition:border-color .12s;}
.lt-lane:hover{border-color:var(--rule);}
.lt-lane.active{border-color:var(--signal);}
.lt-lane-fill{position:absolute;left:0;right:0;bottom:0;transition:height .4s ease;}
.lt-lane-num{position:absolute;top:3px;left:0;right:0;text-align:center;font-size:9px;
  font-family:'JetBrains Mono',monospace;color:var(--dim);font-weight:700;}
.lt-lane-val{position:absolute;bottom:3px;left:0;right:0;text-align:center;font-size:10px;
  font-family:'JetBrains Mono',monospace;font-weight:700;color:#151a20;}

.lt-timer{text-align:center;padding:22px 0 6px;}
.lt-timer-n{font-size:58px;font-weight:700;line-height:1;letter-spacing:-.02em;
  font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;}
.lt-timer-l{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);
  margin-top:8px;font-family:'JetBrains Mono',monospace;font-weight:600;}

.lt-row{display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;
  border-bottom:1px solid var(--rule);font-size:13px;}
.lt-row:last-child{border-bottom:none;}
.lt-row-k{color:var(--muted);font-size:12px;}
.lt-row-v{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;font-weight:500;}

.lt-table{width:100%;border-collapse:collapse;font-size:12px;
  font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums;}
.lt-table th{text-align:right;color:var(--dim);font-weight:600;font-size:9px;letter-spacing:.1em;
  text-transform:uppercase;padding:0 0 8px;border-bottom:1px solid var(--rule);}
.lt-table th:first-child,.lt-table td:first-child{text-align:left;}
.lt-table td{text-align:right;padding:8px 0;border-bottom:1px solid rgba(46,56,70,.5);}
.lt-table tr:last-child td{border-bottom:none;}

.lt-note{font-size:12px;color:var(--muted);line-height:1.6;}
.lt-flag{border-left:2px solid var(--signal);padding:2px 0 2px 11px;margin:11px 0;font-size:12.5px;line-height:1.55;}
.lt-flag b{color:var(--ink);font-weight:600;}
.lt-flag.cool{border-color:var(--cool);}
.lt-flag.hot{border-color:var(--hot);}

.lt-chips{display:flex;gap:6px;flex-wrap:wrap;}
.lt-chip{border:1px solid var(--rule);background:transparent;color:var(--muted);border-radius:999px;
  padding:6px 12px;font-size:11px;cursor:pointer;font-family:inherit;font-weight:600;}
.lt-chip.on{background:var(--signal);color:#171310;border-color:var(--signal);}
.lt-chip:focus-visible{outline:2px solid var(--signal);outline-offset:2px;}

.lt-open{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;
  background:transparent;border:none;border-bottom:1px solid var(--rule);color:var(--ink);
  padding:11px 6px;cursor:pointer;font-family:inherit;text-align:left;border-radius:5px;
  transition:background .12s;}
.lt-open:last-child{border-bottom:none;}
.lt-open:hover{background:var(--panel2);}
.lt-open:focus-visible{outline:2px solid var(--signal);outline-offset:-2px;}
.lt-open-l{font-size:13px;font-weight:500;}
.lt-open-s{font-size:10.5px;color:var(--dim);font-family:'JetBrains Mono',monospace;margin-top:3px;}
.lt-spark{display:flex;gap:2px;align-items:flex-end;height:22px;width:58px;flex-shrink:0;}
.lt-spark span{flex:1;border-radius:1px;min-height:2px;}
.lt-chev{color:var(--dim);font-size:16px;flex-shrink:0;}

.lt-foot{display:flex;gap:10px;margin-top:14px;}
.lt-foot > *{flex:1;}

@media (prefers-reduced-motion: reduce){.lt-root *{transition:none !important;animation:none !important;}}
@media (max-width:520px){ .lt-g3{grid-template-columns:1fr 1fr;} .lt-h1{font-size:22px;} }
`;

/* ---------------------------- helpers ---------------------------- */

const pad = (n) => String(n).padStart(2, "0");

// decimal minutes -> m:ss, guarding the 9.999 -> "9:60" rollover
function minToPace(v) {
  let m = Math.floor(v);
  let s = Math.round((v - m) * 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}:${pad(s)}`;
}

function paceFrom(sec, meters) {
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

const lactColor = (v) =>
  v == null ? C.dim : v < 2.0 ? C.cool : v < 3.0 ? C.signal : v < 4.5 ? C.warm : C.hot;

function interpAt(rows, target, key) {
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

function analyze(rows) {
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

/* ---------------------------- component ---------------------------- */

export default function LactateStepTest() {
  const [phase, setPhase] = useState("setup"); // setup | stage | rest | results
  const [hrMax, setHrMax] = useState(175);
  const [dist, setDist] = useState(2400);
  const [restLen, setRestLen] = useState(90);
  const [meta, setMeta] = useState({
    date: new Date().toISOString().slice(0, 10),
    label: "",
    temp: "",
    wind: "",
    notes: "",
  });

  const [stages, setStages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);

  const [saved, setSaved] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [compare, setCompare] = useState(false);
  const [xMode, setXMode] = useState("hr");
  const [viewing, setViewing] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");
  const beeped = useRef(false);

  /* ---- load saved sessions ---- */
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORE_KEY);
        setSaved(r ? JSON.parse(r.value) : []);
        setLoadState("ready");
      } catch {
        setSaved([]);
        setLoadState("ready");
      }
    })();
  }, []);

  /* ---- rest timer ---- */
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && left === 0 && !beeped.current) {
      beeped.current = true;
      setRunning(false);
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.18, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        o.start();
        o.stop(ctx.currentTime + 0.5);
      } catch {
        /* silent is fine */
      }
    }
  }, [left, running]);

  /* ---- derived ---- */
  const rows = useMemo(
    () =>
      stages.map((s, i) => {
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
      }),
    [stages, dist]
  );

  const result = useMemo(() => analyze(rows), [rows]);
  const cur = stages[idx];
  const curRow = rows[idx];
  const complete = (s) => s && s.hr !== "" && s.lact !== "" && (s.min !== "" || s.sec !== "");

  /* ---- actions ---- */
  function startTest() {
    const m = +hrMax || 175;
    const offsets = [48, 40, 32, 24, 16, 8];
    setStages(
      offsets.map((o) => ({ target: m - o, hr: "", min: "", sec: "", lact: "", note: "" }))
    );
    setIdx(0);
    setPhase("stage");
  }

  const setField = (k, v) =>
    setStages((p) => p.map((s, i) => (i === idx ? { ...s, [k]: v } : s)));

  function beginRest() {
    beeped.current = false;
    setLeft(restLen);
    setRunning(true);
    setPhase("rest");
  }

  function nextStage() {
    setRunning(false);
    if (idx + 1 < stages.length) {
      setIdx(idx + 1);
      setPhase("stage");
    } else setPhase("results");
  }

  function addStage() {
    setStages((p) => [
      ...p,
      { target: (p[p.length - 1]?.target ?? hrMax - 8) + 8, hr: "", min: "", sec: "", lact: "", note: "" },
    ]);
  }

  async function saveSession() {
    const session = {
      id: Date.now(),
      date: meta.date,
      label: meta.label || `Test ${meta.date}`,
      hrMax: +hrMax,
      dist: +dist,
      temp: meta.temp,
      wind: meta.wind,
      notes: meta.notes,
      rows: rows.filter((r) => r.lactate != null && r.hr != null),
    };
    const next = [...saved, session].slice(-12);
    setSaved(next);
    try {
      await window.storage.set(STORE_KEY, JSON.stringify(next));
      setSaveMsg("Saved to this device");
    } catch {
      setSaveMsg("Couldn't save — copy the CSV instead");
    }
    setTimeout(() => setSaveMsg(""), 3500);
  }

  async function deleteSession(id) {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    setViewing(null);
    setPhase("setup");
    try {
      await window.storage.set(STORE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function reopenForEditing(s) {
    setHrMax(s.hrMax);
    setDist(s.dist);
    setMeta({
      date: s.date,
      label: s.label,
      temp: s.temp || "",
      wind: s.wind || "",
      notes: s.notes || "",
    });
    setStages(
      s.rows.map((r) => ({
        target: r.target,
        hr: r.hr ?? "",
        min: r.sec ? Math.floor(r.sec / 60) : "",
        sec: r.sec ? r.sec % 60 : "",
        lact: r.lactate ?? "",
        note: r.note || "",
      }))
    );
    setIdx(0);
    setViewing(null);
    setPhase("results");
  }

  function csv() {
    const head = "stage,target_hr,avg_hr,pct_hrmax,time,pace_mile,pace_km,mph,m_per_s,lactate_mmol";
    const body = rows
      .map((r) =>
        [
          r.n,
          r.target,
          r.hr ?? "",
          r.hr ? Math.round((r.hr / hrMax) * 100) : "",
          r.sec ? `${Math.floor(r.sec / 60)}:${pad(r.sec % 60)}` : "",
          r.pace ?? "",
          r.km ?? "",
          r.mph ?? "",
          r.ms ?? "",
          r.lactate ?? "",
        ].join(",")
      )
      .join("\n");
    const text = `# ${meta.label || "Lactate step test"} ${meta.date}  HRmax ${hrMax}  ${dist}m stages  ${meta.temp}\n${head}\n${body}`;
    try {
      const b = new Blob([text], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `lactate-${meta.date}.csv`;
      a.click();
    } catch {
      /* ignore */
    }
  }

  const chartData = rows
    .filter((r) => r.lactate != null && (xMode === "hr" ? r.hr != null : r.perMileSec != null))
    .map((r) => ({
      x: xMode === "hr" ? r.hr : r.perMileSec / 60,
      lactate: r.lactate,
      ...Object.fromEntries(
        compare
          ? saved.slice(-3).map((s, i) => {
              const m = s.rows.find(
                (q) => Math.abs((xMode === "hr" ? q.hr : q.perMileSec / 60) - (xMode === "hr" ? r.hr : r.perMileSec / 60)) < (xMode === "hr" ? 3 : 0.15)
              );
              return [`s${i}`, m ? m.lactate : null];
            })
          : []
      ),
    }))
    .sort((a, b) => a.x - b.x);

  /* ---------------------------- render ---------------------------- */

  return (
    <div className="lt-root">
      <style>{css}</style>
      <div className="lt-wrap">
        <div className="lt-eyebrow">Graded exercise test · blood lactate</div>
        <h1 className="lt-h1">Step Test Recorder</h1>
        <p className="lt-sub">
          {phase === "setup"
            ? "Set it up before you leave the house. Enter one stage at a time on the track."
            : `${dist}m stages · HRmax ${hrMax} · ${meta.date}`}
        </p>

        {/* ---------------- SETUP ---------------- */}
        {phase === "setup" && (
          <>
            <div className="lt-card">
              <div className="lt-card-t">Session</div>
              <div className="lt-grid lt-g2">
                <div className="lt-field">
                  <label>Date</label>
                  <input
                    className="lt-input"
                    type="date"
                    value={meta.date}
                    onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                  />
                </div>
                <div className="lt-field">
                  <label>Label</label>
                  <input
                    className="lt-input"
                    placeholder="Baseline"
                    value={meta.label}
                    onChange={(e) => setMeta({ ...meta, label: e.target.value })}
                  />
                </div>
              </div>
              <div className="lt-grid lt-g2" style={{ marginTop: 10 }}>
                <div className="lt-field">
                  <label>Temp</label>
                  <input
                    className="lt-input"
                    placeholder="62°F"
                    value={meta.temp}
                    onChange={(e) => setMeta({ ...meta, temp: e.target.value })}
                  />
                </div>
                <div className="lt-field">
                  <label>Wind</label>
                  <input
                    className="lt-input"
                    placeholder="calm"
                    value={meta.wind}
                    onChange={(e) => setMeta({ ...meta, wind: e.target.value })}
                  />
                </div>
              </div>
              <p className="lt-note" style={{ marginTop: 12 }}>
                Record conditions every time. A curve compared across different weather is comparing
                the weather.
              </p>
            </div>

            <div className="lt-card">
              <div className="lt-card-t">Protocol</div>
              <div className="lt-grid lt-g3">
                <div className="lt-field">
                  <label>HRmax</label>
                  <input
                    className="lt-input"
                    type="number"
                    inputMode="numeric"
                    value={hrMax}
                    onChange={(e) => setHrMax(e.target.value)}
                  />
                </div>
                <div className="lt-field">
                  <label>Stage (m)</label>
                  <input
                    className="lt-input"
                    type="number"
                    inputMode="numeric"
                    value={dist}
                    onChange={(e) => setDist(e.target.value)}
                  />
                </div>
                <div className="lt-field">
                  <label>Rest (s)</label>
                  <input
                    className="lt-input"
                    type="number"
                    inputMode="numeric"
                    value={restLen}
                    onChange={(e) => setRestLen(+e.target.value)}
                  />
                </div>
              </div>
              <p className="lt-note" style={{ marginTop: 12 }}>
                Six stages will be built at HRmax −48 through −8, so{" "}
                <span className="lt-mono" style={{ color: C.ink }}>
                  {[48, 40, 32, 24, 16, 8].map((o) => (+hrMax || 175) - o).join(" · ")}
                </span>
                . Let HR climb over the first 600m of each stage, then hold it. Never start fast and
                slow down.
              </p>
            </div>

            <button className="lt-btn lt-btn-primary lt-btn-lg" onClick={startTest} style={{ marginTop: 14 }}>
              Start test
            </button>

            {loadState === "ready" && saved.length > 0 && (
              <div className="lt-card">
                <div className="lt-card-t">Saved tests · {saved.length}</div>
                {saved
                  .slice()
                  .reverse()
                  .map((s) => {
                    const peak = Math.max(...s.rows.map((r) => r.lactate || 0));
                    return (
                      <button
                        className="lt-open"
                        key={s.id}
                        onClick={() => {
                          setViewing(s);
                          setPhase("review");
                        }}
                      >
                        <span>
                          <span className="lt-open-l">{s.label}</span>
                          <span className="lt-open-s" style={{ display: "block" }}>
                            {s.date} · {s.rows.length} stages · peak {peak.toFixed(1)} mmol
                          </span>
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="lt-spark">
                            {s.rows.map((r, i) => (
                              <span
                                key={i}
                                style={{
                                  height: `${Math.max(8, Math.min(100, ((r.lactate || 0) / 8) * 100))}%`,
                                  background: lactColor(r.lactate),
                                }}
                              />
                            ))}
                          </span>
                          <span className="lt-chev">›</span>
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {/* ---------------- LANE STRIP ---------------- */}
        {(phase === "stage" || phase === "rest") && (
          <div style={{ marginTop: 18 }}>
            <div className="lt-eyebrow" style={{ marginBottom: 6 }}>
              Stage {idx + 1} of {stages.length}
            </div>
            <div className="lt-lanes">
              {stages.map((s, i) => {
                const v = s.lact === "" ? null : +s.lact;
                const h = v == null ? 0 : Math.min(100, (v / 8) * 100);
                return (
                  <button
                    key={i}
                    className={`lt-lane${i === idx ? " active" : ""}`}
                    onClick={() => {
                      setIdx(i);
                      setPhase("stage");
                    }}
                    aria-label={`Go to stage ${i + 1}`}
                  >
                    <span className="lt-lane-num">{s.target}</span>
                    <span
                      className="lt-lane-fill"
                      style={{ height: `${h}%`, background: lactColor(v) }}
                    />
                    {v != null && <span className="lt-lane-val">{v.toFixed(1)}</span>}
                  </button>
                );
              })}
            </div>
            <div className="lt-note" style={{ fontSize: 10.5, letterSpacing: ".08em" }}>
              Lane height = mmol/L. Your curve draws itself as you go.
            </div>
          </div>
        )}

        {/* ---------------- STAGE ENTRY ---------------- */}
        {phase === "stage" && cur && (
          <>
            <div className="lt-card">
              <div className="lt-card-t">Target heart rate</div>
              <div
                className="lt-mono"
                style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, color: C.signal }}
              >
                {cur.target}
                <span style={{ fontSize: 15, color: C.dim, marginLeft: 8 }}>
                  {Math.round((cur.target / (+hrMax || 175)) * 100)}% max
                </span>
              </div>
            </div>

            <div className="lt-card">
              <div className="lt-card-t">Stage {idx + 1} readings</div>

              <div className="lt-field" style={{ marginBottom: 12 }}>
                <label>Time for {dist}m</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="lt-input lt-big"
                    type="number"
                    inputMode="numeric"
                    placeholder="9"
                    value={cur.min}
                    onChange={(e) => setField("min", e.target.value)}
                  />
                  <span className="lt-mono" style={{ fontSize: 26, color: C.dim }}>
                    :
                  </span>
                  <input
                    className="lt-input lt-big"
                    type="number"
                    inputMode="numeric"
                    placeholder="42"
                    value={cur.sec}
                    onChange={(e) => setField("sec", e.target.value)}
                  />
                </div>
              </div>

              <div className="lt-grid lt-g2">
                <div className="lt-field">
                  <label>Avg HR</label>
                  <input
                    className="lt-input lt-big"
                    type="number"
                    inputMode="numeric"
                    placeholder={String(cur.target)}
                    value={cur.hr}
                    onChange={(e) => setField("hr", e.target.value)}
                  />
                </div>
                <div className="lt-field">
                  <label>Lactate mmol/L</label>
                  <input
                    className="lt-input lt-big"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    placeholder="1.4"
                    value={cur.lact}
                    onChange={(e) => setField("lact", e.target.value)}
                    style={{ color: cur.lact === "" ? C.ink : lactColor(+cur.lact) }}
                  />
                </div>
              </div>

              {curRow?.pace && (
                <div style={{ marginTop: 12 }}>
                  <div className="lt-row">
                    <span className="lt-row-k">Pace</span>
                    <span className="lt-row-v" style={{ color: C.signal }}>
                      {curRow.pace}/mi · {curRow.km}/km · {curRow.mph} mph
                    </span>
                  </div>
                  {curRow.hr && (
                    <div className="lt-row">
                      <span className="lt-row-k">Actual intensity</span>
                      <span className="lt-row-v">
                        {Math.round((curRow.hr / (+hrMax || 175)) * 100)}% HRmax
                        {curRow.hr - curRow.target > 3 && (
                          <span style={{ color: C.hot }}> · ran {curRow.hr - curRow.target} over</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="lt-field" style={{ marginTop: 12 }}>
                <label>How did it feel</label>
                <input
                  className="lt-input"
                  style={{ fontSize: 14 }}
                  placeholder="easy / working / couldn't hold it"
                  value={cur.note}
                  onChange={(e) => setField("note", e.target.value)}
                />
              </div>
            </div>

            <div className="lt-foot">
              {idx > 0 && (
                <button className="lt-btn lt-btn-ghost" onClick={() => setIdx(idx - 1)}>
                  Back
                </button>
              )}
              <button
                className="lt-btn lt-btn-primary"
                disabled={!complete(cur)}
                onClick={idx + 1 < stages.length ? beginRest : () => setPhase("results")}
                style={{ flex: 2 }}
              >
                {idx + 1 < stages.length ? `Start ${restLen}s rest` : "See results"}
              </button>
            </div>

            {idx + 1 === stages.length && (
              <button className="lt-btn lt-btn-ghost lt-btn-lg" onClick={addStage} style={{ marginTop: 10 }}>
                Add another stage
              </button>
            )}
          </>
        )}

        {/* ---------------- REST ---------------- */}
        {phase === "rest" && (
          <div className="lt-card">
            <div className="lt-timer">
              <div
                className="lt-timer-n"
                style={{ color: left === 0 ? C.signal : left <= 15 ? C.warm : C.ink }}
              >
                {Math.floor(left / 60)}:{pad(left % 60)}
              </div>
              <div className="lt-timer-l">
                {left === 0 ? "Go — next stage" : "Draw blood · wipe first drop"}
              </div>
            </div>

            <div className="lt-note" style={{ textAlign: "center", margin: "14px 0 4px" }}>
              Next target{" "}
              <span className="lt-mono" style={{ color: C.signal, fontWeight: 700 }}>
                {stages[idx + 1]?.target}
              </span>{" "}
              bpm
            </div>

            <div className="lt-foot">
              <button className="lt-btn lt-btn-ghost" onClick={() => setRunning(!running)}>
                {running ? "Pause" : "Resume"}
              </button>
              <button className="lt-btn lt-btn-primary" onClick={nextStage} style={{ flex: 2 }}>
                Next stage
              </button>
            </div>
          </div>
        )}

        {/* ---------------- RESULTS ---------------- */}
        {phase === "results" && (
          <>
            <div className="lt-card">
              <div className="lt-card-t">Lactate curve</div>
              <div className="lt-chips" style={{ marginBottom: 12 }}>
                <button className={`lt-chip${xMode === "hr" ? " on" : ""}`} onClick={() => setXMode("hr")}>
                  vs heart rate
                </button>
                <button className={`lt-chip${xMode === "pace" ? " on" : ""}`} onClick={() => setXMode("pace")}>
                  vs pace
                </button>
                {saved.length > 0 && (
                  <button className={`lt-chip${compare ? " on" : ""}`} onClick={() => setCompare(!compare)}>
                    overlay past tests
                  </button>
                )}
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 6, right: 10, bottom: 22, left: -14 }}>
                    <CartesianGrid stroke={C.rule} strokeDasharray="2 4" vertical={false} />
                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={["dataMin - 2", "dataMax + 2"]}
                      reversed={xMode === "pace"}
                      tick={{ fill: C.muted, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                      stroke={C.rule}
                      tickFormatter={(v) => (xMode === "hr" ? v : minToPace(v))}
                      label={{
                        value: xMode === "hr" ? "heart rate" : "min/mile",
                        position: "insideBottom",
                        offset: -12,
                        fill: C.dim,
                        fontSize: 10,
                      }}
                    />
                    <YAxis
                      tick={{ fill: C.muted, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                      stroke={C.rule}
                      domain={[0, "dataMax + 1"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: C.panel2,
                        border: `1px solid ${C.rule}`,
                        borderRadius: 8,
                        fontSize: 12,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                      labelStyle={{ color: C.muted, marginBottom: 4 }}
                      separator=": "
                      labelFormatter={(v) =>
                        xMode === "hr" ? `HR: ${v} bpm` : `Pace: ${minToPace(v)}/mi`
                      }
                      formatter={(val, name) => {
                        if (val == null) return null;
                        const m = /^s(\d+)$/.exec(name);
                        const label = m
                          ? saved.slice(-3)[+m[1]]?.label || "Previous"
                          : "Lactate";
                        return [`${Number(val).toFixed(2)} mmol/L`, label];
                      }}
                    />
                    <ReferenceLine y={2} stroke={C.cool} strokeDasharray="3 3" />
                    <ReferenceLine y={4} stroke={C.hot} strokeDasharray="3 3" />
                    {compare &&
                      saved.slice(-3).map((s, i) => (
                        <Line
                          key={s.id}
                          type="monotone"
                          dataKey={`s${i}`}
                          stroke={C.dim}
                          strokeWidth={1.5}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    <Line
                      type="monotone"
                      dataKey="lactate"
                      stroke={C.signal}
                      strokeWidth={2.5}
                      dot={{ fill: C.signal, r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {result ? (
              <div className="lt-card">
                <div className="lt-card-t">What the curve says</div>
                <div className="lt-flag cool">
                  <b>Baseline {result.base.toFixed(1)} mmol.</b> Everything at or below this stays flat
                  — that's your easy-run ceiling.
                </div>
                {result.lt1 && (
                  <div className="lt-flag">
                    <b>
                      First rise between {result.lt1.from.hr} and {result.lt1.to.hr} bpm
                    </b>{" "}
                    ({result.lt1.from.pace} → {result.lt1.to.pace} /mi). This is the turn Hadd wants you
                    training at and below.
                  </div>
                )}
                {result.hr4 && (
                  <div className="lt-flag hot">
                    <b>4 mmol at ~{result.hr4} bpm</b>
                    {result.pace4 && ` · ${result.pace4}/mi`}. Above here you're borrowing.
                  </div>
                )}
                <p className="lt-note" style={{ marginTop: 12 }}>
                  These are estimates off a step test. Confirm the one you'll train at with a 20-minute
                  steady-state run — flat between the 10 and 20 minute samples means it's real.
                </p>
              </div>
            ) : (
              <div className="lt-card">
                <div className="lt-card-t">Not enough stages</div>
                <p className="lt-note">Three stages with HR and lactate will draw a curve worth reading.</p>
              </div>
            )}

            <div className="lt-card">
              <div className="lt-card-t">Stage data</div>
              <div style={{ overflowX: "auto" }}>
                <table className="lt-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tgt</th>
                      <th>HR</th>
                      <th>%max</th>
                      <th>Time</th>
                      <th>/mi</th>
                      <th>/km</th>
                      <th>mph</th>
                      <th>mmol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.n}>
                        <td style={{ color: C.dim }}>{r.n}</td>
                        <td style={{ color: C.dim }}>{r.target}</td>
                        <td>{r.hr ?? "—"}</td>
                        <td style={{ color: C.muted }}>
                          {r.hr ? Math.round((r.hr / (+hrMax || 175)) * 100) : "—"}
                        </td>
                        <td>{r.sec ? `${Math.floor(r.sec / 60)}:${pad(r.sec % 60)}` : "—"}</td>
                        <td>{r.pace ?? "—"}</td>
                        <td>{r.km ?? "—"}</td>
                        <td style={{ color: C.cool }}>{r.mph ?? "—"}</td>
                        <td style={{ color: lactColor(r.lactate), fontWeight: 700 }}>
                          {r.lactate?.toFixed(1) ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lt-card">
              <div className="lt-card-t">Notes</div>
              <textarea
                className="lt-input"
                rows={3}
                style={{ fontSize: 14, resize: "vertical", fontFamily: "inherit" }}
                placeholder="Sleep, fuelling, how the last stage felt, anything odd about the day."
                value={meta.notes}
                onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
              />
            </div>

            <div className="lt-foot">
              <button className="lt-btn" onClick={csv}>
                Download CSV
              </button>
              <button className="lt-btn lt-btn-primary" onClick={saveSession}>
                Save test
              </button>
            </div>
            {saveMsg && (
              <p className="lt-note" style={{ textAlign: "center", marginTop: 10, color: C.signal }}>
                {saveMsg}
              </p>
            )}
            <button
              className="lt-btn lt-btn-ghost lt-btn-lg"
              style={{ marginTop: 10 }}
              onClick={() => setPhase("stage")}
            >
              Back to stages
            </button>
          </>
        )}
        {/* ---------------- REVIEW A SAVED TEST ---------------- */}
        {phase === "review" && viewing && (
          <SavedTestView
            session={viewing}
            xMode={xMode}
            setXMode={setXMode}
            onBack={() => {
              setViewing(null);
              setPhase("setup");
            }}
            onEdit={() => reopenForEditing(viewing)}
            onDelete={() => deleteSession(viewing.id)}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------- saved test, read-only view ------------------- */

function SavedTestView({ session, xMode, setXMode, onBack, onEdit, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const res = useMemo(() => analyze(session.rows), [session]);

  const data = session.rows
    .filter((r) => r.lactate != null)
    .map((r) => ({ x: xMode === "hr" ? r.hr : r.perMileSec / 60, lactate: r.lactate }))
    .sort((a, b) => a.x - b.x);

  return (
    <>
      <button className="lt-btn lt-btn-ghost" onClick={onBack} style={{ marginTop: 14 }}>
        ‹ All tests
      </button>

      <div className="lt-card">
        <div className="lt-card-t">{session.label}</div>
        <div className="lt-row">
          <span className="lt-row-k">Date</span>
          <span className="lt-row-v">{session.date}</span>
        </div>
        <div className="lt-row">
          <span className="lt-row-k">Protocol</span>
          <span className="lt-row-v">
            {session.dist}m · HRmax {session.hrMax}
          </span>
        </div>
        {(session.temp || session.wind) && (
          <div className="lt-row">
            <span className="lt-row-k">Conditions</span>
            <span className="lt-row-v">{[session.temp, session.wind].filter(Boolean).join(" · ")}</span>
          </div>
        )}
      </div>

      <div className="lt-card">
        <div className="lt-card-t">Lactate curve</div>
        <div className="lt-chips" style={{ marginBottom: 12 }}>
          <button className={`lt-chip${xMode === "hr" ? " on" : ""}`} onClick={() => setXMode("hr")}>
            vs heart rate
          </button>
          <button className={`lt-chip${xMode === "pace" ? " on" : ""}`} onClick={() => setXMode("pace")}>
            vs pace
          </button>
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 10, bottom: 22, left: -14 }}>
              <CartesianGrid stroke={C.rule} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={["dataMin - 2", "dataMax + 2"]}
                reversed={xMode === "pace"}
                tick={{ fill: C.muted, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                stroke={C.rule}
                tickFormatter={(v) => (xMode === "hr" ? v : minToPace(v))}
                label={{
                  value: xMode === "hr" ? "heart rate" : "min/mile",
                  position: "insideBottom",
                  offset: -12,
                  fill: C.dim,
                  fontSize: 10,
                }}
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                stroke={C.rule}
                domain={[0, "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{
                  background: C.panel2,
                  border: `1px solid ${C.rule}`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                labelStyle={{ color: C.muted, marginBottom: 4 }}
                separator=": "
                labelFormatter={(v) =>
                  xMode === "hr" ? `HR: ${v} bpm` : `Pace: ${minToPace(v)}/mi`
                }
                formatter={(val) => [`${Number(val).toFixed(2)} mmol/L`, "Lactate"]}
              />
              <ReferenceLine y={2} stroke={C.cool} strokeDasharray="3 3" />
              <ReferenceLine y={4} stroke={C.hot} strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="lactate"
                stroke={C.signal}
                strokeWidth={2.5}
                dot={{ fill: C.signal, r: 4 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {res && (
        <div className="lt-card">
          <div className="lt-card-t">What the curve said</div>
          <div className="lt-flag cool">
            <b>Baseline {res.base.toFixed(1)} mmol.</b>
          </div>
          {res.lt1 && (
            <div className="lt-flag">
              <b>
                First rise between {res.lt1.from.hr} and {res.lt1.to.hr} bpm
              </b>{" "}
              ({res.lt1.from.pace} → {res.lt1.to.pace} /mi).
            </div>
          )}
          {res.hr4 && (
            <div className="lt-flag hot">
              <b>4 mmol at ~{res.hr4} bpm</b>
              {res.pace4 && ` · ${res.pace4}/mi`}.
            </div>
          )}
        </div>
      )}

      <div className="lt-card">
        <div className="lt-card-t">Stage data</div>
        <div style={{ overflowX: "auto" }}>
          <table className="lt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tgt</th>
                <th>HR</th>
                <th>%max</th>
                <th>Time</th>
                <th>/mi</th>
                <th>/km</th>
                <th>mph</th>
                <th>mmol</th>
              </tr>
            </thead>
            <tbody>
              {session.rows.map((r) => (
                <tr key={r.n}>
                  <td style={{ color: C.dim }}>{r.n}</td>
                  <td style={{ color: C.dim }}>{r.target}</td>
                  <td>{r.hr ?? "—"}</td>
                  <td style={{ color: C.muted }}>
                    {r.hr ? Math.round((r.hr / session.hrMax) * 100) : "—"}
                  </td>
                  <td>{r.sec ? `${Math.floor(r.sec / 60)}:${pad(r.sec % 60)}` : "—"}</td>
                  <td>{r.pace ?? "—"}</td>
                  <td>{r.km ?? "—"}</td>
                  <td style={{ color: C.cool }}>
                    {r.mph ?? (r.ms ? (+r.ms * 2.2369363).toFixed(1) : "—")}
                  </td>
                  <td style={{ color: lactColor(r.lactate), fontWeight: 700 }}>
                    {r.lactate?.toFixed(1) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {session.rows.some((r) => r.note) && (
          <div style={{ marginTop: 14 }}>
            {session.rows
              .filter((r) => r.note)
              .map((r) => (
                <div className="lt-row" key={r.n}>
                  <span className="lt-row-k">Stage {r.n}</span>
                  <span className="lt-row-v" style={{ color: C.muted, fontWeight: 400 }}>
                    {r.note}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {session.notes && (
        <div className="lt-card">
          <div className="lt-card-t">Notes</div>
          <p className="lt-note">{session.notes}</p>
        </div>
      )}

      <div className="lt-foot">
        <button className="lt-btn" onClick={onEdit}>
          Reopen and edit
        </button>
        <button
          className="lt-btn lt-btn-ghost"
          style={confirmDel ? { color: C.hot, borderColor: C.hot } : undefined}
          onClick={() => (confirmDel ? onDelete() : setConfirmDel(true))}
        >
          {confirmDel ? "Tap again to delete" : "Delete"}
        </button>
      </div>
    </>
  );
}
