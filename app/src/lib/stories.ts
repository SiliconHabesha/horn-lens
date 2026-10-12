// Geschichten: Schlagzeilen, die dasselbe Ereignis beschreiben, werden zusammengefasst.
// Nachvollziehbar statt KI: zwei Schlagzeilen gehören zusammen, wenn sie seltene Wörter teilen
// (gewichtet nach Seltenheit im Zeitraum) und höchstens 48 Stunden auseinanderliegen.
// Die gemeinsamen Wörter werden in der App angezeigt, damit jeder die Gruppierung prüfen kann.
import { useData } from "./data";
import type { Data, Item } from "./types";

const urlKey = (u: string) => String(u || "").replace(/[?&](traffic_source|maca|utm_[a-z]+)=[^&#]*/gi, "").replace(/[?&#]+$/, "").replace(/^http:/, "https:");
/** Doppelte Meldungen (gleiche Quelle und Überschrift oder gleicher Link) nur einmal */
export function dedupe(items: Item[]) {
  const seen = new Set<string>();
  return items.filter((it) => {
    const a = `${it.source_id || it.source_name}|${String(it.title).trim().toLowerCase()}`, b = urlKey(it.url);
    if (seen.has(a) || seen.has(b)) return false;
    seen.add(a); seen.add(b);
    return true;
  });
}

const STOP = new Set(("a an the and or but of to in on at by for from with without into onto over under after before as is are was were be been being has have had " +
  "it its this that these those their they them he she his her we our you your who whom which what why how when where than then there here " +
  "says said say tells told amid about against across among between more most less least very not no new also just may might can could will would " +
  "up down off out again still yet even only per via vs one two three four five six seven eight nine ten first last other each both such " +
  "news report reports reported update live video watch photos analysis opinion explainer interview debate debates africanews week weeks day days year years " +
  "der die das und oder ein eine zu im in am mit von für auf nach bei aus le la les des du de et en une pour sur dans aux").split(/\s+/));

const SHORT = new Set(["un", "eu", "au", "uk"]);
// Wortstamm: die ersten 5 Buchstaben ("accuse"/"accusations" → "accus", "capsizes"/"capsize" → "capsi")
const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w);

export function words(title: string): { stem: string; word: string }[] {
  const seen = new Set<string>();
  const out: { stem: string; word: string }[] = [];
  const clean = title.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "").replace(/[’']s\b/g, "").replace(/\{[^}]*\}|\[[^\]]*\]/g, " ");
  for (const raw of clean.split(/[^a-zሀ-፿ء-يٮ-ۓ]+/)) {
    if ((raw.length < 3 && !SHORT.has(raw)) || STOP.has(raw)) continue;
    const s = stem(raw);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push({ stem: s, word: raw });
  }
  return out;
}

export type Story = {
  key: string;
  items: Item[];          // neueste zuerst
  lead: Item;             // Schlagzeile, die oben steht (neueste)
  shared: string[];       // gemeinsame Wörter, die die Gruppe tragen
  sources: number;        // verschiedene Medien
  types: Record<string, number>; // Medien je Quellenart
  first: string; last: string;
  total?: number;         // gesetzt, wenn gefiltert: so viele Meldungen hat die ganze Geschichte
  totalSources?: number;  // und so viele Medien
};

// Zeitpunkt der Meldung; unlesbare Angaben fallen auf den Abrufzeitpunkt zurück
const time = (i: Item) => {
  const a = new Date(i.published_at || "").getTime();
  return Number.isFinite(a) ? a : new Date(i.fetched_at).getTime();
};
const WINDOW = 48 * 3600e3;
const MIN_SIM = 0.3;

/** Gruppiert Schlagzeilen (bereits ohne Dubletten) zu Geschichten. Reihenfolge: neueste Geschichte zuerst. */
export function cluster(items: Item[]): Story[] {
  const docs = items.filter((it) => Number.isFinite(time(it))).map((it) => ({ it, w: words(it.title), t: time(it) }));
  const N = docs.length;
  const df = new Map<string, number>();
  for (const d of docs) for (const x of d.w) df.set(x.stem, (df.get(x.stem) || 0) + 1);
  // Seltenheit: Wörter, die in fast jeder Schlagzeile stehen (z. B. „Eritrea“), zählen wenig
  const idfOf = new Map<string, number>();
  for (const [k, n] of df) idfOf.set(k, Math.log((N + 1) / (n + 0.5)));
  const idf = (s: string) => idfOf.get(s) || 0;
  const common = (s: string) => (df.get(s) || 0) > Math.max(3, N * 0.2);
  const sets = docs.map((d) => new Set(d.w.map((x) => x.stem)));
  const mass = docs.map((d) => d.w.reduce((m, x) => m + idf(x.stem), 0));
  const sim = (i: number, j: number) => {
    let shared = 0, inter = 0, rare = 0;
    for (const s of sets[j]) if (sets[i].has(s)) { inter += idf(s); shared++; if (!common(s)) rare++; }
    if (rare < 2) return 0;
    const v = inter / (mass[i] + mass[j] - inter);
    return v >= MIN_SIM || (shared >= 4 && v >= MIN_SIM * 0.66) ? v : 0;
  };

  // Nur Paare prüfen, die mindestens ein seltenes Wort teilen (Stichwortverzeichnis statt alle gegen alle)
  const index = new Map<string, number[]>();
  docs.forEach((d, i) => { for (const s of sets[i]) if (!common(s)) (index.get(s) || index.set(s, []).get(s)!).push(i); });
  const pairs = new Map<number, number>();
  for (const list of index.values()) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    const key = list[a] * N + list[b];
    pairs.set(key, (pairs.get(key) || 0) + 1);
  }

  // Paare nach Ähnlichkeit, stärkste zuerst. Zwei Gruppen verschmelzen nur, wenn mindestens die Hälfte
  // aller Paare zwischen ihnen ähnlich ist (verhindert lange Ketten aus jeweils nur ähnlichen Nachbarn).
  const edges: [number, number, number][] = [];
  const near = new Map<number, Set<number>>();
  for (const [key, n] of pairs) {
    if (n < 2) continue;
    const i = Math.floor(key / N), j = key % N;
    if (Math.abs(docs[i].t - docs[j].t) > WINDOW) continue;
    const s = sim(i, j);
    if (!s) continue;
    edges.push([s, i, j]);
    (near.get(i) || near.set(i, new Set()).get(i)!).add(j);
    (near.get(j) || near.set(j, new Set()).get(j)!).add(i);
  }
  edges.sort((x, y) => y[0] - x[0]);
  const of = docs.map((_, i) => i);
  const members = new Map<number, number[]>(docs.map((_, i) => [i, [i]]));
  for (const [, i, j] of edges) {
    const a = of[i], b = of[j];
    if (a === b) continue;
    const A = members.get(a)!, B = members.get(b)!;
    let hits = 0;
    for (const x of A) for (const y of B) if (near.get(x)?.has(y)) hits++;
    if (hits * 2 < A.length * B.length) continue;
    for (const y of B) { of[y] = a; A.push(y); }
    members.delete(b);
  }
  const groups = [...members.values()];

  return groups.map((g) => build(g.map((i) => docs[i]), idf)).sort((a, b) => (a.last < b.last ? 1 : -1));
}

type Doc = { it: Item; w: { stem: string; word: string }[]; t: number };
function build(docs: Doc[], idf: (s: string) => number): Story {
  {
    const its = [...docs].sort((a, b) => b.t - a.t);
    const count = new Map<string, { n: number; word: string }>();
    for (const d of its) for (const x of d.w) { const c = count.get(x.stem); count.set(x.stem, { n: (c?.n || 0) + 1, word: c?.word || x.word }); }
    const need = Math.max(2, Math.ceil(its.length / 2));
    const shared = its.length < 2 ? [] : [...count.entries()].filter(([, c]) => c.n >= need)
      .sort((a, b) => b[1].n - a[1].n || idf(b[0]) - idf(a[0])).slice(0, 5).map(([, c]) => c.word);
    const bySource = new Map<string, string>();
    for (const d of its) bySource.set(d.it.origin_domain || d.it.source_name, d.it.source_type);
    const types: Record<string, number> = {};
    for (const ty of bySource.values()) types[ty] = (types[ty] || 0) + 1;
    return {
      key: `s${its[its.length - 1].it.id}`,
      items: its.map((d) => d.it), lead: its[0].it, shared, sources: bySource.size, types,
      first: new Date(its[its.length - 1].t).toISOString(), last: new Date(its[0].t).toISOString(),
    };
  }
}

/** Dieselbe Geschichte, beschränkt auf die Meldungen, die zu den Filtern passen (Zahlen und Kopf stimmen dann mit dem Filter überein) */
export function narrow(s: Story, keep: (it: Item) => boolean): Story | null {
  const its = s.items.filter(keep);
  if (!its.length) return null;
  if (its.length === s.items.length) return s;
  const shared = new Set(s.shared);
  const r = build(its.map((it) => ({ it, w: words(it.title), t: time(it) })), (x) => (shared.has(x) ? 1 : 0));
  return { ...r, key: s.key, shared: s.shared, total: s.items.length, totalSources: s.sources };
}

// ---------------------------------------------------------------- Für die Bildschirme

/** Meldungen, die die App zeigt (alle der letzten 7 Tage, für alle Leser gleich) */
export const poolOf = (data: Data) => data.items;

const memo = new WeakMap<Data, Story[]>();
/** Alle Geschichten der letzten 7 Tage. Einmal je Datenstand berechnet. */
export function storiesOf(data: Data): Story[] {
  let s = memo.get(data);
  if (!s) {
    s = cluster(dedupe(poolOf(data)));
    memo.set(data, s);
  }
  return s;
}
export function useStories() {
  const { data } = useData();
  return data ? storiesOf(data) : [];
}
/** Quellenarten, die in Semay eine Konfliktseite oder Außensicht vertreten: wer hat noch nicht berichtet? */
export const VOICE_TYPES = ["government_er", "progov_er", "exile", "government_et", "progov_et", "ethiopian_independent", "tigray", "international", "un_ngo"];
/** Geschichten, bei denen die Frage „wer hat noch nicht berichtet?“ sinnvoll ist: es geht um Eritrea, Äthiopien oder Tigray */
export const conflictStory = (items: Item[]) => items.some((i) => i.regions.some((r) => r === "eritrea" || r === "tigray" || r === "ethiopia" || r === "afar"));

/** Seiten, die über eine Geschichte berichten, in fester Reihenfolge, mit Zahl der Medien je Seite */
export function sidesOf(items: Item[]): { type: string; media: number }[] {
  const by = new Map<string, Set<string>>();
  for (const i of items) (by.get(i.source_type) || by.set(i.source_type, new Set()).get(i.source_type)!).add(i.origin_domain || i.source_name);
  return [...by.entries()].map(([type, m]) => ({ type, media: m.size }));
}

/** Meldungen, die zu einem Text (z. B. einer Behauptung) passen könnten: mindestens zwei gemeinsame seltene Wörter. Stärkste zuerst. */
export function related(text: string, data: Data, limit = 5): { it: Item; shared: string[] }[] {
  const pool = dedupe(poolOf(data));
  const N = pool.length;
  if (!N) return [];
  const docs = pool.map((it) => ({ it, w: words(it.title) }));
  const df = new Map<string, number>();
  for (const d of docs) for (const x of d.w) df.set(x.stem, (df.get(x.stem) || 0) + 1);
  const q = words(text);
  const out: { it: Item; shared: string[]; score: number }[] = [];
  for (const d of docs) {
    const S = new Map(d.w.map((x) => [x.stem, x.word]));
    let score = 0;
    const shared: string[] = [];
    for (const x of q) {
      const n = df.get(x.stem) || 0;
      if (!S.has(x.stem) || n > Math.max(3, N * 0.2)) continue;
      score += Math.log((N + 1) / (n + 0.5));
      shared.push(S.get(x.stem)!);
    }
    if (shared.length >= 2) out.push({ it: d.it, shared, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
