import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ADMIN_PASSCODE = Deno.env.get("ADMIN_PASSCODE");
const TOKEN_SECRET = Deno.env.get("ADMIN_TOKEN_SECRET");
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(TOKEN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// Exported so verify-admin (or any future admin-only function) can reuse it.
export async function verifyToken(token: string | null): Promise<boolean> {
  if (!token || !TOKEN_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [prefix, expiresStr, signature] = parts;
  const payload = `${prefix}.${expiresStr}`;
  const expected = await sign(payload);
  if (expected !== signature) return false;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!ADMIN_PASSCODE || !TOKEN_SECRET) {
    return json({ error: "Server not configured. Set ADMIN_PASSCODE and ADMIN_TOKEN_SECRET." }, 500);
  }

  let code: string | undefined;
  try {
    ({ code } = await req.json());
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  if (code !== ADMIN_PASSCODE) {
    return json({ error: "Incorrect passcode" }, 401);
  }

  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = `admin.${expires}`;
  const signature = await sign(payload);
  const token = `${payload}.${signature}`;

  return json({ token, expires });
});
