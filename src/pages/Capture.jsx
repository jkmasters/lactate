import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { saveSession, saveDraft, getDraft, clearDraft } from "../lib/storage.js";
import { deriveRows, pad } from "../lib/lactate.js";
import { C, chart, lactColor, SERIES } from "../theme.js";

const OFFSETS = [48, 40, 32, 24, 16, 8]; // target HR = hrMax - offset

const blank = (target) => ({ target, hr: "", min: "", sec: "", lact: "", note: "" });

/* Capture — laptop layout, driven by whoever is administering the test.
   Entry on the left, the curve building on the right, because "do we
   need another stage?" is a decision made mid-test and you cannot make
   it without seeing the curve. */
export default function Capture() {
  const nav = useNavigate();

  // setup -> prerest -> warmup -> prebaseline -> stage <-> rest -> done
  // "rest" is the recovery between stages; "prerest" is the cold resting
  // lactate reading taken before the warm-up. Different things.
  const [phase, setPhase] = useState("setup");
  const [athlete, setAthlete] = useState("");
  const [hrMax, setHrMax] = useState(175);
  const [dist, setDist] = useState(2400);
  const [restLen, setRestLen] = useState(90);
  const [meta, setMeta] = useState({
    date: new Date().toISOString().slice(0, 10),
    label: "", temp: "", wind: "", notes: "",
  });

  const [warmupLen, setWarmupLen] = useState(600); // 10 min warm-up
  /* Rest and baseline are single readings taken before the test, not
     stages — no distance, no pace. Exactly one of each per test, so they
     live as their own fields rather than as rows. */
  const [pre, setPre] = useState({
    rest: { hr: "", lact: "", note: "" },
    baseline: { hr: "", lact: "", note: "" },
  });
  const [stages, setStages] = useState([]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
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
    setRestLen(d.restLen ?? 90); setWarmupLen(d.warmupLen ?? 600);
    setMeta(d.meta); setStages(d.stages);
    if (d.pre) setPre(d.pre);
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
    saveDraft({ athlete, hrMax, dist, restLen, warmupLen, meta, pre, stages, idx, phase });
  }, [athlete, hrMax, dist, restLen, warmupLen, meta, pre, stages, idx, phase]);

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
    if (phase === "stage" || phase === "prerest" || phase === "prebaseline") {
      firstField.current?.focus();
    }
  }, [phase, idx]);

  const rows = useMemo(() => deriveRows(stages, dist), [stages, dist]);
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
    setPhase("prerest");
  }

  function setPreField(which, k, v) {
    setPre((p) => ({ ...p, [which]: { ...p[which], [k]: v } }));
  }

  function beginWarmup() {
    beeped.current = false;
    setLeft(+warmupLen || 600);
    setRunning(true);
    setPhase("warmup");
  }

  /* Log the current stage. Last stage ends the test; otherwise rest. */
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
  function addStageAfter() {
    setStages((p) => [...p, blank((p[p.length - 1]?.target ?? +hrMax - 8) + 8)]);
  }

  /* A stage below the current opener, for an athlete whose curve starts
     lower than the default ladder assumes.

     Where the pointer lands depends on where you are. On stage 1 the
     point is to run the easier stage first, so stay put and let it
     become the new stage 1. Further in, the intent is to extend the
     ladder downward without losing your place, so move with it. */
  function addStageBefore() {
    setStages((p) => [blank((p[0]?.target ?? +hrMax - 48) - 8), ...p]);
    if (idx > 0) setIdx((i) => i + 1);
  }

  function removeLastStage() {
    if (stages.length <= 1 || idx >= stages.length - 1) return;
    setStages((p) => p.slice(0, -1));
  }

  function removeFirstStage() {
    if (stages.length <= 1 || idx === 0) return;
    setStages((p) => p.slice(1));
    setIdx((i) => Math.max(0, i - 1));
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
      // pre-test readings: rest taken cold, baseline after the warm-up
      rest: pre.rest.lact === "" ? null
        : { hr: pre.rest.hr === "" ? null : +pre.rest.hr, lact: pre.rest.lact, note: pre.rest.note },
      baseline: pre.baseline.lact === "" ? null
        : { hr: pre.baseline.hr === "" ? null : +pre.baseline.hr, lact: pre.baseline.lact, note: pre.baseline.note },
      // store raw stage input only — paces are derived from sec + dist
      rows: stages
        .filter((s) => s.hr !== "" && s.lact !== "" && (s.min !== "" || s.sec !== ""))
        .map((s, i) => ({
          n: i + 1, target: s.target, note: s.note || "",
          hr: +s.hr, lact: s.lact, min: s.min, sec: s.sec,
        })),
    };
    /* The athlete has already run the test by this point. If the save
       fails the draft stays put, so the data survives a retry, a
       refresh, or the connection coming back later. */
    setSaving(true);
    setSaveError(null);
    try {
      await saveSession(session);
      await clearDraft();
      nav("/", { state: { selectOnly: session.id } });
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
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
          Resting reading, then a {Math.round((+warmupLen || 600) / 60)} min warm-up and a
          baseline reading, then six stages of {dist} m stepping up to HRmax.
          You can add stages at either end once you see the curve.
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
          <Field label="Warm-up (s)">
            <input className="lt-input lt-mono" type="number" value={warmupLen}
                   onChange={(e) => setWarmupLen(e.target.value)} />
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
          <div className="lt-flag" style={{ marginTop: 14 }}>
            Resumed an interrupted test.
          </div>
        )}

        {phase === "prerest" && (
          <PreReading
            eyebrow="Before the test · 1 of 2"
            title="Resting lactate"
            blurb="Taken cold, before any warm-up. Athlete seated and settled."
            value={pre.rest}
            onChange={(k, v) => setPreField("rest", k, v)}
            onSkip={beginWarmup}
            onNext={beginWarmup}
            nextLabel="Record → warm-up"
            firstRef={firstField}
          />
        )}

        {phase === "warmup" && (
          <div className="lt-card" style={{ marginTop: 14 }}>
            <div className="lt-eyebrow">Warm-up · baseline reading next</div>
            <div className="lt-timer">
              <div className="lt-timer-n"
                   style={{ color: left === 0 ? C.signal : left <= 30 ? C.warm : C.ink }}>
                {Math.floor(left / 60)}:{pad(left % 60)}
              </div>
              <div className="lt-timer-l">
                {left === 0 ? "Warm-up done — take the baseline reading" : "Athlete warming up"}
              </div>
            </div>
            <div className="lt-foot">
              <button className="lt-btn lt-btn-ghost" onClick={() => setRunning(!running)}>
                {running ? "Pause" : "Resume"}
              </button>
              <button className="lt-btn lt-btn-primary" style={{ flex: 2 }}
                      onClick={() => { setRunning(false); setPhase("prebaseline"); }}>
                {left === 0 ? "Baseline reading" : "Skip warm-up → baseline"}
              </button>
            </div>
          </div>
        )}

        {phase === "prebaseline" && (
          <PreReading
            eyebrow="Before the test · 2 of 2"
            title="Baseline lactate"
            blurb="Taken after the warm-up, immediately before stage 1."
            value={pre.baseline}
            onChange={(k, v) => setPreField("baseline", k, v)}
            onSkip={() => setPhase("stage")}
            onNext={() => setPhase("stage")}
            nextLabel="Record → stage 1"
            firstRef={firstField}
          />
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
                  {idx + 1 < stages.length ? "Log stage → rest" : "Log stage → finish"}
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
            <div className="lt-note" style={{ marginTop: 10 }}>
              {logged.length < 3
                ? "Fewer than three complete stages — nothing to analyse, but you can still save the raw data."
                : "Thresholds are on the analyze screen, where this test can be read against the others."}
            </div>
            <Field label="Notes">
              <input className="lt-input" value={meta.notes} placeholder="how it went"
                     onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
            </Field>
            {saveError && (
              <div className="lt-flag hot" style={{ marginTop: 12 }}>
                <div className="lt-eyebrow" style={{ color: C.hot }}>Not saved</div>
                <div className="lt-note" style={{ marginTop: 4 }}>{saveError}</div>
                <div className="lt-note" style={{ marginTop: 8, fontSize: 11 }}>
                  Nothing is lost — this test is still held on this device and
                  will be offered back to you when you return to capture.
                </div>
              </div>
            )}
            <div className="lt-foot" style={{ marginTop: 16 }}>
              <button className="lt-btn lt-btn-ghost" onClick={() => setPhase("stage")}>
                Back to stages
              </button>
              <button className="lt-btn lt-btn-primary" onClick={finish}
                      disabled={saving} style={{ flex: 2 }}>
                {saving ? "Saving…" : saveError ? "Try again" : "Save test"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- right: the curve as it builds, and what is logged ---- */}
      <div className="lt-card" style={{ marginTop: 14 }}>
        <div className="lt-card-t" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Curve so far</span>
          <span style={{ display: "flex", gap: 10 }}>
            <button className="lt-linkbtn" onClick={addStageBefore}
                    title="Add an easier stage below the current opener">
              + stage before
            </button>
            <button className="lt-linkbtn" onClick={addStageAfter}
                    title="Add a harder stage after the last">
              + stage after
            </button>
          </span>
        </div>

        {logged.length < 2 ? (
          <div className="lt-note" style={{ padding: "50px 0", textAlign: "center" }}>
            The curve appears once two stages are logged.
          </div>
        ) : (
          <div className="lt-gridfield" style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={logged.map((r) => ({ x: r.hr, lactate: r.lactate }))}
                         margin={{ top: 8, right: 12, bottom: 20, left: 4 }}>
                <CartesianGrid stroke={chart.grid} />
                <XAxis type="number" dataKey="x" domain={["dataMin - 4", "dataMax + 4"]}
                       tick={chart.tick}
                       label={{ value: "heart rate (bpm)", position: "insideBottom",
                                offset: -12, ...chart.axisLabel }} />
                <YAxis tick={chart.tick} domain={[0, "dataMax + 1"]} />
                <Tooltip
                  contentStyle={chart.tooltip}
                  labelFormatter={(v) => `${Math.round(v)} bpm`}
                  formatter={(v) => [`${v} mmol/L`, "lactate"]} />
                <ReferenceLine y={4} stroke={C.warm} strokeDasharray={chart.obla}
                               label={{ value: "4.0", ...chart.axisLabel, fill: C.warm, position: "right" }} />
                <Line dataKey="lactate" stroke={SERIES[0]} strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 0 }} type="monotone" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <table className="lt-table" style={{ marginTop: 10 }}>
          <thead>
            <tr><th>#</th><th>target</th><th>time</th><th>pace/mi</th><th>HR</th><th>lactate</th></tr>
          </thead>
          <tbody>
            {["rest", "baseline"].map((k) =>
              pre[k].lact === "" ? null : (
                <tr key={k} style={{ opacity: 0.75 }}>
                  <td style={{ textTransform: "capitalize" }}>{k}</td>
                  <td className="lt-mono">—</td>
                  <td className="lt-mono">—</td>
                  <td className="lt-mono">—</td>
                  <td className="lt-mono">{pre[k].hr || "—"}</td>
                  <td className="lt-mono" style={{ color: lactColor(+pre[k].lact), fontWeight: 700 }}>
                    {(+pre[k].lact).toFixed(1)}
                  </td>
                </tr>
              )
            )}
            {rows.map((r, i) => (
              <tr key={r.n} style={{ opacity: i === idx && phase === "stage" ? 1 : 0.75 }}>
                <td className="lt-mono">{r.n}{i === idx && phase === "stage" ? " ←" : ""}</td>
                <td className="lt-mono">{r.target}</td>
                <td className="lt-mono">{r.sec ? `${Math.floor(r.sec / 60)}:${pad(r.sec % 60)}` : "—"}</td>
                <td className="lt-mono">{r.pace ?? "—"}</td>
                <td className="lt-mono">{r.hr ?? "—"}</td>
                <td className="lt-mono" style={{ color: lactColor(r.lactate), fontWeight: 700 }}>
                  {r.lactate != null ? r.lactate.toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span>
            {idx > 0 && stages.length > 1 && (
              <button className="lt-linkbtn" onClick={removeFirstStage}>remove first stage</button>
            )}
          </span>
          <span>
            {stages.length > idx + 1 && (
              <button className="lt-linkbtn" onClick={removeLastStage}>remove last stage</button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Rest and baseline share a screen: a lactate value, an optional heart
   rate, and a note. No time or distance — nothing is being run. */
function PreReading({ eyebrow, title, blurb, value, onChange, onNext, onSkip, nextLabel, firstRef }) {
  const ready = value.lact !== "";
  return (
    <div className="lt-card" style={{ marginTop: 14 }}>
      <div className="lt-eyebrow">{eyebrow}</div>
      <div className="lt-h1">{title}</div>
      <div className="lt-sub" style={{ marginBottom: 14 }}>{blurb}</div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (ready) onNext(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.tagName === "INPUT" && ready) {
            e.preventDefault();
            onNext();
          }
        }}
      >
        <div className="lt-grid lt-g2">
          <Field label="Lactate (mmol/L)">
            <input ref={firstRef} className="lt-input lt-mono lt-big" type="number" step="0.1"
                   inputMode="decimal" value={value.lact} placeholder="1.0"
                   onChange={(e) => onChange("lact", e.target.value)} />
          </Field>
          <Field label="Heart rate (optional)">
            <input className="lt-input lt-mono lt-big" type="number" inputMode="numeric"
                   value={value.hr} placeholder="—"
                   onChange={(e) => onChange("hr", e.target.value)} />
          </Field>
        </div>
        <Field label="Note (optional)">
          <input className="lt-input" value={value.note} placeholder=""
                 onChange={(e) => onChange("note", e.target.value)} />
        </Field>
        <div className="lt-foot" style={{ marginTop: 16 }}>
          <button type="button" className="lt-btn lt-btn-ghost" onClick={onSkip}>Skip</button>
          <button type="submit" className="lt-btn lt-btn-primary" disabled={!ready} style={{ flex: 2 }}>
            {nextLabel}
          </button>
        </div>
      </form>
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
