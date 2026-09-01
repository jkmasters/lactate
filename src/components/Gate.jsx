import React, { useState } from "react";
import { C } from "../theme.js";

/* Shared-passphrase screen.
 *
 * Be clear about what this is: it hides the interface from someone who
 * opens the URL. It is not access control. The passphrase is compared in
 * the browser against a value inlined in the bundle, so anyone willing to
 * read the JavaScript can walk straight past it — and it does nothing at
 * all to the database, which is reachable directly with the anon key.
 *
 * It is here because it is worth something against a casual visitor and
 * costs nothing. The real fix, if the data ever warrants it, is to check
 * this server-side in a Netlify Function that holds the service key.
 */

const OK_KEY = "lactate:gate";
const expected = import.meta.env.VITE_PASSPHRASE;

export const gateEnabled = Boolean(expected);

export function isUnlocked() {
  if (!gateEnabled) return true;
  try {
    return localStorage.getItem(OK_KEY) === expected;
  } catch {
    return false;
  }
}

export default function Gate({ onUnlock }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (value === expected) {
      try {
        localStorage.setItem(OK_KEY, value);
      } catch {
        /* private window — they will just enter it again next time */
      }
      onUnlock();
    } else {
      setWrong(true);
      setValue("");
    }
  }

  return (
    <div className="lt-gate">
      <form className="lt-card" style={{ width: "100%", maxWidth: 380 }} onSubmit={submit}>
        <div className="lt-eyebrow">Lactate</div>
        <div className="lt-h1">Enter the passphrase</div>
        <div className="lt-sub" style={{ margin: "6px 0 16px" }}>
          Asked once per device.
        </div>
        <input
          autoFocus
          type="password"
          className="lt-input lt-mono"
          value={value}
          onChange={(e) => { setValue(e.target.value); setWrong(false); }}
          placeholder="passphrase"
        />
        {wrong && (
          <div className="lt-note" style={{ color: C.hot, marginTop: 8 }}>
            Not that one.
          </div>
        )}
        <div className="lt-foot" style={{ marginTop: 16 }}>
          <button className="lt-btn lt-btn-primary" type="submit" style={{ flex: 1 }}>
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}
