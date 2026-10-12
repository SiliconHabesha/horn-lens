// Semay – reine Verarbeitungslogik des Nachrichten-Abholers (ohne Netz und Datenbank), damit sie getestet werden kann.
// Tests: tests/ingest (node prepare.mjs && node run.mjs).
import { XMLParser } from "npm:fast-xml-parser@4";

export type Source = {
  id: string; name: string; feed_url: string; kind: "rss" | "gdelt"; source_type: string;
  language: string; default_regions: string[]; region_filter: boolean;
  last_ok_at: string | null; last_fetch_at: string | null; last_error: string | null; strict: boolean;
  failing_since: string | null;
};

export type Item = {
  source_id: string; url: string; title: string; snippet: string | null;
  published_at: string | null; language: string | null; regions: string[];
  origin_domain: string | null;
};

// Stichwörter je Region. Lateinische Wörter zählen nur als ganzes Wort, "=" davor heißt:
// Groß-/Kleinschreibung muss stimmen (z. B. "Shire" die Stadt, nicht "shire"). Bewusst ohne
// "Isaias", "Keren", "Sawa" allein: treffen sonst Hurrikane, Personennamen und andere Orte.
export const REGION_TERMS: Record<string, string[]> = {
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
  // Äthiopische Regionen jenseits von Tigray und Afar: zählen zusätzlich zu "ethiopia"
  amhara: ["amhara", "gondar", "gonder", "bahir dar", "bahirdar", "dessie", "debre markos", "debre tabor", "lalibela", "woldia",
    "=Fano", "fano militia", "አማራ", "ጎንደር", "ባሕር ዳር", "ባህር ዳር", "ደሴ", "ፋኖ"],
  // "OLA"/"OLF" nur groß geschrieben (sonst spanisch "ola" usw.)
  oromia: ["oromia", "oromo", "=OLA", "=OLF", "oromo liberation", "adama", "nekemte", "shashemene", "jimma", "ኦሮሚያ", "ኦሮሞ"],
  // Somalia mit Somaliland und Puntland (die App nennt Somaliland getrennt, wo es im Text steht)
  somalia: ["somalia", "somalian", "somali", "somalis", "mogadishu", "puntland", "jubaland", "galmudug", "hirshabelle", "baidoa",
    "kismayo", "garowe", "bosaso", "al-shabaab", "al shabaab", "alshabaab", "shabaab", "somaliland", "hargeisa", "berbera",
    "las anod", "laascaanood", "ሶማሊያ", "ሶማል", "ሶማሊላንድ", "الصومال"],
  djibouti: ["djibouti", "djiboutian", "ጅቡቲ", "جيبوتي"],
  // "~": nicht "South Sudan". Ohne "RSF" allein (auch Reporter ohne Grenzen)
  sudan: ["~sudan", "~sudanese", "khartoum", "omdurman", "darfur", "el fasher", "el-fasher", "al-fashir", "kordofan", "el obeid",
    "rapid support forces", "al-burhan", "hemedti", "kassala", "gedaref", "ሱዳን", "السودان"],
  // "the Horn" mit großem H meint in diesen Quellen das Horn von Afrika
  horn: ["horn of africa", "=/\\b[Tt]he Horn\\b", "igad"],
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
export function relevant(title: string, snippet: string, regions: string[], src: Source): boolean {
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

export function tagRegions(text: string, defaults: string[]): string[] {
  text = text.replace(/[’‘]/g, "'");
  const out = new Set(defaults);
  for (const [region, rx, rxCase] of REGION_RX) if (rx.test(text) || rxCase?.test(text)) out.add(region);
  if (HOUTHI_RX.test(text) && SEA_RX.test(text)) out.add("red_sea");
  return [...out];
}

// Titel zählt voll. Der Textauszug ergänzt Regionen, aber nicht "Horn" (dort sind es meist nur Aufzählungen),
// und gar nicht bei Sammelsendungen ("In tonight's edition ..."), deren Auszug von anderen Themen handelt.
// Nachbarländer stehen in Auszügen oft nur in Aufzählungen ("Wagner, Sudan, Mali"): dort zählen sie nicht
const SNIPPET_SKIP = new Set(["horn", "sudan", "somalia", "djibouti"]);
const BULLETIN_RX = /^\s*in (tonight's|today's|this) edition\b/i;
export function tagItem(title: string, snippet: string | null, src: Source): string[] {
  const fromTitle = tagRegions(title, src.default_regions);
  const s = (snippet ?? "").replace(/[’‘]/g, "'").replace(/\s*The post .*? (appeared first|first appeared) on .*$/i, "").trim();
  if (!s || BULLETIN_RX.test(s)) return fromTitle;
  return [...new Set([...fromTitle, ...tagRegions(stripDateline(s), []).filter((r) => !SNIPPET_SKIP.has(r))])];
}

const ENTITIES: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", eacute: "é", egrave: "è", ccedil: "ç",
};
export function decodeEntities(s: string): string {
  return s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
// Erst maskierte Tags (&lt;p&gt;) sichtbar machen, dann alle Tags entfernen, dann übrige Zeichen umwandeln
export function stripHtml(s: unknown): string {
  let t = String(s ?? "").replace(/<!\[CDATA\[|\]\]>/g, "");
  t = t.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
  t = t.replace(/<[^>]*>/g, " ");
  return decodeEntities(t).replace(/\s+/g, " ").trim();
}

export function toIso(s: unknown): string | null {
  if (!s) return null;
  const d = new Date(String(s));
  if (isNaN(d.getTime())) return null;
  // Eine Zeit in der Zukunft ist ein Fehler im Feed: dann lieber "nicht angegeben"
  if (d.getTime() > Date.now() + 10 * 60e3) return null;
  return d.toISOString();
}

// Gleiche Meldung, andere Tracking-Parameter: auf eine Adresse bringen
export function cleanUrl(u: string): string {
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
export function detectLanguage(title: string, src: Source): string | null {
  // Nach der Schrift, die im Titel überwiegt: ein englischer Titel mit einem Ge'ez-Hashtag bleibt Englisch
  const count = (rx: RegExp) => (title.match(rx) ?? []).length;
  const geez = count(/[ሀ-፿]/g), arabic = count(/[؀-ۿ]/g), latin = count(/[A-Za-z]/g);
  if (geez > latin && geez >= arabic) return ER_TYPES.has(src.source_type) || src.source_type === "tigray" ? "ti" : "am";
  if (arabic > latin) return "ar";
  return ["mixed", "ti", "am", "ar"].includes(src.language) ? "en" : src.language;
}

// GDELT liefert "20261009T120000Z"
export function gdeltDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
}

// Titel und Beschreibung roh übernehmen: manche Feeds liefern HTML ohne CDATA, das sonst zu Objekten zerfällt
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false,
  stopNodes: ["*.title", "*.description", "*.summary"] });
const text = (v: unknown): unknown => (v && typeof v === "object" ? (v as Record<string, unknown>)["#text"] ?? "" : v);

export function parseRss(xml: string, src: Source): { items: Item[]; found: number } {
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.["rdf:RDF"]?.item ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  if (!doc?.rss && !doc?.feed && !doc?.["rdf:RDF"]) throw new Error("not an RSS or Atom feed");
  const items: Item[] = [];
  let found = 0;
  for (const it of list) {
    if (!it) continue;
    found++;
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
  return { items, found };
}

export function parseGdelt(json: string, src: Source): { items: Item[]; found: number } {
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
  return { items, found: data.articles.length };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Quellen, die seit über einem Tag ablehnen, nur noch alle 6 Stunden fragen (Höflichkeit)
export function backoff(src: Source): boolean {
  if (!src.failing_since || !src.last_fetch_at) return false;
  return Date.now() - Date.parse(src.failing_since) > 24 * 3600e3 && Date.now() - Date.parse(src.last_fetch_at) < 6 * 3600e3;
}

