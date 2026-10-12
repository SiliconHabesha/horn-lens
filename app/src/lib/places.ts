// Orte rund um Eritrea: Lage, Schreibweisen (lateinisch und in Ge'ez-Schrift) und was Semay zu jedem Ort weiß.
// Erwähnungen werden nur über den Ortsnamen in der Schlagzeile gefunden: erwähnt heißt nicht, dass dort etwas geschah.
import { fmtFull, num } from "./de";
import { lang, t } from "./i18n";
import type { Claim, Data, Item } from "./types";

export type Place = {
  id: string;
  name: string;           // Anzeigename in der gewählten Sprache (Getter, siehe unten); deutsch in nameDe
  lat: number; lon: number;
  country: string;        // Land/Gebiet in der gewählten Sprache (Getter); deutsch in countryDe
  nameDe: string; countryDe: string;
  latin: string[];        // Schreibweisen in Schlagzeilen (ganze Wörter)
  geez?: string[];        // Schreibweisen in Tigrinya/Amharisch (Teil eines Wortes genügt)
  weak?: { alias: string[]; ctx: string[] }; // mehrdeutige Namen: zählen nur, wenn die Schlagzeile auch eines der ctx-Wörter enthält
  major: boolean;         // auch auf der ganzen Karte beschriften (sonst erst beim Zoomen)
  left?: boolean;         // Beschriftung links vom Punkt
  dy?: number;            // Beschriftung senkrecht verschieben (Bildschirmpunkte), wenn Namen sich überlappen
};

const LIST: Omit<Place, "nameDe" | "countryDe">[] = [
  { id: "asmara", name: "Asmara", lat: 15.333, lon: 38.933, country: "Eritrea", latin: ["asmara", "asmera"], geez: ["ኣስመራ", "አስመራ"], major: true },
  { id: "massawa", name: "Massawa", lat: 15.609, lon: 39.45, country: "Eritrea", latin: ["massawa", "massaua", "mitsiwa", "mits'iwa"], geez: ["ምጽዋዕ", "ምፅዋ"], major: true, dy: -3 },
  { id: "assab", name: "Assab", lat: 13.009, lon: 42.739, country: "Eritrea", latin: ["aseb"], weak: { alias: ["assab"], ctx: ["eritrea", "eritrean", "port", "ethiopia", "ethiopian", "red sea", "sea access", "airbase", "base", "uae", "emirati", "abiy"] }, geez: ["ዓሰብ", "አሰብ", "ዐሰብ"], major: true, left: true },
  { id: "keren", name: "Keren", lat: 15.778, lon: 38.451, country: "Eritrea", latin: [], weak: { alias: ["keren"], ctx: ["eritrea", "eritrean", "eritreans"] }, geez: ["ከረን"], major: false },
  { id: "mendefera", name: "Mendefera", lat: 14.886, lon: 38.815, country: "Eritrea", latin: ["mendefera"], geez: ["መንደፈራ"], major: false },
  { id: "dekemhare", name: "Dekemhare", lat: 15.07, lon: 39.047, country: "Eritrea", latin: ["dekemhare", "dekamhare"], geez: ["ደቀምሓረ"], major: false },
  { id: "barentu", name: "Barentu", lat: 15.107, lon: 37.592, country: "Eritrea", latin: [], weak: { alias: ["barentu"], ctx: ["eritrea", "eritrean", "gash"] }, geez: ["ባረንቱ"], major: false },
  { id: "agordat", name: "Agordat", lat: 15.548, lon: 37.886, country: "Eritrea", latin: ["agordat", "akordat"], geez: ["ኣቑርደት", "አቁርደት"], major: false },
  { id: "tesseney", name: "Tesseney", lat: 15.11, lon: 36.657, country: "Eritrea", latin: ["tesseney", "teseney", "tessenei"], geez: ["ተሰነይ"], major: true },
  { id: "sawa", name: "Sawa", lat: 15.699, lon: 36.974, country: "Eritrea", latin: [], weak: { alias: ["sawa"], ctx: ["eritrea", "eritrean", "national service", "conscript", "conscripts", "conscription", "military camp", "training"] }, major: true },
  { id: "nakfa", name: "Nakfa", lat: 16.664, lon: 38.476, country: "Eritrea", latin: ["nakfa", "nacfa"], geez: ["ናቕፋ"], major: false },
  { id: "afabet", name: "Afabet", lat: 16.193, lon: 38.69, country: "Eritrea", latin: ["afabet"], geez: ["ኣፍዓበት"], major: false },
  { id: "senafe", name: "Senafe", lat: 14.7, lon: 39.42, country: "Eritrea", latin: ["senafe"], geez: ["ሰንዓፈ"], major: false },
  { id: "badme", name: "Badme", lat: 14.726, lon: 37.803, country: "Grenzgebiet (umstritten)", latin: ["badme"], geez: ["ባድመ"], major: true },
  { id: "zalambessa", name: "Zalambessa", lat: 14.517, lon: 39.383, country: "Äthiopien (Tigray)", latin: ["zalambessa", "zalambesa", "zalanbessa"], geez: ["ዛላምበሳ"], major: false, left: true },
  { id: "bure", name: "Bure", lat: 12.601, lon: 42.27, country: "Äthiopien (Afar)", latin: [], weak: { alias: ["bure"], ctx: ["afar", "assab", "eritrea", "eritrean", "border crossing"] }, major: false, left: true },
  { id: "adigrat", name: "Adigrat", lat: 14.277, lon: 39.462, country: "Äthiopien (Tigray)", latin: ["adigrat"], geez: ["ዓዲግራት", "ዓድግራት"], major: true },
  { id: "axum", name: "Aksum", lat: 14.121, lon: 38.723, country: "Äthiopien (Tigray)", latin: ["axum", "aksum"], geez: ["ኣኽሱም", "አክሱም"], major: false },
  { id: "adwa", name: "Adwa", lat: 14.165, lon: 38.896, country: "Äthiopien (Tigray)", latin: ["adwa", "adowa"], geez: ["ዓድዋ"], major: false },
  { id: "shire", name: "Shire", lat: 14.104, lon: 38.284, country: "Äthiopien (Tigray)", latin: ["inda selassie", "endaselassie", "shire endaselassie"], weak: { alias: ["shire"], ctx: ["tigray", "tigrayan", "ethiopia", "ethiopian", "eritrea", "eritrean", "idp", "idps", "displaced"] }, major: false },
  { id: "mekelle", name: "Mekelle", lat: 13.497, lon: 39.475, country: "Äthiopien (Tigray)", latin: ["mekelle", "mekele", "mek'ele", "makelle", "makale"], geez: ["መቐለ", "መቀሌ"], major: true },
  { id: "humera", name: "Humera", lat: 14.297, lon: 36.617, country: "Äthiopien (West-Tigray/Welkait, umstritten)", latin: ["humera"], geez: ["ሑመራ", "ሁመራ"], major: true },
  { id: "alamata", name: "Alamata", lat: 12.416, lon: 39.554, country: "Äthiopien (Raya, umstritten)", latin: ["alamata"], geez: ["ኣላማጣ", "አላማጣ"], major: true },
  { id: "semera", name: "Semera", lat: 11.792, lon: 41.006, country: "Äthiopien (Afar)", latin: ["semera"], geez: ["ሰመራ"], major: true },
  { id: "babelmandeb", name: "Bab el-Mandeb", lat: 12.583, lon: 43.333, country: "Meerenge", latin: ["bab el-mandeb", "bab al-mandab", "bab-el-mandeb", "bab el mandeb", "bab al-mandeb", "mandeb"], major: true, dy: 11 },
  { id: "mokha", name: "Mokka", lat: 13.32, lon: 43.25, country: "Jemen", latin: ["mokha", "al-mukha", "mukha"], weak: { alias: ["mocha"], ctx: ["yemen", "yemeni", "red sea", "houthi", "houthis", "port", "ship", "vessel"] }, major: true },
  { id: "hodeidah", name: "Hudaida", lat: 14.798, lon: 42.954, country: "Jemen", latin: ["hodeidah", "hudaydah", "hodeida", "hudaida"], major: true },
  { id: "portsudan", name: "Port Sudan", lat: 19.616, lon: 37.216, country: "Sudan", latin: ["port sudan"], major: true },
  { id: "djibouti", name: "Dschibuti", lat: 11.588, lon: 43.145, country: "Dschibuti", latin: ["djibouti", "dschibuti"], geez: ["ጅቡቲ"], major: true },
  // Weiteres Horn von Afrika (seit 13.10.2026): Äthiopien jenseits von Tigray, Somalia mit Somaliland, Ost-Sudan
  { id: "addis", name: "Addis Abeba", lat: 9.03, lon: 38.74, country: "Äthiopien", latin: ["addis ababa", "addis abeba", "finfinne"], geez: ["አዲስ አበባ", "አዲስ ኣበባ", "ኣዲስ ኣበባ"], major: true },
  { id: "gondar", name: "Gondar", lat: 12.6, lon: 37.47, country: "Äthiopien (Amhara)", latin: ["gondar", "gonder"], geez: ["ጎንደር"], major: false },
  { id: "bahirdar", name: "Bahir Dar", lat: 11.59, lon: 37.39, country: "Äthiopien (Amhara)", latin: ["bahir dar", "bahirdar"], geez: ["ባሕር ዳር", "ባህር ዳር"], major: false },
  { id: "lalibela", name: "Lalibela", lat: 12.03, lon: 39.04, country: "Äthiopien (Amhara)", latin: ["lalibela"], geez: ["ላሊበላ"], major: false },
  { id: "woldia", name: "Woldia", lat: 11.83, lon: 39.6, country: "Äthiopien (Amhara)", latin: ["woldia", "weldiya", "woldiya"], geez: ["ወልድያ"], major: false },
  { id: "dessie", name: "Dessie", lat: 11.13, lon: 39.63, country: "Äthiopien (Amhara)", latin: ["dessie", "dese"], geez: ["ደሴ"], major: false },
  { id: "adama", name: "Adama", lat: 8.54, lon: 39.27, country: "Äthiopien (Oromia)", latin: ["nazret"], weak: { alias: ["adama"], ctx: ["ethiopia", "ethiopian", "oromia", "oromo"] }, major: false },
  { id: "jimma", name: "Jimma", lat: 7.67, lon: 36.83, country: "Äthiopien (Oromia)", latin: ["jimma"], major: false },
  { id: "nekemte", name: "Nekemte", lat: 9.08, lon: 36.55, country: "Äthiopien (Oromia)", latin: ["nekemte"], major: false },
  { id: "diredawa", name: "Dire Dawa", lat: 9.6, lon: 41.85, country: "Äthiopien", latin: ["dire dawa"], geez: ["ድሬ ዳዋ"], major: false },
  { id: "jijiga", name: "Jijiga", lat: 9.35, lon: 42.8, country: "Äthiopien (Somali-Region)", latin: ["jijiga", "jigjiga"], major: false },
  { id: "hargeisa", name: "Hargeisa", lat: 9.56, lon: 44.06, country: "Somaliland", latin: ["hargeisa", "hargeysa"], major: true },
  { id: "berbera", name: "Berbera", lat: 10.44, lon: 45.01, country: "Somaliland", latin: ["berbera"], major: false },
  { id: "lasanod", name: "Las Anod", lat: 8.48, lon: 47.36, country: "Somaliland/Somalia (umstritten)", latin: ["las anod", "laascaanood", "lasanod"], major: false },
  { id: "bosaso", name: "Bosaso", lat: 11.28, lon: 49.18, country: "Somalia (Puntland)", latin: ["bosaso", "bosasso", "boosaaso"], major: false },
  { id: "garowe", name: "Garowe", lat: 8.4, lon: 48.48, country: "Somalia (Puntland)", latin: ["garowe"], major: false },
  { id: "mogadishu", name: "Mogadischu", lat: 2.05, lon: 45.32, country: "Somalia", latin: ["mogadishu", "mogadischu", "muqdisho"], geez: ["ሞቃዲሾ", "ሞቓድሾ"], major: true },
  { id: "baidoa", name: "Baidoa", lat: 3.12, lon: 43.65, country: "Somalia", latin: ["baidoa", "baydhabo"], major: false },
  { id: "kismayo", name: "Kismayo", lat: -0.36, lon: 42.55, country: "Somalia", latin: ["kismayo", "kismaayo", "kismaio"], major: false },
  { id: "khartoum", name: "Khartum", lat: 15.5, lon: 32.56, country: "Sudan", latin: ["khartoum", "khartum"], geez: ["ካርቱም"], major: true },
  { id: "omdurman", name: "Omdurman", lat: 15.64, lon: 32.48, country: "Sudan", latin: ["omdurman"], major: false, left: true },
  { id: "kassala", name: "Kassala", lat: 15.45, lon: 36.4, country: "Sudan", latin: ["kassala"], geez: ["ከሰላ"], major: false, left: true },
  { id: "gedaref", name: "Gedaref", lat: 14.03, lon: 35.38, country: "Sudan", latin: ["gedaref", "gedarif", "al qadarif", "al-qadarif"], major: false, left: true },
];

// Ortsnamen auf Englisch und Tigrinya, wo sie vom deutschen Namen bzw. vom ersten Ge'ez-Eintrag abweichen
const NAME_EN: Record<string, string> = { axum: "Axum", mokha: "Mocha", hodeidah: "Hodeidah", djibouti: "Djibouti", addis: "Addis Ababa", mogadishu: "Mogadishu", khartoum: "Khartoum" };
const NAME_TI: Record<string, string> = { sawa: "ሳዋ", bure: "ቡረ", shire: "ሽረ", babelmandeb: "ባብ ኤል ማንደብ", mokha: "ሞካ", hodeidah: "ሑደይዳ", portsudan: "ፖርት ሱዳን",
  jimma: "ጅማ", nekemte: "ነቀምቲ", jijiga: "ጅጅጋ", hargeisa: "ሃርጌሳ", berbera: "በርበራ", lasanod: "ላስ ዓኖድ", bosaso: "ቦሳሶ", garowe: "ጋሮወ", baidoa: "ባይዶዋ", kismayo: "ኪስማዮ",
  omdurman: "ኦምዱርማን", gedaref: "ገዳሪፍ", adama: "ኣዳማ" };
// name und country werden beim Lesen in die gewählte Sprache übersetzt; die Suche (mentions) nutzt nur latin/geez
export const PLACES: Place[] = LIST.map((src) => {
  const p = { ...src, nameDe: src.name, countryDe: src.country } as Place;
  Object.defineProperty(p, "name", { enumerable: true, get: () => {
    const l = lang();
    return l === "de" ? p.nameDe : l === "en" ? NAME_EN[p.id] ?? p.nameDe : NAME_TI[p.id] ?? p.geez?.[0] ?? NAME_EN[p.id] ?? p.nameDe;
  } });
  Object.defineProperty(p, "country", { enumerable: true, get: () => t(p.countryDe) });
  return p;
});
export const placeById = (id: string) => PLACES.find((p) => p.id === id);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const words = (list: string[]) => (list.length ? new RegExp(`(^|[^a-z])(${list.map(esc).join("|")})($|[^a-z])`, "i") : null);
const RX = new Map(PLACES.map((p) => [p.id, { strong: words(p.latin), weak: p.weak ? words(p.weak.alias) : null, ctx: p.weak ? words(p.weak.ctx) : null }]));
const norm = (s: string) => s.replace(/[\u2019`]/g, "'").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
/** Erwähnt der Text diesen Ort? Mehrdeutige Namen (z. B. „Sawa“, „Bure“) nur zusammen mit einem passenden Zusammenhangswort. */
export function mentions(p: Place, text: string) {
  const n = norm(text), r = RX.get(p.id)!;
  if (r.strong?.test(n)) return true;
  if (r.weak?.test(n) && r.ctx?.test(n)) return true;
  return !!p.geez?.some((g) => text.includes(g));
}
/** Alle Orte, die eine Schlagzeile erwähnt */
export const placesIn = (text: string) => PLACES.filter((p) => mentions(p, text));

/** Entfernung in Kilometern (Großkreis) */
export function km(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const RADIUS = { fire: 40, quake: 100, ship: 150, sat: 40 };

/** Alles, was Semay zu einem Ort hat. Nur vorhandene Daten, nichts geschätzt. */
export function dossier(p: Place, data: Data, pool: Item[]) {
  const items = pool.filter((i) => mentions(p, i.title) || (!!i.title_de && mentions(p, i.title_de)));
  // Grobe Vorauswahl über Breiten- und Längengrade, dann genaue Entfernung
  const near = <T extends { lat: number; lon: number }>(list: T[], r: number) => {
    const dLat = r / 111, dLon = r / (111 * Math.cos((p.lat * Math.PI) / 180));
    return list.filter((x) => Math.abs(x.lat - p.lat) <= dLat && Math.abs(x.lon - p.lon) <= dLon)
      .map((x) => ({ x, d: km(p.lat, p.lon, x.lat, x.lon) })).filter((y) => y.d <= r).sort((a, b) => a.d - b.d);
  };
  const fires = near(data.fires, RADIUS.fire);
  const quakes = near(data.quakes, RADIUS.quake);
  const ships = near(data.maritime, RADIUS.ship);
  const sat = near(data.sat.filter((s) => s.images.length), RADIUS.sat);
  const claims: Claim[] = data.claims.filter((c) => mentions(p, `${c.statement} ${c.raw?.statement || ""}`));
  return { items, fires, quakes, ships, sat, claims };
}

/** Nächster bekannter Ort und Entfernung in km (zur Einordnung von Messpunkten) */
export function nearest(lat: number, lon: number) {
  let best = PLACES[0], bd = Infinity;
  for (const p of PLACES) { const d = km(lat, lon, p.lat, p.lon); if (d < bd) { bd = d; best = p; } }
  return { p: best, d: bd };
}

/** „bei Asmara“ oder „etwa 30 km von Asmara“ */
export const nearText = (n: { p: Place; d: number }) =>
  n.d < 8 ? t("bei {place}", { place: n.p.name }) : t("etwa {km} km von {place}", { km: num(Math.round(n.d)), place: n.p.name });

// Eine Zeile für Vorfälle auf See, überall gleich: Zeit · UKMTO · nächster Ort
export const seaMeta = (m: { t: string; lat: number; lon: number; title?: string }, extra?: string) => {
  const n = nearest(m.lat, m.lon);
  // Nennt die Meldung selbst schon einen Ort („25 sm westlich von Mokka“), keinen zweiten danebenstellen
  if (m.title && / von |, /.test(m.title)) return `${fmtFull(m.t)} · UKMTO${extra ? ` · ${extra}` : ""}`;
  return `${fmtFull(m.t)} · UKMTO · ${nearText(n)}${extra ? ` · ${extra}` : ""}`;
};

// ---------------------------------------------------------------- Erwähnte Orte für die Karte
/** Zeitfenster [von, bis] in Millisekunden: Ereignisse außerhalb werden nicht gezeichnet (Hitzepunkte gibt es nur für 24 Stunden) */
export type Range = [number, number];
export const inRange = (t: string | number, r?: Range) => { if (!r) return true; const x = +new Date(t); return x >= r[0] && x <= r[1]; };
export const itemAt = (i: Item) => +new Date(i.published_at || i.fetched_at);
/** Meldungen, die einen Ort nennen, je Ort (Erwähnung, keine Ortung). Meldungen ohne Ortsnamen zählen als „ohne Ort“. */
export type Area = { p: Place; items: Item[] };
const areaMemo = new WeakMap<Data, Map<string, { areas: Area[]; unplaced: number }>>();
export function newsAreas(data: Data, r?: Range): { areas: Area[]; unplaced: number } {
  const key = r ? `${r[0]}-${r[1]}` : "all";
  let m = areaMemo.get(data);
  if (!m) { m = new Map(); areaMemo.set(data, m); }
  const hit = m.get(key);
  if (hit) return hit;
  const by = new Map<string, Area>();
  let unplaced = 0;
  const seen = new Set<string>();
  for (const it of data.items) {
    if (!inRange(itemAt(it), r)) continue;
    const k = it.url;
    if (seen.has(k)) continue;
    seen.add(k);
    const text = `${it.title} ${it.title_en || ""}`;
    const ps = PLACES.filter((p) => mentions(p, text));
    if (!ps.length) { unplaced++; continue; }
    for (const p of ps) { const a = by.get(p.id) || { p, items: [] }; a.items.push(it); by.set(p.id, a); }
  }
  const res = { areas: [...by.values()].sort((a, b) => b.items.length - a.items.length), unplaced };
  m.set(key, res);
  return res;
}
