/* ------------------------------------------------------------------ *
 *  Storage
 *
 *  The whole persistence surface. Two backends behind one interface:
 *
 *    Supabase   when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are
 *               set at build time — shared between devices
 *    localStorage  otherwise — per-browser, no setup
 *
 *  The fallback is deliberate: a missing or broken env var degrades to
 *  a working offline app rather than a blank page. Nothing above this
 *  module knows which one is in use.
 *
 *  Drafts always stay local. An interrupted test is per-device state,
 *  not something anyone else should see.
 * ------------------------------------------------------------------ */

import { supabase, isConfigured } from "./supabase.js";

const KEY = "lactate:sessions";
const DRAFT_KEY = "lactate:draft";

export const backend = () => (isConfigured ? "supabase" : "local");

/* ---- local helpers ---- */

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

/* ---- row <-> session mapping ----
   The app speaks camelCase and calls stages "rows"; Postgres speaks
   snake_case. Keep the translation in one place. */

const toRow = (s) => ({
  id: s.id,
  athlete: s.athlete ?? null,
  date: s.date,
  label: s.label ?? null,
  hr_max: s.hrMax ?? null,
  dist_m: s.dist ?? null,
  temp: s.temp ?? null,
  wind: s.wind ?? null,
  notes: s.notes ?? null,
  rest: s.rest ?? null,
  baseline: s.baseline ?? null,
  stages: s.rows ?? [],
});

const toSession = (r) => ({
  id: r.id,
  athlete: r.athlete,
  date: r.date,
  label: r.label,
  hrMax: r.hr_max,
  dist: r.dist_m,
  temp: r.temp,
  wind: r.wind,
  notes: r.notes,
  rest: r.rest,
  baseline: r.baseline,
  rows: r.stages ?? [],
});

/* ---- sessions ---- */

export async function getSessions() {
  if (isConfigured) {
    const { data, error } = await supabase.from("tests").select("*").order("date", { ascending: false });
    if (error) throw new Error(`Could not load tests: ${error.message}`);
    return (data ?? []).map(toSession);
  }
  const all = read(KEY, []);
  return Array.isArray(all) ? all : [];
}

export async function getSession(id) {
  if (isConfigured) {
    const { data, error } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Could not load test: ${error.message}`);
    return data ? toSession(data) : null;
  }
  const all = await getSessions();
  return all.find((s) => String(s.id) === String(id)) ?? null;
}

export async function saveSession(session) {
  if (isConfigured) {
    const { error } = await supabase.from("tests").upsert(toRow(session));
    if (error) throw new Error(`Could not save test: ${error.message}`);
    return true;
  }
  const all = await getSessions();
  const i = all.findIndex((s) => String(s.id) === String(session.id));
  if (i >= 0) all[i] = session;
  else all.push(session);
  return write(KEY, all);
}

export async function deleteSession(id) {
  if (isConfigured) {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) throw new Error(`Could not delete test: ${error.message}`);
    return true;
  }
  const all = await getSessions();
  return write(KEY, all.filter((s) => String(s.id) !== String(id)));
}

/* ---- in-progress draft — always local ---- */

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

/* ---- export / import ---- */

export async function exportAll() {
  const sessions = await getSessions();
  return { exportedAt: new Date().toISOString(), version: 1, sessions };
}

export async function importAll(payload) {
  if (!payload || !Array.isArray(payload.sessions)) {
    throw new Error("Not a recognised export file");
  }
  if (isConfigured) {
    const { error } = await supabase.from("tests").upsert(payload.sessions.map(toRow));
    if (error) throw new Error(`Could not import: ${error.message}`);
    return true;
  }
  const existing = await getSessions();
  const byId = new Map(existing.map((s) => [String(s.id), s]));
  for (const s of payload.sessions) byId.set(String(s.id), s);
  return write(KEY, [...byId.values()]);
}

/* Push whatever is in this browser's localStorage up to Supabase. The
   one-time migration for data recorded before the backend existed. */
export async function migrateLocalToRemote() {
  if (!isConfigured) throw new Error("Supabase is not configured");
  const local = read(KEY, []);
  if (!Array.isArray(local) || !local.length) return 0;
  const { error } = await supabase.from("tests").upsert(local.map(toRow));
  if (error) throw new Error(`Could not migrate: ${error.message}`);
  return local.length;
}
