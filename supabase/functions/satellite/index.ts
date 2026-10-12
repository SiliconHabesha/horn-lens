// Semay – Satellitenbilder
// Holt wolkenfreie Sentinel-2-Ausschnitte (10 m) für feste Orte über den kostenlosen
// Microsoft Planetary Computer (kein Konto nötig). Jedes Bild bekommt das echte
// Aufnahmedatum des Satelliten. Bewölkung wird für genau den Ausschnitt gemessen
// (Szenenklassifikation SCL), nicht für die ganze 110-km-Kachel.
// Zugang nur mit internem Schlüssel (Header x-ingest-key), daher verify_jwt=false.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const PC = "https://planetarycomputer.microsoft.com/api";
const UA = { "User-Agent": "HornLens/0.4 (situation monitor; powered by BELES; beles.app)" };

const MAX_CLOUD = 3;      // % Wolken/Schatten im Ausschnitt
const MIN_VALID = 99.5;   // % des Ausschnitts muss Bilddaten haben (kein Kachelrand)
const RECENT_DAYS = 40;   // alle klaren Aufnahmen dieser Tage werden gezeigt
const MONTHS_BACK = 24;   // davor: die klarste Aufnahme je Monat
const FIRST_YEAR = 2018;  // davor: je Jahr die klarste Aufnahme im Oktober
const TIME_BUDGET_MS = 110_000;
const MAX_NEW_PER_RUN = 12;     // Rechenzeit-Grenze der Edge-Funktion nicht reißen (bei 18 einmal überschritten)
const RECENT_KEEP_DAYS = 75;    // so lange bleiben alle klaren Aufnahmen; danach eine je Monat

type Place = { id: string; name: string; lat: number; lon: number; half_km: number };
type Win = { place: Place; key: string; kind: "recent" | "monthly" | "yearly"; from: string; to: string };

function bboxOf(p: Place): [number, number, number, number] {
  const dLat = p.half_km / 110.574;
  const dLon = p.half_km / (111.32 * Math.cos((p.lat * Math.PI) / 180));
  const r = (n: number) => Math.round(n * 1e5) / 1e5;
  return [r(p.lon - dLon), r(p.lat - dLat), r(p.lon + dLon), r(p.lat + dLat)];
}
const sizeOf = (p: Place) => Math.min(900, Math.round((p.half_km * 2 * 1000) / 10)); // ca. 10 m je Pixel

async function pc(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${PC}${path}`, { ...init, headers: { ...UA, ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path.split("?")[0].slice(0, 60)}`);
  return res;
}

async function search(bbox: number[], from: string, to: string, byCloud: boolean) {
  const body = {
    collections: ["sentinel-2-l2a"], bbox, datetime: `${from}/${to}`, limit: byCloud ? 10 : 25,
    query: { "eo:cloud_cover": { lt: 40 } },
    sortby: [{ field: byCloud ? "eo:cloud_cover" : "datetime", direction: byCloud ? "asc" : "desc" }],
  };
  const j = await (await pc("/stac/v1/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
  return (j.features ?? []) as any[];
}

// Wolken und Abdeckung im Ausschnitt aus der Szenenklassifikation (SCL)
async function sceneCheck(itemId: string, bbox: number[]) {
  const [w, s, e, n] = bbox;
  const feat = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } };
  const j = await (await pc(`/data/v1/item/statistics?collection=sentinel-2-l2a&item=${encodeURIComponent(itemId)}&assets=SCL&categorical=true&max_size=256`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(feat),
  })).json();
  const st = j?.properties?.statistics?.SCL_b1;
  if (!st) throw new Error("no SCL statistics");
  const [counts, values] = st.histogram as [number[], number[]];
  let total = 0, cloud = 0, nodata = 0;
  values.forEach((v, i) => {
    total += counts[i];
    if (v === 0) nodata += counts[i];
    if ([3, 8, 9, 10].includes(v)) cloud += counts[i]; // Schatten, Wolken mittel/hoch, Zirrus
  });
  const valid = Math.min(Number(st.valid_percent ?? 100), total ? 100 * (1 - nodata / total) : 0);
  const cloudPct = total - nodata > 0 ? (100 * cloud) / (total - nodata) : 100;
  return { cloud: Math.round(cloudPct * 10) / 10, valid: Math.round(valid * 10) / 10 };
}

async function render(itemId: string, bbox: number[], size: number) {
  const res = await pc(`/data/v1/item/bbox/${bbox.join(",")}/${size}x${size}.webp?collection=sentinel-2-l2a&item=${encodeURIComponent(itemId)}&assets=visual&asset_bidx=visual%7C1,2,3&nodata=0`);
  return new Uint8Array(await res.arrayBuffer());
}
// Base64 über die eingebaute Funktion: schnell und halb so groß wie Hex
function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function windows(places: Place[], done: Set<string>): Win[] {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 19) + "Z";
  const out: Win[] = [];
  for (const place of places) {
    out.push({ place, key: "recent", kind: "recent", from: iso(new Date(now.getTime() - RECENT_DAYS * 864e5)), to: iso(now) });
  }
  for (let m = 1; m <= MONTHS_BACK; m++) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m + 1, 1) - 1000);
    const key = `m:${start.toISOString().slice(0, 7)}`;
    for (const place of places) if (!done.has(`${place.id}|${key}`)) out.push({ place, key, kind: "monthly", from: iso(start), to: iso(end) });
  }
  const lastYear = now.getUTCFullYear() - 3; // jüngere Jahre decken die Monatsfenster ab
  for (let y = lastYear; y >= FIRST_YEAR; y--) {
    const key = `y:${y}-10`;
    for (const place of places) if (!done.has(`${place.id}|${key}`)) {
      out.push({ place, key, kind: "yearly", from: `${y}-10-01T00:00:00Z`, to: `${y}-10-31T23:59:59Z` });
    }
  }
  return out;
}

Deno.serve(async (req) => {
  const { data: ok } = await supabase.rpc("check_ingest_key", { k: req.headers.get("x-ingest-key") ?? "" });
  if (!ok) return new Response("forbidden", { status: 403 });
  const started = Date.now();
  const nowIso = new Date().toISOString();
  const log: string[] = [];
  let added = 0, errors = 0;

  try {
    const { data: places, error: pe } = await supabase.from("sat_places").select("id,name,lat,lon,half_km").eq("active", true).order("sort");
    if (pe) throw new Error(pe.message);
    const { data: state, error: se } = await supabase.rpc("sat_state");
    if (se) throw new Error(se.message);
    const checked = new Set<string>(state.checked);
    const done = new Set<string>(state.windows);
    // Alle vorhandenen Bilder kennen (die Schnittstelle liefert höchstens 1000 Zeilen je Abfrage)
    const have: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: page, error: he } = await supabase.from("sat_images").select("place_id,item_id,captured_at,kind,cloud_pct").order("id").range(from, from + 999);
      if (he) throw new Error(he.message);
      have.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    const stored = new Set(have.map((r: any) => `${r.place_id}|${r.item_id}`));
    // je Ort und Tag: welches Bild, welcher Art (für das Hochstufen unten). Dieselben Objekte wie in "have",
    // damit ein hochgestuftes Bild beim Aufräumen am Ende nicht als "aktuell" gilt
    const storedDays = new Map<string, any>(have.map((r: any) => [`${r.place_id}|${String(r.captured_at).slice(0, 10)}`, r]));

    for (const w of windows(places as Place[], done)) {
      if (Date.now() - started > TIME_BUDGET_MS || added >= MAX_NEW_PER_RUN) { log.push("budget reached, continuing next run"); break; }
      const bbox = bboxOf(w.place);
      const newChecks: any[] = [];
      let found = false, complete = true;
      try {
        const items = await search(bbox, w.from, w.to, w.kind !== "recent");
        for (const it of items) {
          if (Date.now() - started > TIME_BUDGET_MS || added >= MAX_NEW_PER_RUN) { complete = false; break; }
          const id = it.id as string;
          const day = String(it.properties.datetime).slice(0, 10);
          const k = `${w.place.id}|${id}`;
          const sameDay = storedDays.get(`${w.place.id}|${day}`);
          if (stored.has(k) || sameDay) {
            found = true;
            if (w.kind === "recent") continue;
            // Ein vorhandenes "aktuelles" Bild vertritt diesen Monat: hochstufen, damit es nicht nach 75 Tagen gelöscht wird
            if (sameDay && sameDay.kind === "recent") {
              await supabase.from("sat_images").update({ kind: w.kind }).eq("place_id", w.place.id).eq("item_id", sameDay.item_id);
              sameDay.kind = w.kind;
            }
            break;
          }
          if (checked.has(k)) continue;
          const c = await sceneCheck(id, bbox);
          const good = c.valid >= MIN_VALID && c.cloud <= MAX_CLOUD;
          newChecks.push({ place_id: w.place.id, item_id: id, cloud_pct: c.cloud, valid_pct: c.valid, ok: good });
          checked.add(k);
          if (!good) continue;
          const size = sizeOf(w.place);
          const img = await render(id, bbox, size);
          const { error } = await supabase.rpc("sat_insert", { p: {
            place_id: w.place.id, item_id: id, captured_at: it.properties.datetime,
            platform: /^S2([A-D])_/.test(id) ? `Sentinel-2${id[2]}` : "Sentinel-2",
            tile: it.properties["s2:mgrs_tile"] ?? null, cloud_pct: c.cloud, valid_pct: c.valid,
            width: size, height: size, mime: "image/webp", bytes: img.length, b64: b64(img), kind: w.kind,
          } });
          if (error) throw new Error(error.message);
          stored.add(k); storedDays.set(`${w.place.id}|${day}`, { place_id: w.place.id, item_id: id, captured_at: it.properties.datetime, kind: w.kind, cloud_pct: c.cloud });
          added++; found = true;
          log.push(`${w.place.id} ${day} ${w.kind} cloud ${c.cloud}%`);
          if (w.kind !== "recent") break;
        }
      } catch (e) {
        errors++; complete = false;
        log.push(`${w.place.id} ${w.key}: ${e instanceof Error ? e.message : String(e)}`);
      }
      // Vergangene Fenster nur abhaken, wenn sie vollständig geprüft wurden
      const winMark = w.kind !== "recent" && complete ? [{ place_id: w.place.id, window_key: w.key, found }] : [];
      if (newChecks.length || winMark.length) await supabase.rpc("sat_mark", { p_checked: newChecks, p_windows: winMark });
    }

    // Aktuelle Aufnahmen älter als 75 Tage aufräumen. Hat ihr Monat noch kein Monats- oder Jahresbild
    // (etwa weil die Monatssuche nur Wolken fand), bleibt die klarste davon als Monatsbild: so entsteht keine Lücke.
    const cutoff = Date.now() - RECENT_KEEP_DAYS * 864e5;
    const month = (r: any) => `${r.place_id}|${String(r.captured_at).slice(0, 7)}`;
    const covered = new Set(have.filter((r: any) => r.kind !== "recent").map(month));
    const old = new Map<string, any[]>();
    for (const r of have) {
      if (r.kind !== "recent" || Date.parse(r.captured_at) >= cutoff) continue;
      old.set(month(r), [...(old.get(month(r)) ?? []), r]);
    }
    for (const [m, rows] of old) {
      let drop = rows;
      if (!covered.has(m)) {
        rows.sort((a, b) => a.cloud_pct - b.cloud_pct || String(b.captured_at).localeCompare(String(a.captured_at)));
        const keep = rows[0];
        const { error } = await supabase.from("sat_images").update({ kind: "monthly" }).eq("place_id", keep.place_id).eq("item_id", keep.item_id);
        if (error) { log.push(`keep ${keep.place_id} ${m}: ${error.message}`); continue; }
        keep.kind = "monthly"; covered.add(m);
        log.push(`${keep.place_id} ${String(keep.captured_at).slice(0, 10)} kept as monthly`);
        drop = rows.slice(1);
      }
      for (const r of drop) {
        const { error } = await supabase.from("sat_images").delete().eq("place_id", r.place_id).eq("item_id", r.item_id).eq("kind", "recent");
        if (error) log.push(`delete ${r.place_id} ${r.item_id}: ${error.message}`);
      }
    }

    const msg = errors ? `${added} new, ${errors} errors: ${log.filter((l) => l.includes(":")).slice(0, 3).join("; ")}` : null;
    await supabase.from("sources").update({ last_fetch_at: nowIso, ...(errors && !added ? {} : { last_ok_at: nowIso }), last_error: msg?.slice(0, 300) ?? null, last_item_count: added }).eq("id", "sentinel2");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("sources").update({ last_fetch_at: nowIso, last_error: msg.slice(0, 300) }).eq("id", "sentinel2");
    return Response.json({ error: msg, log }, { status: 500 });
  }
  return Response.json({ ran_at: nowIso, added, errors, seconds: Math.round((Date.now() - started) / 1000), log });
});
