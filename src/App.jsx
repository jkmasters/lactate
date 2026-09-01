import React, { useState } from "react";
import { Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { css } from "./theme.js";
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
      </div>
    </header>
  );
}
