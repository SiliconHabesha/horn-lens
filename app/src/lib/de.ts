// Deutsche Anzeige: Bezeichnungen, Formate und Übersetzung der englischen Datenbank-Texte.
// Öffentliche Texte stecken in der App (src/data/de_public.json), private kommen nach der Anmeldung aus der Datenbank.
import DE_PUBLIC from "../data/de_public.json";

export const TYPES: Record<string, string> = {
  government_er: "Regierung Eritreas",
  progov_er: "Regierungsnahe Medien Eritreas",
  exile: "Eritreische Exilmedien",
  government_et: "Regierung Äthiopiens",
  progov_et: "Regierungsnahe Medien Äthiopiens",
  ethiopian_independent: "Private Medien Äthiopiens",
  tigray: "Tigrayische Medien",
  international: "Internationale Medien",
  un_ngo: "UN und Hilfsorganisationen",
  aggregator: "Nachrichtenindex, noch nicht eingeordnet",
  measurement: "Messung",
  maritime_authority: "Seefahrtsbehörde",
};
export const TYPE_NOTE: Record<string, string> = {
  government_er: "Amtliche Erklärungen aus Eritrea, einer Konfliktpartei. Sie zeigen die Haltung der Regierung, keine unabhängige Bestätigung.",
  progov_er: "Nah an Eritreas Regierung. Ihre Berichte zum Konflikt wie die Aussage einer Konfliktpartei lesen.",
  exile: "Diaspora-Medien, meist regierungskritisch, mit Quellen im Land. Wie jede einzelne Quelle allein keine Bestätigung.",
  government_et: "Amtliche Erklärungen aus Äthiopien, einer Konfliktpartei. Sie zeigen die Haltung der Regierung, keine unabhängige Bestätigung.",
  progov_et: "Nah an Äthiopiens Regierungspartei. Ihre Berichte zum Konflikt wie die Aussage einer Konfliktpartei lesen.",
  ethiopian_independent: "Private äthiopische Medien, nicht in Regierungshand. Wie jede einzelne Quelle allein keine Bestätigung.",
  tigray: "Medien aus Tigray, meist einer der Parteien dort nah. Ihre Berichte zum Konflikt wie die Aussage einer Konfliktpartei lesen.",
  international: "Nachrichtenagenturen, Sender und Fachpresse, die von außen berichten. Auch sie stützen sich oft auf Angaben der Parteien.",
  un_ngo: "Die UN, Menschenrechtsorganisationen und Konfliktforscher. Sie berichten mit Verzögerung, dafür meist mit Belegen.",
  aggregator: "Von einer automatischen Nachrichtensuche gefunden. Das Medium ist genannt, aber noch nicht eingeordnet.",
  measurement: "Satelliten und Sensoren. Sie zeigen, dass an einem Ort zu einer Zeit etwas geschah, nicht warum.",
  maritime_authority: "UKMTO, die Schifffahrtsstelle der britischen Marine. Bestätigt Vorfälle auf See, nennt aber keine Verantwortlichen.",
};
export const TYPE_ORDER = ["government_er", "progov_er", "exile", "international", "un_ngo", "ethiopian_independent",
  "government_et", "progov_et", "tigray", "aggregator", "measurement", "maritime_authority"];
export const REGIONS: Record<string, string> = {
  eritrea: "Eritrea", tigray: "Tigray", afar: "Afar", red_sea: "Rotes Meer", ethiopia: "Äthiopien", horn: "Horn von Afrika",
};
export const REGION_ORDER = ["eritrea", "tigray", "afar", "red_sea", "ethiopia", "horn"];
export const STATUS: Record<string, [string, string]> = {
  confirmed: ["Bestätigt", "Mindestens zwei unabhängige Quellen berichten es als Tatsache, oder die betroffene Seite räumt es ein."],
  likely: ["Wahrscheinlich", "Mehrere Hinweise sprechen dafür, aber noch keine zwei unabhängigen Quellen berichten es als Tatsache."],
  unconfirmed: ["Unbestätigt", "Berichtet, aber noch nicht unabhängig überprüft."],
  disputed: ["Umstritten", "Eine Seite behauptet es, eine andere bestreitet es."],
  false: ["Falsch", "Durch Belege widerlegt."],
};
export const STATUS_ORDER = ["confirmed", "likely", "unconfirmed", "disputed", "false"];

// ---------------------------------------------------------------- Formate
export const LOC = "de-DE";
const TZ = "Europe/Berlin";
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOC, { timeZone: TZ, ...o });
export const fmtTime = (d: string | number | Date) => fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
export const fmtDay = (d: string | number | Date) => fmt({ weekday: "long", day: "numeric", month: "long" }).format(new Date(d));
export const fmtDate = (d: string | number | Date) => fmt({ day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
export const fmtShort = (d: string | number | Date) => fmt({ day: "numeric", month: "short" }).format(new Date(d));
export const fmtFull = (d: string | number | Date) => `${fmtShort(d)}, ${fmtTime(d)}`;
const sameDay = (a: Date, b: Date) => fmt({ year: "numeric", month: "2-digit", day: "2-digit" }).format(a) === fmt({ year: "numeric", month: "2-digit", day: "2-digit" }).format(b);
/** "14:05", "gestern, 14:05" oder "9. Okt., 14:05" */
export const fmtWhen = (d: string | number | Date) => {
  const x = new Date(d), now = new Date();
  if (sameDay(x, now)) return `${fmtTime(x)} Uhr`;
  if (sameDay(x, new Date(now.getTime() - 864e5))) return `gestern, ${fmtTime(x)}`;
  return fmtFull(x);
};
export const fmtCap = (d: string | number | Date) =>
  `${new Intl.DateTimeFormat(LOC, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(d))}, ` +
  `${new Intl.DateTimeFormat(LOC, { timeZone: "UTC", hour: "2-digit", minute: "2-digit" }).format(new Date(d))} UTC`;
export const fmtCapDay = (d: string | number | Date) =>
  new Intl.DateTimeFormat(LOC, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
export const fmtIsoDay = (s: string, o: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) =>
  new Intl.DateTimeFormat(LOC, { timeZone: "UTC", ...o }).format(new Date(s + "T12:00:00Z"));
export const todayBerlin = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
export const tzName = (d: string | number | Date = Date.now()) => {
  try { return new Intl.DateTimeFormat(LOC, { timeZone: TZ, timeZoneName: "short" }).formatToParts(new Date(d)).find((x) => x.type === "timeZoneName")?.value || "MEZ"; }
  catch { return "MEZ"; }
};
export const ago = (d: string | number | Date) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  return h < 48 ? `vor ${h} Std.` : `vor ${Math.round(h / 24)} Tagen`;
};
export const num = (n: number | string) => (typeof n === "number" ? n.toLocaleString(LOC) : String(n));
export const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------- Datenbank-Texte auf Deutsch
let TEXTS: Record<string, string> = { ...(DE_PUBLIC as Record<string, string>) };
/** Private Texte nach der Anmeldung dazunehmen (kommen aus der Datenbank) */
export function addTexts(extra: Record<string, string> | null | undefined) {
  if (extra) TEXTS = { ...TEXTS, ...extra };
}
export function resetTexts() { TEXTS = { ...(DE_PUBLIC as Record<string, string>) }; }

const MON: Record<string, string> = { Jan: "Jan.", Feb: "Feb.", Mar: "März", Apr: "Apr.", May: "Mai", Jun: "Juni", Jul: "Juli", Aug: "Aug.", Sep: "Sept.", Oct: "Okt.", Nov: "Nov.", Dec: "Dez." };
export const deDates = (t: string | null | undefined) =>
  t == null ? t : String(t).replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{4})\b/g, (_, d, m, y) => `${d}. ${MON[m]} ${y}`);
const COUNTRY: Record<string, string> = { Eritrea: "Eritrea", Ethiopia: "Äthiopien", Yemen: "Jemen", Djibouti: "Dschibuti", "Saudi Arabia": "Saudi-Arabien", Sudan: "Sudan", Somalia: "Somalia", Egypt: "Ägypten" };
const SEA: Record<string, string> = { "Southern Red Sea": "Südliches Rotes Meer", "Northern Red Sea": "Nördliches Rotes Meer", "Red Sea": "Rotes Meer", "Gulf of Aden": "Golf von Aden",
  "Bab el Mandeb": "Bab el-Mandeb", "Bab-el-Mandeb": "Bab el-Mandeb", "Bab al-Mandab": "Bab el-Mandeb" };
const DIR: Record<string, string> = { n: "nördlich", s: "südlich", e: "östlich", w: "westlich", ne: "nordöstlich", nw: "nordwestlich", se: "südöstlich", sw: "südwestlich",
  north: "nördlich", south: "südlich", east: "östlich", west: "westlich", northeast: "nordöstlich", northwest: "nordwestlich", southeast: "südöstlich", southwest: "südwestlich" };
const dirDe = (d: string) => DIR[d.toLowerCase().replace(/\s/g, "")] || d.toUpperCase().replace(/E/g, "O");
const deNum = (x: string) => String(x).replace(".", ",");
const dePlace = (p: string) => {
  let t = String(p).trim();
  if (SEA[t]) return SEA[t];
  t = t.replace(/^(\d+) km ([NSEW]{1,3}) of /, (_, n, dir) => `${n} km ${dir.replace(/E/g, "O")} von `);
  t = t.replace(/^(\d+(?:\.\d+)?)\s?NM ([NSEW]{1,3}|North(?: ?East| ?West)?|South(?: ?East| ?West)?|East|West) of /i, (_, n, dir) => `${deNum(n)} sm ${dirDe(dir)} von `);
  t = t.replace(/\b(Mokha|Al[- ]Mukha)\b/g, "Mokka").replace(/\b(Hodeidah|Hudaydah|Al Hudaydah)\b/g, "Hudaida");
  t = t.replace(/\bborder region\b/gi, "Grenzgebiet").replace(/\bcoast\b/gi, "Küste");
  for (const [en, d] of Object.entries({ ...COUNTRY, ...SEA })) t = t.replace(new RegExp(`\\b${en}\\b`, "g"), d);
  return t;
};
const INCIDENT: Record<string, string> = { Attack: "Angriff", "Suspicious Activity": "Verdächtige Aktivität", "Suspicious Approach": "Verdächtige Annäherung", Approach: "Annäherung",
  Incident: "Vorfall", Hijack: "Entführung", Boarding: "Enterung", "Attempted Boarding": "Versuchte Enterung", Explosion: "Explosion", Advisory: "Hinweis",
  Robbery: "Raub", Piracy: "Piraterie", Sighting: "Sichtung", "Hostile Activity": "Feindselige Handlung", "Missile Attack": "Raketenangriff",
  "Missile Strike": "Raketenangriff", "Drone Attack": "Drohnenangriff", "GNSS Interference": "Störung der Satellitennavigation",
  "Communications Interference": "Störung der Kommunikation", Unknown: "Unklarer Vorfall", Warning: "Warnung", Information: "Information",
  Missile: "Rakete", "Suspicious Vessel": "Verdächtiges Schiff", "Vessel Attacked": "Schiff angegriffen" };
const CORR: Record<string, string> = { wording: "Wortlaut", "who says it": "wer es sagt", "who denies it": "wer es bestreitet", "first reported date": "Datum der ersten Meldung", "party label": "Kennzeichnung als Konfliktpartei" };
const fmtN = (x: string) => { const n = Number(x); return Number.isFinite(n) ? num(n) : x; };

type Rule = [RegExp, (...m: string[]) => string];
const RULES: Rule[] = [
  [/^Earthquake (?:of unknown magnitude|M([\d.]+))(?:, (.+))?$/, (_, m, p) => `Erdbeben ${m ? `der Stärke ${deNum(m)}` : "unbekannter Stärke"}${p ? `, ${dePlace(p)}` : ""}`],
  [/^(.+?)(?:, (.+))? \(UKMTO #(\d+)\)$/, (_, k, p, n) => `${INCIDENT[k.trim()] || k}${p ? `, ${dePlace(p)}` : ""} (UKMTO Nr.\u00a0${n})`],
  [/^Internet connectivity (drop|dip) in (\w+) \(([\w-]+) (-?\d+)% below usual\)$/, (_, k, c, ds, n) =>
    `${k === "drop" ? "Starker Einbruch" : "Leichter Rückgang"} der Internetverbindung in ${COUNTRY[c] || c} (${ds} ${n} % unter dem Üblichen)`],
  [/^Internet connectivity alert in (\w+) \(([\w-]+)\)$/, (_, c, ds) => `Internet-Warnung für ${COUNTRY[c] || c} (${ds})`],
  [/^Internet connectivity drop in (\w+) \(([\w-]+), level (\w+)\)$/, (_, c, ds, l) => `Rückgang der Internetverbindung in ${COUNTRY[c] || c} (${ds}, Stufe „${l}“)`],
  [/^Major internet drop in (\w+)$/, (_, c) => `Starker Interneteinbruch in ${COUNTRY[c] || c}`],
  [/^Internet connectivity dip in (\w+)$/, (_, c) => `Leichter Rückgang der Internetverbindung in ${COUNTRY[c] || c}`],
  [/^IODA \(([^)]+)\) measured (\S+) against a usual (\S+?)(?: \(−(\d+)%\))?\. A measured drop is not proof of a deliberate shutdown\.$/, (_, ds, a, b, p) =>
    `IODA (${ds}) hat ${fmtN(a)} gemessen, üblich sind ${fmtN(b)}${p ? ` (−${p} %)` : ""}. Ein gemessener Rückgang beweist keine absichtliche Abschaltung.`],
  [/^(\d+) reports on Eritrea from (\d+) outlets in 6 hours$/, (_, a, b) => `${a} Meldungen zu Eritrea von ${b} Medien in 6 Stunden`],
  [/^Corrected: ([^."]+)\.(?: Previous wording: "([\s\S]*?)"\.)?(?: ([\s\S]*))?$/, (_, parts, old, rest) =>
    `Berichtigt: ${parts.split(", ").map((x) => CORR[x] || x).join(", ")}.${old ? ` Bisheriger Wortlaut: „${de(old)}“` : ""}${rest ? (de(rest) === rest && isEnglish(rest, rest) ? ` (englischer Wortlaut: „${rest}“)` : ` ${de(rest)}`) : ""}`],
  [/^unknown status (.*)$/, (_, x) => `unbekannter Status ${x}`],
  [/^not allowed$/, () => "nur für den Betreiber von Semay freigegeben"],
];
export function de<T extends string | null | undefined>(t: T): T {
  if (t == null || t === "") return t;
  const s = String(t);
  if (Object.prototype.hasOwnProperty.call(TEXTS, s)) return TEXTS[s] as T;
  for (const [re, f] of RULES) if (re.test(s)) return s.replace(re, f as any) as T;
  return s as T;
}
/** Text wurde nicht übersetzt und ist offensichtlich Englisch */
export const isEnglish = (orig: string | null | undefined, shown: string | null | undefined) =>
  !!orig && orig === shown && /\b(the|and|of|to|is|was|has|have|were|by|from|with)\b/i.test(orig);
/** Quellenname für Zeilen: ohne Zusatz in Klammern, Gedankenstrich statt Bindestrich („DW – Africa“) */
export const srcName = (n: string | null | undefined) => String(n || "").replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+-\s+/g, " – ").trim() || String(n || "");
export const endDot = (t: string | null | undefined) => { const s = String(t || "").trim(); return /[.!?…“"]$/.test(s) ? s : `${s}.`; };
