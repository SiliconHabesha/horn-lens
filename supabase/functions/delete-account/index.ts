// Semay – Konto löschen (verlangen Apple und Google für Apps mit Anmeldung).
// Löscht nur das Konto, das die Anfrage stellt: die Kennung kommt aus dem geprüften Anmelde-Token, nie aus der Anfrage.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user) return new Response("unauthorized", { status: 401, headers: cors });
  const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id);
  if (delErr) return Response.json({ error: delErr.message }, { status: 500, headers: cors });
  return Response.json({ deleted: true }, { headers: cors });
});
