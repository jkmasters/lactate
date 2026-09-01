import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { getSession, deleteSession, deleteNeedsPassword } from "../lib/storage.js";
import { analyze, deriveRows, minToPace, pad } from "../lib/lactate.js";
import { C, chart, lactColor, SERIES } from "../theme.js";

/* Review — one test, in detail. Reached by clicking a row in Analyze,
   or straight after saving a capture. */
export default function Review() {
  const { id } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState(undefined); // undefined = loading
  const [error, setError] = useState(null);
  const [xMode, setXMode] = useState("hr");

  useEffect(() => {
    getSession(id)
      .then(setSession)
      .catch((e) => { setError(e.message); setSession(null); });
  }, [id]);

  if (session === undefined) return <div className="lt-card lt-note">Loading…</div>;
  if (error) {
    return (
      <div className="lt-card" style={{ marginTop: 14 }}>
        <div className="lt-eyebrow" style={{ color: C.hot }}>Could not reach the database</div>
        <div className="lt-h1">Test unavailable</div>
        <div className="lt-flag hot" style={{ marginBottom: 18 }}>{error}</div>
        <Link className="lt-btn lt-btn-primary" to="/">Back to all tests</Link>
      </div>
    );
  }
  if (session === null) {
    return (
      <div className="lt-card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div className="lt-h1">Test not found</div>
        <div className="lt-sub" style={{ margin: "8px 0 18px" }}>
          It may have been deleted, or the link is wrong.
        </div>
        <Link className="lt-btn lt-btn-primary" to="/">Back to all tests</Link>
      </div>
    );
  }

  const rows = deriveRows(session.rows ?? [], session.dist);
  const result = analyze(rows);
  const chart = rows
    .filter((r) => r.lactate != null && (xMode === "hr" ? r.hr != null : r.perMileSec != null))
    .map((r) => ({ x: xMode === "hr" ? r.hr : r.perMileSec / 60, lactate: r.lactate }));

  async function remove() {
    let pw;
    if (deleteNeedsPassword()) {
      pw = prompt(`Delete "${session.label || session.date}"?\n\nThis cannot be undone. Enter the delete password:`);
      if (pw === null) return;
    } else if (!confirm(`Delete "${session.label || session.date}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteSession(session.id, pw);
      nav("/");
    } catch (e) {
      setError(e.message);
    }
  }

  function csv() {
    const head = "stage,target_hr,avg_hr,pct_hrmax,time,pace_mile,pace_km,mph,m_per_s,lactate_mmol";
    const body = rows
      .map((r) =>
        [
          r.n, r.target, r.hr ?? "",
          r.hr && session.hrMax ? Math.round((r.hr / session.hrMax) * 100) : "",
          r.sec ? `${Math.floor(r.sec / 60)}:${pad(r.sec % 60)}` : "",
          r.pace ?? "", r.km ?? "", r.mph ?? "", r.ms ?? "", r.lactate ?? "",
        ].join(",")
      )
      .join("\n");
    const pre = [
      session.rest ? `rest,,${session.rest.hr ?? ""},,,,,,,${session.rest.lact}` : null,
      session.baseline ? `baseline,,${session.baseline.hr ?? ""},,,,,,,${session.baseline.lact}` : null,
    ].filter(Boolean).join("\n");
    const text = `# ${session.label || "Lactate step test"} ${session.date}  HRmax ${session.hrMax}  ${session.dist}m stages  ${session.temp ?? ""}\n${head}\n${pre}${pre ? "\n" : ""}${body}`;
    const b = new Blob([text], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `lactate-${session.date}.csv`;
    a.click();
  }

  return (
    <>
      <div className="lt-card" style={{ marginTop: 14 }}>
        <div className="lt-eyebrow">{session.date}{session.athlete ? ` · ${session.athlete}` : ""}</div>
        <div className="lt-h1">{session.label || `Test ${session.date}`}</div>
        <div className="lt-sub">
          {(session.rows ?? []).length} stages · {session.dist} m · HRmax {session.hrMax}
          {session.temp ? ` · ${session.temp}` : ""}
          {session.wind ? ` · ${session.wind}` : ""}
          {session.rest ? ` · rest ${session.rest.lact}` : ""}
          {session.baseline ? ` · baseline ${session.baseline.lact}` : ""}
        </div>
        {session.notes && (
          <div className="lt-note" style={{ marginTop: 10 }}>{session.notes}</div>
        )}
      </div>

      {result ? (
        <>
          <div className="lt-card">
            <div className="lt-card-t">Fixed thresholds</div>
            <div className="lt-grid lt-g3">
              <Stat label="LT1 (base +0.4)"
                    value={result.lt1 ? `${result.lt1.to.hr} bpm` : "—"}
                    sub={result.lt1 ? `stage ${result.lt1.to.n} · ${result.lt1.to.pace}/mi` : "not crossed"} />
              <Stat label="HR at base +1.0"
                    value={result.hrBase1 ? `${result.hrBase1} bpm` : "—"}
                    sub={`baseline ${result.base.toFixed(1)} mmol`} />
              <Stat label="OBLA 4.0 mmol"
                    value={result.hr4 ? `${result.hr4} bpm` : "—"}
                    sub={result.pace4 ? `${result.pace4}/mi` : "not reached"} />
            </div>
          </div>

          <div className="lt-card">
            <div className="lt-card-t">Curve-shape thresholds</div>
            <div className="lt-grid lt-g3">
              <Stat label="LT1 (log-log)"
                    value={result.logLog ? `${result.logLog.hr} bpm` : "—"}
                    sub={result.logLog
                      ? `${result.logLog.pace}/mi · ${result.logLog.lactate} mmol`
                      : result.logLogNote ? "rejected — see below" : "no breakpoint found"} />
              <Stat label="Dmax"
                    value={result.dmax ? `${result.dmax.hr} bpm` : "—"}
                    sub={result.dmax
                      ? `${result.dmax.pace}/mi · ${result.dmax.lactate} mmol`
                      : "needs 5+ stages with a clear rise"} />
              <Stat label="Modified Dmax"
                    value={result.modDmax ? `${result.modDmax.hr} bpm` : "—"}
                    sub={result.modDmax
                      ? `${result.modDmax.pace}/mi · ${result.modDmax.lactate} mmol`
                      : "needs 5+ stages with a clear rise"} />
            </div>
            {result.logLogNote && (
              <div className="lt-note" style={{ marginTop: 10, color: C.warm }}>
                {result.logLogNote}
              </div>
            )}
            {result.logLog?.weak && (
              <div className="lt-note" style={{ marginTop: 10, color: C.warm }}>
                The log-log breakpoint is shallow — the curve barely changes
                slope there ({result.logLog.slopeRatio}×), so treat that figure
                as indicative rather than definitive.
              </div>
            )}
            {result.dmax?.submaximal && (
              <div className="lt-note" style={{ marginTop: 10, color: C.warm }}>
                The last stage finished below 4 mmol, so this test may not have
                reached a genuine maximal effort. Both figures above are anchored
                on that final point and will read low if it was submaximal —
                Dmax more so than Modified Dmax.
              </div>
            )}
            <div className="lt-note" style={{ marginTop: 8, fontSize: 11 }}>
              Log-log finds LT1 where ln(lactate) against ln(velocity) changes
              slope. Dmax and Modified Dmax find LT2 as the point on the fitted
              curve furthest from a chord — Dmax spanning the first stage to the
              last, Modified Dmax starting at LT1 so an easy opening stage
              cannot drag the answer around.
            </div>
          </div>
        </>
      ) : (
        <div className="lt-card lt-note">
          Not enough complete stages to analyse — needs at least three with
          heart rate, time and lactate.
        </div>
      )}

      <div className="lt-card">
        <div className="lt-card-t" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Lactate curve</span>
          <div className="lt-seg sm">
            <button className={`lt-seg-b ${xMode === "hr" ? "on" : ""}`} onClick={() => setXMode("hr")}>
              vs HR
            </button>
            <button className={`lt-seg-b ${xMode === "pace" ? "on" : ""}`} onClick={() => setXMode("pace")}>
              vs pace
            </button>
          </div>
        </div>
        <div className="lt-gridfield" style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
              <CartesianGrid stroke={chart.grid} />
              <XAxis
                type="number" dataKey="x" domain={["dataMin - 2", "dataMax + 2"]}
                reversed={xMode === "pace"}
                tick={chart.tick}
                tickFormatter={(v) => (xMode === "hr" ? Math.round(v) : minToPace(v))}
                label={{ value: xMode === "hr" ? "heart rate (bpm)" : "pace (min/mi)",
                         position: "insideBottom", offset: -14, ...chart.axisLabel }}
              />
              <YAxis tick={chart.tick}
                     label={{ value: "mmol/L", angle: -90, position: "insideLeft", ...chart.axisLabel }} />
              <Tooltip
                contentStyle={chart.tooltip}
                labelFormatter={(v) => (xMode === "hr" ? `${Math.round(v)} bpm` : `${minToPace(v)}/mi`)}
                formatter={(v) => [`${v} mmol/L`, "lactate"]}
              />
              <ReferenceLine y={4} stroke={C.warm} strokeDasharray={chart.obla}
                             label={{ value: "4.0", ...chart.axisLabel, fill: C.warm, position: "right" }} />
              <Line dataKey="lactate" stroke={SERIES[0]} strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 0 }} type="monotone" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="lt-card">
        <div className="lt-card-t">Stages</div>
        <table className="lt-table">
          <thead>
            <tr>
              <th>#</th><th>time</th><th>pace/mi</th><th>HR</th>
              <th>%max</th><th>lactate</th>
            </tr>
          </thead>
          <tbody>
            {[["rest", session.rest], ["baseline", session.baseline]].map(([k, v]) =>
              !v ? null : (
                <tr key={k} style={{ opacity: 0.8 }}>
                  <td style={{ textTransform: "capitalize" }}>{k}</td>
                  <td className="lt-mono">—</td>
                  <td className="lt-mono">—</td>
                  <td className="lt-mono">{v.hr ?? "—"}</td>
                  <td className="lt-mono">
                    {v.hr && session.hrMax ? `${Math.round((v.hr / session.hrMax) * 100)}%` : "—"}
                  </td>
                  <td className="lt-mono" style={{ color: lactColor(+v.lact), fontWeight: 700 }}>
                    {(+v.lact).toFixed(1)}
                  </td>
                </tr>
              )
            )}
            {rows.map((r) => (
              <tr key={r.n}>
                <td className="lt-mono">{r.n}</td>
                <td className="lt-mono">{r.sec ? `${Math.floor(r.sec / 60)}:${pad(r.sec % 60)}` : "—"}</td>
                <td className="lt-mono">{r.pace ?? "—"}</td>
                <td className="lt-mono">{r.hr ?? "—"}</td>
                <td className="lt-mono">
                  {r.hr && session.hrMax ? `${Math.round((r.hr / session.hrMax) * 100)}%` : "—"}
                </td>
                <td className="lt-mono" style={{ color: lactColor(r.lactate), fontWeight: 700 }}>
                  {r.lactate != null ? r.lactate.toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="lt-foot" style={{ marginTop: 14 }}>
          <button className="lt-btn lt-btn-ghost" onClick={() => nav("/")}>Back</button>
          <button className="lt-btn lt-btn-ghost" onClick={csv}>CSV</button>
          <button className="lt-btn lt-btn-ghost" onClick={remove}>Delete</button>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="lt-stat">
      <div className="lt-stat-l">{label}</div>
      <div className="lt-stat-v lt-mono">{value}</div>
      <div className="lt-stat-s">{sub}</div>
    </div>
  );
}
