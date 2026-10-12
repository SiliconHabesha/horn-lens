// Semay – Abholer für Nachrichten
// Holt alle aktiven Quellen ab, ordnet Meldungen Regionen zu und speichert Titel, Link und Zeit.
// Erfindet nichts: Was die Quelle nicht liefert, bleibt leer.
// Zugang nur mit internem Schlüssel (Header x-ingest-key), daher verify_jwt=false.

import { createClient } from "npm:@supabase/supabase-js@2";
import { backoff, parseGdelt, parseRss, relevant, sleep, tagItem, type Source } from "./parse.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Semay/1.0 (news monitor; powered by BELES; beles.app)", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Ein Abruf: holen, einordnen, neue Meldungen speichern. Jeder Abruf landet im Protokoll (ingest_runs):
// der Datenbank-Auslöser legt die Zeile an, sobald last_fetch_at gesetzt wird; hier kommen Startzeit und Zahlen dazu.
async function runSource(src: Source): Promise<string> {
  const started = new Date().toISOString();
  let stats: { found: number; kept: number; inserted: number; duplicates: number } | null = null;
  let now = started;
  try {
    let body = "";
    if (src.kind === "gdelt") {
      // GDELT drosselt geteilte Server-Adressen; zweimal mit Pause versuchen
      for (let attempt = 0; ; attempt++) {
        try { body = await fetchText(src.feed_url, 20000); parseGdelt(body, src); break; }
        catch (e) { if (attempt >= 1) throw e; await sleep(12000); }
      }
    } else {
      body = await fetchText(src.feed_url);
    }
    const parsed = src.kind === "gdelt" ? parseGdelt(body, src) : parseRss(body, src);
    const items = [...new Map(parsed.items.map((i) => [i.url, i])).values()];
    let inserted = 0;
    if (items.length) {
      const { data: rows, error: insErr } = await supabase.from("items").upsert(items, { onConflict: "url", ignoreDuplicates: true }).select("id");
      if (insErr) throw new Error(insErr.message);
      inserted = rows?.length ?? 0;
    }
    stats = { found: parsed.found, kept: items.length, inserted, duplicates: parsed.items.length - inserted };
    now = new Date().toISOString();
    await supabase.from("sources").update({ last_fetch_at: now, last_ok_at: now, last_error: null, failing_since: null, last_item_count: items.length })
      .eq("id", src.id);
    await logRun(src.id, started, now, stats);
    return `ok (${items.length}, ${inserted} new)`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    now = new Date().toISOString();
    await supabase.from("sources").update({ last_fetch_at: now, last_error: msg.slice(0, 300), failing_since: src.failing_since ?? now })
      .eq("id", src.id);
    await logRun(src.id, started, now, null);
    return `error: ${msg}`;
  }
}

async function logRun(id: string, started: string, finished: string, stats: Record<string, number> | null) {
  await supabase.from("ingest_runs").update({ started_at: started, ...(stats ?? {}) }).eq("source_id", id).eq("finished_at", finished);
}

// Meldungen der letzten 72 Stunden mit den aktuellen Regeln neu einordnen. Nichts wird gelöscht:
// passt eine Meldung zu keiner Region mehr, bekommt sie eine leere Regionenliste und erscheint nicht mehr.
async function retag(sources: Source[]) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const since = new Date(Date.now() - 72 * 3600e3).toISOString();
  const { data: rows, error } = await supabase.from("items").select("id,source_id,title,snippet,regions")
    .gte("fetched_at", since).limit(1000);
  if (error) throw new Error(error.message);
  let changed = 0;
  for (const r of rows ?? []) {
    const src = byId.get(r.source_id);
    if (!src || src.kind !== "rss") continue;
    let regions = tagItem(r.title, r.snippet, src);
    if (src.region_filter && regions.length === 0) regions = [];
    if (regions.length && !relevant(r.title, r.snippet ?? "", regions, src)) regions = [];
    const same = regions.length === r.regions.length && regions.every((x: string) => r.regions.includes(x));
    if (same) continue;
    const { error: ue } = await supabase.from("items").update({ regions }).eq("id", r.id);
    if (!ue) changed++;
  }
  return { checked: rows?.length ?? 0, changed };
}

// Mehrere Quellen gleichzeitig, aber höchstens `n` auf einmal
async function pool<T>(list: T[], n: number, fn: (x: T) => Promise<void>) {
  const queue = [...list];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

Deno.serve(async (req) => {
  const key = req.headers.get("x-ingest-key") ?? "";
  const { data: ok } = await supabase.rpc("check_ingest_key", { k: key });
  if (!ok) return new Response("forbidden", { status: 403 });

  const { data: sources, error } = await supabase.from("sources")
    .select("id,name,feed_url,kind,source_type,language,default_regions,region_filter,last_ok_at,last_fetch_at,last_error,strict,failing_since")
    .eq("active", true).in("kind", ["rss", "gdelt"]); // Messsignale holt die Funktion "signals"
  if (error) return new Response(error.message, { status: 500 });

  const body = await req.json().catch(() => ({}));
  if (body?.retag) return Response.json(await retag(sources as Source[]));

  const summary: Record<string, string> = {};
  const due = (sources as Source[]).filter((s) => {
    if (backoff(s)) { summary[s.id] = "skipped (failing, retry later)"; return false; }
    return true;
  });
  const rss = due.filter((s) => s.kind === "rss");
  const gdelt = due.filter((s) => s.kind === "gdelt");

  await Promise.all([
    pool(rss, 6, async (s) => { summary[s.id] = await runSource(s); }),
    (async () => { // GDELT: eine Abfrage nach der anderen, mit Abstand
      for (const [i, s] of gdelt.entries()) {
        if (i) await sleep(6000);
        summary[s.id] = await runSource(s);
      }
    })(),
  ]);

  // Danach die Meldungen der letzten 72 Stunden neu einordnen: so wirken geänderte Quelleneinstellungen
  // (etwa Standardregionen) spätestens nach einer Stunde auch auf schon gespeicherte Meldungen
  const retagged = await retag(sources as Source[]).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  return Response.json({ ran_at: new Date().toISOString(), summary, retagged });
});
