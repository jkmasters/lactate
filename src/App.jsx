import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { css } from "./theme.js";
import { getSessions, backend, onStoreChange } from "./lib/storage.js";
import Analyze from "./pages/Analyze.jsx";
import Capture from "./pages/Capture.jsx";
import Review from "./pages/Review.jsx";
import Gate, { isUnlocked } from "./components/Gate.jsx";

/* Analyze is the landing page — you arrive at what you already have,
   and start a capture from there. */
export default function App() {
  const { pathname } = useLocation();
  const wide = !pathname.startsWith("/review");
  const [unlocked, setUnlocked] = useState(isUnlocked);

  if (!unlocked) {
    return (
      <div className="lt-root">
        <style>{css}</style>
        <Gate onUnlock={() => setUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="lt-root">
      <style>{css}</style>
      {/* outside the wrap: the bar and its grid horizon are full-bleed,
          and .lt-nav-inner centres the content within them */}
      <Nav />
      <div className={wide ? "lt-wrap-wide" : "lt-wrap"}>
        <Routes>
          <Route path="/" element={<Analyze />} />
          <Route path="/analyze" element={<Navigate to="/" replace />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function Nav() {
  return (
    <header className="lt-nav lt-horizon">
      <div className="lt-nav-inner">
        <div>
          <div className="lt-eyebrow">Lactate</div>
          <div className="lt-nav-links">
            <NavLink to="/" end className="lt-navlink">
              Analyze
            </NavLink>
            <NavLink to="/capture" className="lt-navlink">
              New capture
            </NavLink>
          </div>
        </div>
        <StatusMeta />
      </div>
    </header>
  );
}

/* Three-line readout: which store is live and whether it answered, how
   much is in it, and when the most recent test was run. It re-reads on
   every mutation, so a save or a delete is reflected straight away
   rather than waiting for a navigation. */
function StatusMeta() {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const read = () =>
      getSessions()
        .then((all) => {
          if (!live) return;
          setFailed(false);
          const dates = all.map((s) => s.date).filter(Boolean).sort();
          setStats({
            n: all.length,
            athletes: new Set(all.map((s) => s.athlete).filter(Boolean)).size,
            last: dates[dates.length - 1] ?? null,
          });
        })
        .catch(() => live && setFailed(true));

    read();
    const stop = onStoreChange(read);
    return () => { live = false; stop(); };
  }, []);

  const store = backend() === "supabase" ? "SUPABASE" : "LOCAL";
  const health = failed ? "ERR" : stats ? "OK" : "…";

  return (
    <div className="lt-nav-meta">
      <div>DB:{store} · {health}</div>
      <div>
        {stats ? `N=${stats.n} · ${stats.athletes} ATHLETE${stats.athletes === 1 ? "" : "S"}` : "N=— · —"}
      </div>
      <div>{stats?.last ?? "—"}</div>
    </div>
  );
}
