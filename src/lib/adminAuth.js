// src/lib/adminAuth.js
//
// Replaces the old client-side check:
//   if (code === import.meta.env.VITE_ADMIN_PASSCODE) { ... }
//
// The passcode is now checked by the `admin-login` Supabase Edge Function,
// which is the only place that ever sees the real secret. The browser only
// ever stores a signed, expiring token — never the passcode itself.

import supabase from "@/api/supabaseClient";

const STORAGE_KEY = "cuerank_admin_token";

export async function loginAdmin(code) {
  const { data, error } = await supabase.functions.invoke("admin-login", {
    body: { code },
  });

  // supabase-js surfaces non-2xx responses as `error`, with the JSON body
  // available on error.context if you need the message; we just treat any
  // error as "incorrect passcode" for simplicity here.
  if (error || !data?.token) {
    return { ok: false };
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return { ok: true };
}

export function logoutAdmin() {
  localStorage.removeItem(STORAGE_KEY);
}

// Reads the stored token and checks local expiry. This is only good enough
// to drive the UI (show/hide admin buttons). It is NOT proof of admin status
// to the database — see the note in README/SETUP about protecting actual
// writes (deleting matches, tournaments, etc.) with RLS or server checks
// that re-verify this token, since the Supabase anon key alone can't tell
// an admin apart from any other visitor.
export function getStoredAdminSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expires) return null;
    if (Date.now() > parsed.expires) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isAdminSessionValid() {
  return getStoredAdminSession() !== null;
}

// Attach this to Supabase function calls that should be admin-gated, e.g.
//   supabase.functions.invoke("delete-match", {
//     headers: adminAuthHeader(),
//     body: { matchId },
//   });
export function adminAuthHeader() {
  const session = getStoredAdminSession();
  return session ? { "x-admin-token": session.token } : {};
}
