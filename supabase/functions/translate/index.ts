// Semay – Schlagzeilen auf Deutsch
// Übersetzt neue Schlagzeilen (Englisch, Amharisch, Tigrinya, Arabisch) maschinell ins Deutsche, über den freien Dienst
// MyMemory (Translated srl, Italien). Übertragen wird nur die Schlagzeile, keine Daten über Leser.
// Das Original bleibt gespeichert und wird in der App immer mit angezeigt. Zugang nur mit internem Schlüssel.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const LANG: Record<string, string> = { en: "en", am: "am", ti: "ti", ar: "ar", fr: "fr", it: "it" };
const PER_RUN = 40;

// Ein paar feste Namen, die Maschinen gern falsch übersetzen
const FIX: [RegExp, string][] = [
  [/\bTigray-Interimsverwaltung\b/gi, "Übergangsverwaltung von Tigray"],
];

async function translate(text: string, from: string): Promise<{ ok: boolean; out?: string; stop?: boolean }> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|de`;
  const r = await fetch(url, { headers: { "User-Agent": "Semay/1.0 (Lagebild Horn von Afrika; powered by BELES; beles.app)" } });
  if (!r.ok) return { ok: false, stop: true }; // Dienst gestört oder Kontingent erschöpft: beim nächsten Lauf weiter
  const j = await r.json().catch(() => null);
  const out = String(j?.responseData?.translatedText || "").trim();
  if (j?.quotaFinished || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR/i.test(out)) return { ok: false, stop: !!j?.quotaFinished || /MYMEMORY WARNING/i.test(out) };
  if (Number(j?.responseStatus) !== 200 || !out || out.toLowerCase() === text.toLowerCase()) return { ok: false };
  let t = out.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  for (const [re, v] of FIX) t = t.replace(re, v);
  return { ok: true, out: t };
}

Deno.serve(async (req) => {
  const { data: ok } = await supabase.rpc("check_ingest_key", { k: req.headers.get("x-ingest-key") ?? "" });
  if (!ok) return new Response("forbidden", { status: 403 });
  const since = new Date(Date.now() - 72 * 3600e3).toISOString();
  const { data: items, error } = await supabase.from("items").select("id,title,language")
    .is("title_de", null).neq("language", "de").not("regions", "eq", "{}")
    // Nur, was die App zeigt (Zeit der Meldung in den letzten 72 Stunden), neueste zuerst: schont das freie Kontingent
    .or(`published_at.gt.${since},and(published_at.is.null,fetched_at.gt.${since})`)
    .order("published_at", { ascending: false, nullsFirst: false }).limit(PER_RUN);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let done = 0, failed = 0, stopped = false;
  for (const it of items || []) {
    const from = LANG[it.language] || "en";
    const r = await translate(String(it.title), from);
    if (r.ok) { await supabase.from("items").update({ title_de: r.out }).eq("id", it.id); done++; }
    else {
      failed++;
      // Nicht übersetzbar (z. B. Sprache nicht unterstützt): leer markieren, damit es nicht jedes Mal neu versucht wird
      if (!r.stop) await supabase.from("items").update({ title_de: "" }).eq("id", it.id);
    }
    if (r.stop) { stopped = true; break; }
    await new Promise((res) => setTimeout(res, 400));
  }
  return Response.json({ ran_at: new Date().toISOString(), candidates: (items || []).length, done, failed, stopped });
});
