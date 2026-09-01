import { createClient } from "@supabase/supabase-js";

/* Vite inlines VITE_* at build time, so these end up in the bundle. That is
   unavoidable for a browser client and is why the anon key is treated as
   public — see the RLS note in supabase/schema.sql. */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

/* Null when unconfigured rather than throwing, so the app falls back to
   localStorage and keeps working instead of showing a blank page. */
export const supabase = isConfigured ? createClient(url, key) : null;
