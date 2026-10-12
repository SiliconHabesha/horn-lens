// Semay – Schlagzeilen auf Deutsch, Englisch und Tigrinya
// Übersetzt neue Schlagzeilen maschinell in die drei Sprachen der App, über den freien Dienst
// MyMemory (Translated srl, Italien). Übertragen wird nur die Schlagzeile, keine Daten über Leser.
// Das Original bleibt gespeichert und wird in der App immer mit angezeigt. Zugang nur mit internem Schlüssel.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const LANG: Record<string, string> = { en: "en", am: "am", ti: "ti", ar: "ar", fr: "fr", it: "it" };
const PER_RUN = 20;

// Ein paar feste Namen, die Maschinen gern falsch übersetzen
const FIX: [RegExp, string][] = [
  [/\bTigray-Interimsverwaltung\b/gi, "Übergangsverwaltung von Tigray"],
];

async function translate(text: string, from: string, to = "de"): Promise<{ ok: boolean; out?: string; stop?: boolean }> {
  // Mit Kontakt-Adresse erlaubt MyMemory 50.000 statt 5.000 Zeichen am Tag (öffentliche Kontaktadresse aus dem Impressum)
  const email = Deno.env.get("MYMEMORY_EMAIL") || "info@beles.app";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}${email ? `&de=${encodeURIComponent(email)}` : ""}`;
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
  // Prüfmodus: einzelne Texte übersetzen, ohne etwas zu speichern
  const body = await req.json().catch(() => ({}));
  if (Array.isArray(body?.probe)) {
    const out = [];
    for (const p of body.probe.slice(0, 10)) { const r = await translate(String(p.q), String(p.from), String(p.to || "de")); out.push({ ...p, ...r }); }
    return Response.json(out);
  }
  const since = new Date(Date.now() - 72 * 3600e3).toISOString();
  const { data: items, error } = await supabase.from("items").select("id,title,language,title_de,title_en,title_ti")
    .not("regions", "eq", "{}").or("title_de.is.null,title_en.is.null,title_ti.is.null")
    // Nur, was die App zeigt (Zeit der Meldung in den letzten 72 Stunden), neueste zuerst: schont das freie Kontingent
    .or(`published_at.gt.${since},and(published_at.is.null,fetched_at.gt.${since})`)
    .order("published_at", { ascending: false, nullsFirst: false }).limit(PER_RUN);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let done = 0, failed = 0, stopped = false;
  const save = (id: number, patch: Record<string, string>) => supabase.from("items").update(patch).eq("id", id);
  outer: for (const it of items || []) {
    const lang = LANG[it.language] || "en";
    const title = String(it.title);
    // Leerer Text heißt: nicht übersetzbar oder nicht nötig (Originalsprache), die App zeigt dann das Original
    const jobs: [string, string, string][] = []; // Spalte, von, Text
    if (it.title_de == null) jobs.push(["title_de", lang, title]);
    if (it.title_en == null) jobs.push(["title_en", lang, title]);
    if (it.title_ti == null) jobs.push(["title_ti", lang === "en" ? "en" : lang, title]);
    for (const [col, from, text] of jobs) {
      const to = col.slice(6);
      if (from === to) { await save(it.id, { [col]: "" }); continue; }
      // Tigrinya über das Englische, wenn das Original weder Englisch noch Tigrinya ist (bessere Ergebnisse)
      let src = text, fl = from;
      if (to === "ti" && from !== "en") {
        const { data: fresh } = await supabase.from("items").select("title_en").eq("id", it.id).single();
        if (fresh?.title_en) { src = fresh.title_en; fl = "en"; }
      }
      const r = await translate(src, fl, to);
      if (r.ok) { await save(it.id, { [col]: r.out! }); done++; }
      else { failed++; if (!r.stop) await save(it.id, { [col]: "" }); }
      if (r.stop) { stopped = true; break outer; }
      await new Promise((res) => setTimeout(res, 400));
    }
  }
  return Response.json({ ran_at: new Date().toISOString(), candidates: (items || []).length, done, failed, stopped });
});
