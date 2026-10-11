// Horn Lens – Abholer für Nachrichten
// Holt alle aktiven Quellen ab, ordnet Meldungen Regionen zu und speichert Titel, Link und Zeit.
// Erfindet nichts: Was die Quelle nicht liefert, bleibt leer.
// Zugang nur mit internem Schlüssel (Header x-ingest-key), daher verify_jwt=false.

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Source = {
  id: string; name: string; feed_url: string; kind: "rss" | "gdelt"; source_type: string;
  language: string; default_regions: string[]; region_filter: boolean;
  last_ok_at: string | null; last_fetch_at: string | null; last_error: string | null; strict: boolean;
  failing_since: string | null;
};

type Item = {
  source_id: string; url: string; title: string; snippet: string | null;
  published_at: string | null; language: string | null; regions: string[];
  origin_domain: string | null;
};

// Stichwörter je Region. Lateinische Wörter zählen nur als ganzes Wort, "=" davor heißt:
// Groß-/Kleinschreibung muss stimmen (z. B. "Shire" die Stadt, nicht "shire"). Bewusst ohne
// "Isaias", "Keren", "Sawa" allein: treffen sonst Hurrikane, Personennamen und andere Orte.
const REGION_TERMS: Record<string, string[]> = {
  eritrea: ["eritrea", "eritrean", "eritreans", "asmara", "massawa", "assab", "afwerki", "afewerki",
    "isaias afwerki", "yemane gebremeskel", "yemane meskel", "pfdj", "badme", "zalambessa", "tesseney",
    "om hajer", "omhajer", "senafe", "tsorona", "dahlak",
    "ኤርትራ", "ኣስመራ", "አስመራ", "ምጽዋዕ", "ምጽዋ", "ምፅዋ", "ዓሰብ", "አሰብ", "ህግደፍ",
    "إريتريا", "إرتريا", "أريتريا", "ارتريا", "أسمرا", "مصوع"],
  // "Shire" ist auch ein Fluss und ein Hochland in Malawi
  tigray: ["tigray", "tigrayan", "tigrayans", "mekelle", "mekele", "adigrat", "=/\\bShire\\b(?!\\s+(?:River|Highlands|Valley))",
    "humera", "alamata", "idaga hamus", "tplf", "tigray peace force",
    "ትግራይ", "መቐለ", "መቀሌ", "መቐሌ", "ህወሓት", "تيغراي"],
  // "Afar" allein nur groß geschrieben und nicht in der Redewendung "From Afar" (Titelschreibweise);
  // "withdraw from Afar" zählt. Bure gibt es auch in Amhara, daher nicht
  afar: ["afar region", "afar's", "in afar", "afar regional", "afar state", "semera", "afdera", "erta ale", "dallol",
    "abala", "erebti", "logia", "asayita", "asaita", "chifra", "berahle", "danakil",
    "=/(?<!\\bFrom\\s)\\bAfar\\b", "ዓፋር", "ዐፋር", "አፋር"],
  // Huthi-Meldungen zählen nur mit Bezug zur See (siehe tagRegions)
  red_sea: ["red sea", "/\\bbab[\\s-](?:el|al)[\\s-]mand[ae]b\\b", "hodeidah", "mokha", "port sudan", "gulf of aden", "perim", "hanish",
    "ቀይሕ ባሕሪ", "ቀይ ባሕር", "البحر الأحمر", "باب المندب"],
  ethiopia: ["ethiopia", "ethiopian", "ethiopians", "addis ababa", "abiy", "amhara", "oromia", "endf",
    "=Fano", "ኢትዮጵያ", "إثيوبيا"],
  // "the Horn" mit großem H meint in diesen Quellen das Horn von Afrika
  horn: ["horn of africa", "=/\\b[Tt]he Horn\\b", "djibouti", "somalia", "somaliland", "somali", "somalis", "~sudan", "igad"],
};

const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const REGION_RX: Array<[string, RegExp, RegExp | null]> = Object.entries(REGION_TERMS).map(([region, terms]) => {
  const ci = terms.filter((w) => !w.startsWith("="));
  const cs = terms.filter((w) => w.startsWith("=")).map((w) => w.slice(1));
  // "/..." ist ein fertiger regulärer Ausdruck, "~" schließt "South Sudan" aus
  const part = (w: string) => w.startsWith("/") ? w.slice(1)
    : w.startsWith("~") ? `(?<!south[\\s-])\\b${esc(w.slice(1))}\\b`
    : /^[\x00-\x7F]+$/.test(w) ? `\\b${esc(w)}\\b` : esc(w);
  return [region, new RegExp(ci.map(part).join("|"), "i"), cs.length ? new RegExp(cs.map(part).join("|")) : null];
});

// Für "strenge" Quellen (Inlandsmedien mit viel Lokalnachrichten): nur behalten, was eine
// Kernregion betrifft oder erkennbar mit Konflikt, Grenze oder Krise zu tun hat
const CORE = new Set(["eritrea", "tigray", "afar", "red_sea"]);
const CONFLICT_RX = /\b(war|conflict|troops?|army|military|soldiers?|drones?|attacks?|strikes?|killed|clash(es)?|fighting|ceasefire|peace|refugees?|displaced|humanitarian|famine|aid|border|sovereignty|invasion|militia|fano|endf|tplf|tpf|mobili[sz]ation|curfew|shutdown|blackout|arrests?|detained|cabinet|reshuffle)\b/i;
// Links auf Zeitungsausgaben ("Haddas Ertra 9 October 2026") sind keine Meldungen
const EPAPER_RX = /^(Eritrea Alhaditha|Haddas Ertra|Eritrea Profile)\s+\d{1,2}\s+\w+\s+\d{4}$/i;
function relevant(title: string, snippet: string, regions: string[], src: Source): boolean {
  if (EPAPER_RX.test(title.trim())) return false;
  if (!src.strict) return true;
  if (regions.some((r) => CORE.has(r))) return true;
  return CONFLICT_RX.test(title);
}

// Ortsmarke am Anfang einer Meldung ("Addis Ababa, October 9 (FMC) –") nicht als Inhalt werten
function stripDateline(s: string): string {
  return s.replace(/^\s*[A-Z][A-Za-z .'’-]{2,40},?\s*(?:\(?[A-Z][A-Za-z.]*\)?\s*)?(?:[A-Z][a-z]+\.?\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\s+[A-Z][a-z]+(?:\s+\d{4})?)?\s*(?:\([^)]{1,30}\))?\s*[-–—:]\s+/, "");
}

const HOUTHI_RX = /\bhouthis?\b/i;
const SEA_RX = /\b(ships?|shipping|vessels?|tankers?|freighters?|cargo|maritime|naval|navy|strait|ports?|coast(al)?|seas?|merchant|container|destroyers?|warships?|frigates?|carriers?|ferr(y|ies)|boats?)\b/i;

function tagRegions(text: string, defaults: string[]): string[] {
  text = text.replace(/[’‘]/g, "'");
  const out = new Set(defaults);
  for (const [region, rx, rxCase] of REGION_RX) if (rx.test(text) || rxCase?.test(text)) out.add(region);
  if (HOUTHI_RX.test(text) && SEA_RX.test(text)) out.add("red_sea");
  return [...out];
}

// Titel zählt voll. Der Textauszug ergänzt Regionen, aber nicht "Horn" (dort sind es meist nur Aufzählungen),
// und gar nicht bei Sammelsendungen ("In tonight's edition ..."), deren Auszug von anderen Themen handelt.
const BULLETIN_RX = /^\s*in (tonight's|today's|this) edition\b/i;
function tagItem(title: string, snippet: string | null, src: Source): string[] {
  const fromTitle = tagRegions(title, src.default_regions);
  const s = (snippet ?? "").replace(/[’‘]/g, "'").replace(/\s*The post .*? (appeared first|first appeared) on .*$/i, "").trim();
  if (!s || BULLETIN_RX.test(s)) return fromTitle;
  return [...new Set([...fromTitle, ...tagRegions(stripDateline(s), []).filter((r) => r !== "horn")])];
}

const ENTITIES: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", eacute: "é", egrave: "è", ccedil: "ç",
};
function decodeEntities(s: string): string {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
// Erst maskierte Tags (&lt;p&gt;) sichtbar machen, dann alle Tags entfernen, dann übrige Zeichen umwandeln
function stripHtml(s: unknown): string {
  let t = String(s ?? "").replace(/<!\[CDATA\[|\]\]>/g, "");
  t = t.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
  t = t.replace(/<[^>]*>/g, " ");
  return decodeEntities(t).replace(/\s+/g, " ").trim();
}

function toIso(s: unknown): string | null {
  if (!s) return null;
  const d = new Date(String(s));
  if (isNaN(d.getTime())) return null;
  // Eine Zeit in der Zukunft ist ein Fehler im Feed: dann lieber "nicht angegeben"
  if (d.getTime() > Date.now() + 10 * 60e3) return null;
  return d.toISOString();
}

// Gleiche Meldung, andere Tracking-Parameter: auf eine Adresse bringen
function cleanUrl(u: string): string {
  try {
    const url = new URL(u.trim());
    url.hash = "";
    for (const k of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ocid|cmpid|at_|traffic_source$|maca$)/i.test(k)) url.searchParams.delete(k);
    }
    return url.toString();
  } catch { return u.trim(); }
}

// Sprache aus der Schrift ableiten; Ge'ez ist bei eritreischen Quellen meist Tigrinya, bei äthiopischen Amharisch
const ER_TYPES = new Set(["government_er", "exile", "progov_er"]);
function detectLanguage(title: string, src: Source): string | null {
  // Nach der Schrift, die im Titel überwiegt: ein englischer Titel mit einem Ge'ez-Hashtag bleibt Englisch
  const count = (rx: RegExp) => (title.match(rx) ?? []).length;
  const geez = count(/[ሀ-፿]/g), arabic = count(/[؀-ۿ]/g), latin = count(/[A-Za-z]/g);
  if (geez > latin && geez >= arabic) return ER_TYPES.has(src.source_type) || src.source_type === "tigray" ? "ti" : "am";
  if (arabic > latin) return "ar";
  return ["mixed", "ti", "am", "ar"].includes(src.language) ? "en" : src.language;
}

// GDELT liefert "20261009T120000Z"
function gdeltDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "HornLens/0.5 (news monitor; powered by BELES; beles.app)", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Titel und Beschreibung roh übernehmen: manche Feeds liefern HTML ohne CDATA, das sonst zu Objekten zerfällt
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false,
  stopNodes: ["*.title", "*.description", "*.summary"] });
const text = (v: unknown): unknown => (v && typeof v === "object" ? (v as Record<string, unknown>)["#text"] ?? "" : v);

function parseRss(xml: string, src: Source): Item[] {
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.["rdf:RDF"]?.item ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  if (!doc?.rss && !doc?.feed && !doc?.["rdf:RDF"]) throw new Error("not an RSS or Atom feed");
  const items: Item[] = [];
  for (const it of list) {
    if (!it) continue;
    const title = stripHtml(text(it.title));
    let link: unknown = it.link;
    if (Array.isArray(link)) {
      const pick = link.find((l: any) => l?.["@_rel"] === "alternate") ?? link.find((l: any) => typeof l === "string" || !l?.["@_rel"]) ?? link[0];
      link = typeof pick === "string" ? pick : pick?.["@_href"];
    }
    else if (link && typeof link === "object") link = (link as any)["@_href"] ?? (link as any)["#text"];
    // Ohne Entitäten-Verarbeitung des Parsers (sonst scheitern große Feeds) hier selbst "&amp;" usw. auflösen
    const url = decodeEntities(String(link ?? it.guid?.["#text"] ?? it.guid ?? "")).trim();
    if (!title || !url.startsWith("http")) continue;
    const snippet = stripHtml(text(it.description ?? it.summary ?? "")).slice(0, 400) || null;
    const regions = tagItem(title, snippet, src);
    if (src.region_filter && regions.length === 0) continue;
    if (!relevant(title, snippet ?? "", regions, src)) continue;
    items.push({
      source_id: src.id, url: cleanUrl(url), title, snippet,
      published_at: toIso(it.pubDate ?? it.published ?? it.updated ?? it["dc:date"]),
      language: detectLanguage(title, src),
      regions, origin_domain: null,
    });
  }
  return items;
}

function parseGdelt(json: string, src: Source): Item[] {
  let data: { articles?: Array<Record<string, string>> };
  try { data = JSON.parse(json); } catch { throw new Error(`GDELT: ${json.slice(0, 120)}`); }
  // Ohne Artikelliste ist das Ergebnis nicht "keine Meldungen", sondern unklar (oft Drosselung)
  if (!Array.isArray(data.articles)) throw new Error("GDELT returned no article list (likely rate-limited)");
  const items: Item[] = [];
  for (const a of data.articles) {
    if (!a.url || !a.title) continue;
    const title = stripHtml(a.title);
    const regions = tagRegions(title, src.default_regions);
    if (src.region_filter && regions.length === 0) continue;
    items.push({
      source_id: src.id, url: cleanUrl(a.url), title, snippet: null,
      published_at: gdeltDate(a.seendate), // Zeitpunkt, an dem GDELT den Artikel gesehen hat
      language: detectLanguage(title, { ...src, language: "en" }), regions, origin_domain: a.domain ?? null,
    });
  }
  return items;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Quellen, die seit über einem Tag ablehnen, nur noch alle 6 Stunden fragen (Höflichkeit)
function backoff(src: Source): boolean {
  if (!src.failing_since || !src.last_fetch_at) return false;
  return Date.now() - Date.parse(src.failing_since) > 24 * 3600e3 && Date.now() - Date.parse(src.last_fetch_at) < 6 * 3600e3;
}

async function runSource(src: Source): Promise<string> {
  const now = new Date().toISOString();
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
    const items = [...new Map(parsed.map((i) => [i.url, i])).values()];
    if (items.length) {
      const { error: insErr } = await supabase.from("items").upsert(items, { onConflict: "url", ignoreDuplicates: true });
      if (insErr) throw new Error(insErr.message);
    }
    await supabase.from("sources").update({ last_fetch_at: now, last_ok_at: now, last_error: null, failing_since: null, last_item_count: items.length })
      .eq("id", src.id);
    return `ok (${items.length})`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("sources").update({ last_fetch_at: now, last_error: msg.slice(0, 300), failing_since: src.failing_since ?? now })
      .eq("id", src.id);
    return `error: ${msg}`;
  }
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
