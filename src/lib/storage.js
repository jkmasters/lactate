/* ------------------------------------------------------------------ *
 *  Storage
 *
 *  The whole persistence surface lives behind this module. Today it is
 *  localStorage; next it becomes Supabase. Because the component only
 *  ever sees these four functions, that swap is a change to this file
 *  and nothing else.
 *
 *  Every function is async even though localStorage is not — that way
 *  the signatures do not change when the backend does.
 *
 *  Replaces the artifact's three window.storage calls, which only
 *  existed inside the Claude artifact sandbox.
 * ------------------------------------------------------------------ */

const KEY = "lactate:sessions";
const DRAFT_KEY = "lactate:draft";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---- sessions ---- */

export async function getSessions() {
  const all = read(KEY, []);
  return Array.isArray(all) ? all : [];
}

export async function getSession(id) {
  const all = await getSessions();
  return all.find((s) => String(s.id) === String(id)) ?? null;
}

export async function saveSession(session) {
  const all = await getSessions();
  const i = all.findIndex((s) => String(s.id) === String(session.id));
  // upsert, so re-saving an edited test replaces rather than duplicates
  if (i >= 0) all[i] = session;
  else all.push(session);
  // NB: no .slice(-12) — the artifact capped history at 12 because the
  // sandbox storage was small. A real backend has no such limit.
  return write(KEY, all);
}

export async function deleteSession(id) {
  const all = await getSessions();
  return write(KEY, all.filter((s) => String(s.id) !== String(id)));
}

/* ---- in-progress draft ----
   Autosaved on every stage so a refresh mid-test does not lose the
   session. Cleared once the test is saved properly. ---- */

export async function getDraft() {
  return read(DRAFT_KEY, null);
}

export async function saveDraft(draft) {
  return write(DRAFT_KEY, draft);
}

export async function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    return false;
  }
}

/* ---- export ----
   The safety net for the passphrase-gate decision: one click gets
   everything back out as JSON. ---- */

export async function exportAll() {
  const sessions = await getSessions();
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    sessions,
  };
}

export async function importAll(payload) {
  if (!payload || !Array.isArray(payload.sessions)) {
    throw new Error("Not a recognised export file");
  }
  const existing = await getSessions();
  const byId = new Map(existing.map((s) => [String(s.id), s]));
  for (const s of payload.sessions) byId.set(String(s.id), s);
  return write(KEY, [...byId.values()]);
}
