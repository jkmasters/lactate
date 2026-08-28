import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { saveSession, saveDraft, getDraft, clearDraft } from "../lib/storage.js";
import { analyze, deriveRows, pad } from "../lib/lactate.js";
import { C, lactColor } from "../theme.js";

const OFFSETS = [48, 40, 32, 24, 16, 8]; // target HR = hrMax - offset

const blank = (target) => ({ target, hr: "", min: "", sec: "", lact: "", note: "" });

/* Capture — laptop layout, driven by whoever is administering the test.
   Entry on the left, the curve building on the right, because "do we
   need another stage?" is a decision made mid-test and you cannot make
   it without seeing the curve. */
export default function Capture() {
  const nav = useNavigate();

  const [phase, setPhase] = useState("setup"); // setup | stage | rest | done
  const [athlete, setAthlete] = useState("");
  const [hrMax, setHrMax] = useState(175);
  const [dist, setDist] = useState(2400);
  const [restLen, setRestLen] = useState(90);
  const [meta, setMeta] = useState({
    date: new Date().toISOString().slice(0, 10),
    label: "", temp: "", wind: "", notes: "",
  });

  const [stages, setStages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const beeped = useRef(false);
  const firstField = useRef(null);

  /* ---- restore an interrupted test ----
     The artifact held everything in memory until save, so a refresh at
     stage 4 lost the whole test. Trackside that is a real failure.

     Offered as a banner rather than a confirm() — this runs on every
     visit to the page, and a modal that blocks the whole tab is the
     wrong thing to put in front of someone mid-session. ---- */
  useEffect(() => {
    getDraft().then((d) => {
      if (d && d.stages?.length) setPendingDraft(d);
    });
  }, []);

  function resumeDraft() {
    const d = pendingDraft;
    if (!d) return;
    setAthlete(d.athlete ?? ""); setHrMax(d.hrMax); setDist(d.dist);
    setRestLen(d.restLen ?? 90); setMeta(d.meta); setStages(d.stages);
    setIdx(d.idx ?? 0); setPhase(d.phase === "rest" ? "stage" : d.phase ?? "stage");
    setPendingDraft(null);
    setResumed(true);
  }

  async function discardDraft() {
    await clearDraft();
    setPendingDraft(null);
  }

  /* ---- autosave every change once underway ---- */
  useEffect(() => {
    if (phase === "setup" || phase === "done") return;
    saveDraft({ athlete, hrMax, dist, restLen, meta, stages, idx, phase });
  }, [athlete, hrMax, dist, restLen, meta, stages, idx, phase]);

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
        const a = new AudioContext();
        const o = a.createOscillator(), g = a.createGain();
        o.connect(g); g.connect(a.destination);
        o.frequency.value = 880; g.gain.value = 0.15;
        o.start(); setTimeout(() => { o.stop(); a.close(); }, 400);
      } catch { /* no audio, no problem */ }
    }
  }, [left, running]);

  // focus the first input whenever a new stage opens — keyboard-first
  useEffect(() => {
    if (phase === "stage") firstField.current?.focus();
  }, [phase, idx]);

  const rows = useMemo(() => deriveRows(stages, dist), [stages, dist]);
  const result = useMemo(() => analyze(rows), [rows]);
  const cur = stages[idx];
  const curRow = rows[idx];
  const logged = rows.filter((r) => r.lactate != null && r.hr != null);
  const canLog = cur && cur.hr !== "" && cur.lact !== "" && (cur.min !== "" || cur.sec !== "");

  function setField(k, v) {
    setStages((p) => p.map((s, i) => (i === idx ? { ...s, [k]: v } : s)));
  }

  function startTest() {
    const m = +hrMax || 175;
    setStages(OFFSETS.map((o) => blank(m - o)));
    setIdx(0);
    setPhase("stage");
  }

  /* Log the current stage. Last stage -> results; otherwise start rest. */
  function logStage() {
    if (!canLog) return;
    if (idx + 1 < stages.length) {
      beeped.current = false;
      setLeft(restLen);
      setRunning(true);
      setPhase("rest");
    } else {
      setPhase("done");
    }
  }

  function nextStage() {
    setRunning(false);
    if (idx + 1 < stages.length) {
      setIdx(idx + 1);
      setPhase("stage");
    } else setPhase("done");
  }

  /* Add a stage mid-test — you have seen the curve and decided you have
     not bracketed the threshold yet. The "of N" label follows along. */
  function addStage() {
    setStages((p) => [...p, blank((p[p.length - 1]?.target ?? +hrMax - 8) + 8)]);
  }

  function removeLastStage() {
    if (stages.length <= 1 || idx >= stages.length - 1) return;
    setStages((p) => p.slice(0, -1));
  }

  async function finish() {
    const session = {
      id: Date.now(),
      athlete: athlete.trim() || null,
      date: meta.date,
      label: meta.label || `Test ${meta.date}`,
      hrMax: +hrMax,
      dist: +dist,
      temp: meta.temp, wind: meta.wind, notes: meta.notes,
      // store raw stage input only — paces are derived from sec + dist
      rows: stages
        .filter((s) => s.hr !== "" && s.lact !== "" && (s.min !== "" || s.sec !== ""))
        .map((s, i) => ({
          n: i + 1, target: s.target, note: s.note || "",
          hr: +s.hr, lact: s.lact, min: s.min, sec: s.sec,
        })),
    };
    await saveSession(session);
    await clearDraft();
    nav(`/review/${session.id}`);
  }

  /* ---------------------------- setup ---------------------------- */
  if (phase === "setup") {
    return (
      <div className="lt-card" style={{ marginTop: 14, maxWidth: 560 }}>
        {pendingDraft && (
          <div className="lt-resume">
            <div>
              <div className="lt-resume-t">Test in progress</div>
              <div className="lt-resume-s lt-mono">
                {pendingDraft.meta?.date}
                {pendingDraft.athlete ? ` · ${pendingDraft.athlete}` : ""} ·{" "}
                {pendingDraft.stages.filter((x) => x.hr !== "" && x.lact !== "").length} of{" "}
                {pendingDraft.stages.length} stages logged
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="lt-btn lt-btn-ghost" onClick={discardDraft}>Discard</button>
              <button className="lt-btn lt-btn-primary" onClick={resumeDraft}>Resume</button>
            </div>
          </div>
        )}
        <div className="lt-eyebrow">New capture</div>
        <div className="lt-h1">Set up the test</div>
        <div className="lt-sub" style={{ marginBottom: 16 }}>
          Six stages by default, each {dist} m, targets stepping up to HRmax.
          You can add more once you see the curve.
        </div>

        <div className="lt-grid lt-g2">
          <Field label="Athlete">
            <input className="lt-input" value={athlete} placeholder="who is running"
                   onChange={(e) => setAthlete(e.target.value)} />
          </Field>
          <Field label="Date">
            <input className="lt-input lt-mono" type="date" value={meta.date}
                   onChange={(e) => setMeta({ ...meta, date: e.target.value })} />
          </Field>
          <Field label="Max HR (bpm)">
            <input className="lt-input lt-mono" type="number" value={hrMax}
                   onChange={(e) => setHrMax(e.target.value)} />
          </Field>
          <Field label="Stage distance (m)">
            <input className="lt-input lt-mono" type="number" value={dist}
                   onChange={(e) => setDist(e.target.value)} />
          </Field>
          <Field label="Rest between stages (s)">
            <input className="lt-input lt-mono" type="number" value={restLen}
                   onChange={(e) => setRestLen(e.target.value)} />
          </Field>
          <Field label="Label">
            <input className="lt-input" value={meta.label} placeholder="optional"
                   onChange={(e) => setMeta({ ...meta, label: e.target.value })} />
          </Field>
          <Field label="Conditions">
            <input className="lt-input" value={meta.temp} placeholder="12°C, dry"
                   onChange={(e) => setMeta({ ...meta, temp: e.target.value })} />
          </Field>
          <Field label="Wind">
            <input className="lt-input" value={meta.wind} placeholder="light SW"
                   onChange={(e) => setMeta({ ...meta, wind: e.target.value })} />
          </Field>
        </div>

        <div className="lt-foot" style={{ marginTop: 16 }}>
          <button className="lt-btn lt-btn-ghost" onClick={() => nav("/")}>Cancel</button>
          <button className="lt-btn lt-btn-primary" onClick={startTest} style={{ flex: 2 }}>
            Start test
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------ capture / rest ------------------------ */
  return (
    <div className="lt-capture">
      {/* ---- left: what the administrator does next ---- */}
      <div>
        {resumed && (
          <div className="lt-card lt-note" style={{ marginTop: 14, borderColor: C.signal }}>
            Resumed an interrupted test.
          </div>
        )}

        {phase === "stage" && cur && (
          <div className="lt-card" style={{ marginTop: 14 }}>
            <div className="lt-eyebrow">
              Stage {idx + 1} of {stages.length}
            </div>
            <div className="lt-h1">Enter stage {idx + 1}</div>
            <div className="lt-sub" style={{ marginBottom: 14 }}>
              Target <b className="lt-mono" style={{ color: C.signal }}>{cur.target}</b> bpm ·
              {" "}{dist} m
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); logStage(); }}
              onKeyDown={(e) => {
                // Enter logs the stage, but only from a field — otherwise it
                // would also fire while a button like "End test" has focus.
                if (e.key === "Enter" && e.target.tagName === "INPUT") {
                  e.preventDefault();
                  logStage();
                }
              }}
            >
              <div className="lt-grid lt-g2">
                <Field label="Time — minutes">
                  <input ref={firstField} className="lt-input lt-mono lt-big" type="number"
                         inputMode="numeric" value={cur.min} placeholder="9"
                         onChange={(e) => setField("min", e.target.value)} />
                </Field>
                <Field label="Time — seconds">
                  <input className="lt-input lt-mono lt-big" type="number" inputMode="numeric"
                         value={cur.sec} placeholder="04"
                         onChange={(e) => setField("sec", e.target.value)} />
                </Field>
                <Field label="Average HR (bpm)">
                  <input className="lt-input lt-mono lt-big" type="number" inputMode="numeric"
                         value={cur.hr} placeholder={String(cur.target)}
                         onChange={(e) => setField("hr", e.target.value)} />
                </Field>
                <Field label="Lactate (mmol/L)">
                  <input className="lt-input lt-mono lt-big" type="number" step="0.1" inputMode="decimal"
                         value={cur.lact} placeholder="2.4"
                         onChange={(e) => setField("lact", e.target.value)} />
                </Field>
              </div>

              <Field label="Note (optional)">
                <input className="lt-input" value={cur.note} placeholder="felt easy, wind on back straight"
                       onChange={(e) => setField("note", e.target.value)} />
              </Field>

              {curRow?.pace && (
                <div className="lt-note" style={{ marginTop: 8 }}>
                  That is <b className="lt-mono">{curRow.pace}</b>/mi ·{" "}
                  <b className="lt-mono">{curRow.km}</b>/km
                  {cur.hr ? ` · ${Math.round((+cur.hr / +hrMax) * 100)}% of max` : ""}
                </div>
              )}

              <div className="lt-foot" style={{ marginTop: 16 }}>
                <button type="button" className="lt-btn lt-btn-ghost" onClick={() => setPhase("done")}>
                  End test
                </button>
                <button type="submit" className="lt-btn lt-btn-primary" disabled={!canLog} style={{ flex: 2 }}>
                  {idx + 1 < stages.length ? "Log stage → rest" : "Log stage → results"}
                </button>
              </div>
              <div className="lt-note" style={{ marginTop: 8, fontSize: 11 }}>
                Tab between fields, Enter to log.
              </div>
            </form>
          </div>
        )}

        {phase === "rest" && (
          <div className="lt-card" style={{ marginTop: 14 }}>
            <div className="lt-eyebrow">Rest · stage {idx + 2} next</div>
            <div className="lt-timer">
              <div className="lt-timer-n"
                   style={{ color: left === 0 ? C.signal : left <= 15 ? C.warm : C.ink }}>
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
                {left === 0 ? "Next stage" : "Skip rest → next stage"}
              </button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="lt-card" style={{ marginTop: 14 }}>
            <div className="lt-eyebrow">Test complete</div>
            <div className="lt-h1">{logged.length} stages recorded</div>
            {result ? (
              <div className="lt-grid lt-g3" style={{ marginTop: 14 }}>
                <Stat label="LT1 (base +0.4)"
                      value={result.lt1 ? `${result.lt1.to.hr} bpm` : "—"} />
                <Stat label="HR at base +1.0"
                      value={result.hrBase1 ? `${result.hrBase1} bpm` : "—"} />
                <Stat label="OBLA 4.0"
                      value={result.hr4 ? `${result.hr4} bpm` : "—"}
                      sub={result.pace4 ? `${result.pace4}/mi` : "not reached"} />
              </div>
            ) : (
              <div className="lt-note" style={{ marginTop: 10 }}>
                Fewer than three complete stages — nothing to analyse, but you
                can still save the raw data.
              </div>
            )}
            <Field label="Notes">
              <input className="lt-input" value={meta.notes} placeholder="how it went"
                     onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
            </Field>
            <div className="lt-foot" style={{ marginTop: 16 }}>
              <button className="lt-btn lt-btn-ghost" onClick={() => setPhase("stage")}>
                Back to stages
              </button>
              <button className="lt-btn lt-btn-primary" onClick={finish} style={{ flex: 2 }}>
                Save test
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- right: the curve as it builds, and what is logged ---- */}
      <div className="lt-card" style={{ marginTop: 14 }}>
        <div className="lt-card-t" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Curve so far</span>
          <button className="lt-linkbtn" onClick={addStage}>+ add stage</button>
        </div>

        {logged.length < 2 ? (
          <div className="lt-note" style={{ padding: "50px 0", textAlign: "center" }}>
            The curve appears once two stages are logged.
          </div>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={logged.map((r) => ({ x: r.hr, lactate: r.lactate }))}
                         margin={{ top: 8, right: 12, bottom: 20, left: 4 }}>
                <CartesianGrid stroke={C.rule} strokeDasharray="2 4" />
                <XAxis type="number" dataKey="x" domain={["dataMin - 4", "dataMax + 4"]}
                       tick={{ fill: C.muted, fontSize: 11 }}
                       label={{ value: "heart rate (bpm)", position: "insideBottom",
                                offset: -12, fill: C.dim, fontSize: 11 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 11 }} domain={[0, "dataMax + 1"]} />
                <Tooltip
                  contentStyle={{ background: C.panel2, border: `1px solid ${C.rule}`,
                                  borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => `${Math.round(v)} bpm`}
                  formatter={(v) => [`${v} mmol/L`, "lactate"]} />
                <ReferenceLine y={4} stroke={C.warm} strokeDasharray="4 4"
                               label={{ value: "4.0", fill: C.warm, fontSize: 10, position: "right" }} />
                <Line dataKey="lactate" stroke={C.signal} strokeWidth={2}
                      dot={{ r: 4 }} type="monotone" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <table className="lt-table" style={{ marginTop: 10 }}>
          <thead>
            <tr><th>#</th><th>target</th><th>time</th><th>pace/mi</th><th>HR</th><th>lactate</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.n} style={{ opacity: i === idx && phase === "stage" ? 1 : 0.75 }}>
                <td className="lt-mono">{r.n}{i === idx && phase === "stage" ? " ←" : ""}</td>
                <td className="lt-mono">{r.target}</td>
                <td className="lt-mono">{r.sec ? `${Math.floor(r.sec / 60)}:${pad(r.sec % 60)}` : "—"}</td>
                <td className="lt-mono">{r.pace ?? "—"}</td>
                <td className="lt-mono">{r.hr ?? "—"}</td>
                <td className="lt-mono" style={{ color: lactColor(r.lactate), fontWeight: 700 }}>
                  {r.lactate ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {stages.length > idx + 1 && (
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <button className="lt-linkbtn" onClick={removeLastStage}>remove last stage</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="lt-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="lt-stat">
      <div className="lt-stat-l">{label}</div>
      <div className="lt-stat-v lt-mono">{value}</div>
      {sub && <div className="lt-stat-s">{sub}</div>}
    </div>
  );
}
