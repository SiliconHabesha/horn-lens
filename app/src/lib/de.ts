// Deutsche Anzeige: Bezeichnungen, Formate und Übersetzung der englischen Datenbank-Texte.
// Öffentliche Texte stecken in der App (src/data/de_public.json), private kommen nach der Anmeldung aus der Datenbank.
import DE_PUBLIC from "../data/de_public.json";
import { lang, t as tr } from "./i18n";

const TYPES_DE: Record<string, string> = {
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
  somali_media: "Medien aus Somalia und Somaliland",
  sudanese_media: "Sudanesische Medien",
};
/** Kurzform für Listenzeilen (neben dem Farbpunkt) */
const TYPE_SHORT_DE: Record<string, string> = {
  government_er: "Regierung Eritrea", progov_er: "Eritrea, regierungsnah", exile: "Exil Eritrea",
  government_et: "Regierung Äthiopien", progov_et: "Äthiopien, regierungsnah", ethiopian_independent: "Äthiopien, privat",
  tigray: "Tigray", international: "International", un_ngo: "UN und NGO", aggregator: "nicht eingeordnet",
  somali_media: "Somalia", sudanese_media: "Sudan",
};
const TYPE_NOTE_DE: Record<string, string> = {
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
  somali_media: "Medien aus Somalia und Somaliland. Wie jede einzelne Quelle allein keine Bestätigung.",
  sudanese_media: "Sudanesische Medien, auch aus dem Exil. Keine Partei des Krieges; wie jede einzelne Quelle allein keine Bestätigung.",
};
export const TYPE_ORDER = ["government_er", "progov_er", "exile", "international", "un_ngo", "ethiopian_independent",
  "government_et", "progov_et", "tigray", "somali_media", "sudanese_media", "aggregator", "measurement", "maritime_authority"];
const REGIONS_DE: Record<string, string> = {
  eritrea: "Eritrea", tigray: "Tigray", afar: "Afar", amhara: "Amhara", oromia: "Oromia", ethiopia: "Äthiopien", red_sea: "Rotes Meer",
  djibouti: "Dschibuti", somalia: "Somalia und Somaliland", sudan: "Sudan", horn: "Horn von Afrika",
};
/** Regionen in fester Reihenfolge: Eritrea und Nachbarn zuerst, dann das weitere Horn von Afrika */
export const REGION_ORDER = ["eritrea", "tigray", "afar", "amhara", "oromia", "ethiopia", "red_sea", "djibouti", "somalia", "sudan", "horn"];
/** Kernregionen (Eritrea, Äthiopien mit Tigray, Afar, Amhara, Oromia): für „Meistberichtet“ und Zählungen auf der Lage */
export const CORE_REGIONS = ["eritrea", "tigray", "afar", "amhara", "oromia", "ethiopia"];
const STATUS_DE: Record<string, [string, string]> = {
  unverified: ["Ungeprüft", "Gemeldet, aber noch nicht anhand von Belegen geprüft."],
  checking: ["In Prüfung", "Wird gerade anhand von Belegen geprüft. Noch kein Ergebnis."],
  partly: ["Teilweise gestützt", "Belege stützen einen Teil der Aussage, oder bisher stützt sie nur eine unabhängige Quelle."],
  supported: ["Durch unabhängige Quellen gestützt", "Mindestens zwei voneinander unabhängige Quellen stützen es, oder die betroffene Seite räumt es ein."],
  conflicting: ["Widersprüchliche Beweislage", "Es gibt Belege dafür und Belege dagegen; keine Seite überwiegt klar."],
  refuted: ["Widerlegt", "Belege zeigen, dass es nicht stimmt."],
  unverifiable: ["Nicht verifizierbar", "Mit frei zugänglichen Belegen nicht zu prüfen, etwa weil niemand unabhängig Zugang hat."],
};
/** Bis 12.10.2026 hießen die Stufen anders. Alte Tagesberichte und Verläufe nutzen noch die alten Schlüssel. */
const LEGACY: Record<string, string> = { confirmed: "supported", likely: "partly", unconfirmed: "unverified", disputed: "conflicting", false: "refuted" };
export const normStatus = (k: string | null | undefined) => (k ? LEGACY[k] || k : "unverified");
/** Kurzform für Listen und Knöpfe */
const STATUS_SHORT_DE: Record<string, string> = {
  unverified: "Ungeprüft", checking: "In Prüfung", partly: "Teilweise gestützt", supported: "Gestützt",
  conflicting: "Widersprüchlich", refuted: "Widerlegt", unverifiable: "Nicht verifizierbar",
};
/** Bezeichnungen in der gewählten Sprache (Schlüssel bleiben gleich) */
const localized = <V,>(o: Record<string, V>, f: (v: V) => V) => new Proxy(o, { get: (x, k: string) => (k in x ? f((x as any)[k]) : undefined) }) as Record<string, V>;
export const TYPES = localized(TYPES_DE, (v) => tr(v));
export const TYPE_SHORT = localized(TYPE_SHORT_DE, (v) => tr(v));
export const TYPE_NOTE = localized(TYPE_NOTE_DE, (v) => tr(v));
export const REGIONS = localized(REGIONS_DE, (v) => tr(v));
export const STATUS = localized(STATUS_DE, (v) => [tr(v[0]), tr(v[1])] as [string, string]);
export const STATUS_SHORT = localized(STATUS_SHORT_DE, (v) => tr(v));
export const STATUS_ORDER = ["unverified", "checking", "partly", "supported", "conflicting", "refuted", "unverifiable"];
/** Richtung eines Belegs */
const DIRECTION_DE: Record<string, string> = { supports: "stützt", contradicts: "widerspricht", context: "ordnet ein" };
export const DIRECTION = localized(DIRECTION_DE, (v) => tr(v));

// ---------------------------------------------------------------- Formate
const TZ = "Europe/Berlin";
/** Gebietsschema der gewählten Sprache */
export const loc = () => (lang() === "en" ? "en-GB" : lang() === "ti" ? "ti-ER" : "de-DE");
export const LOC = "de-DE";
// Tigrinya-Namen, falls das Gerät kein Tigrinya-Datumsformat kennt
const TI_MON = ["ጥሪ", "ለካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰነ", "ሓምለ", "ነሓሰ", "መስከረም", "ጥቅምቲ", "ሕዳር", "ታሕሳስ"];
const TI_DAY = ["ሰንበት", "ሰኑይ", "ሰሉስ", "ረቡዕ", "ሓሙስ", "ዓርቢ", "ቀዳም"];
let tiOk: boolean | null = null;
const tiSupported = () => {
  // Manche Browser melden Tigrinya, haben aber keine Namen dafür („M10“): darum prüfen, ob ein Ge'ez-Monatsname herauskommt
  if (tiOk == null) { try { tiOk = /[\u1200-\u137f]/.test(new Intl.DateTimeFormat("ti-ER", { month: "long" }).format(new Date())); } catch { tiOk = false; } }
  return tiOk;
};
function dtf(o: Intl.DateTimeFormatOptions, tz = TZ) {
  const l = loc();
  if (l !== "ti-ER" || tiSupported()) return new Intl.DateTimeFormat(l, { timeZone: tz, ...o });
  // Ersatz: Teile auf Englisch berechnen, Namen auf Tigrinya einsetzen
  const en = new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...o, weekday: o.weekday ? "long" : undefined, month: o.month ? "numeric" : undefined });
  return { format: (d: Date) => {
    const p = Object.fromEntries(en.formatToParts(d).map((x) => [x.type, x.value]));
    const out: string[] = [];
    if (o.weekday) out.push(`${TI_DAY[new Date(d.toLocaleString("en-US", { timeZone: tz })).getDay()]}፣`);
    if (o.day) out.push(p.day);
    if (o.month) out.push(TI_MON[Number(p.month) - 1]);
    if (o.year) out.push(p.year);
    const date = out.join(" ");
    const time = o.hour ? `${p.hour}:${p.minute}` : "";
    return [date, time].filter(Boolean).join(" ");
  }, formatToParts: (d: Date) => en.formatToParts(d) } as unknown as Intl.DateTimeFormat;
}
const fmt = (o: Intl.DateTimeFormatOptions) => dtf(o);
export const fmtTime = (d: string | number | Date) => dtf({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
export const fmtDay = (d: string | number | Date) => fmt({ weekday: "long", day: "numeric", month: "long" }).format(new Date(d));
export const fmtDate = (d: string | number | Date) => fmt({ day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
export const fmtShort = (d: string | number | Date) => fmt({ day: "numeric", month: "short" }).format(new Date(d));
export const fmtFull = (d: string | number | Date) => `${fmtShort(d)}, ${fmtTime(d)}`;
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
/** "14:05 Uhr", "gestern, 14:05" oder "9. Okt., 14:05" */
export const fmtWhen = (d: string | number | Date) => {
  const x = new Date(d), now = new Date();
  if (sameDay(x, now)) return tr("{time} Uhr", { time: fmtTime(x) });
  if (sameDay(x, new Date(now.getTime() - 864e5))) return tr("gestern, {time}", { time: fmtTime(x) });
  return fmtFull(x);
};
export const fmtCap = (d: string | number | Date) =>
  `${dtf({ day: "numeric", month: "short", year: "numeric" }, "UTC").format(new Date(d))}, ` +
  `${dtf({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, "UTC").format(new Date(d))} UTC`;
export const fmtCapDay = (d: string | number | Date) => dtf({ day: "numeric", month: "short", year: "numeric" }, "UTC").format(new Date(d));
export const fmtIsoDay = (s: string, o: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) =>
  dtf(o, "UTC").format(new Date(s + "T12:00:00Z"));
export const todayBerlin = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
export const tzName = (d: string | number | Date = Date.now()) => {
  try { return new Intl.DateTimeFormat(lang() === "de" ? "de-DE" : "en-GB", { timeZone: TZ, timeZoneName: "short" }).formatToParts(new Date(d)).find((x) => x.type === "timeZoneName")?.value || "CET"; }
  catch { return "CET"; }
};
export const ago = (d: string | number | Date) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return tr("gerade eben");
  if (m < 60) return tr("vor {n} Min.", { n: m });
  const h = Math.round(m / 60);
  return h < 48 ? tr("vor {n} Std.", { n: h }) : tr("vor {n} Tagen", { n: Math.round(h / 24) });
};
export const num = (n: number | string) => (typeof n === "number" ? n.toLocaleString(lang() === "de" ? "de-DE" : "en-GB") : String(n));
/** Zahl mit Wort: plural(3, "Meldung", "Meldungen"). Beide Wörter werden übersetzt. */
export const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? tr(one) : tr(many)}`;

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
const CORR: Record<string, string> = { wording: "Wortlaut", "who says it": "wer es sagt", "who denies it": "wer es bestreitet", "first reported date": "Datum der ersten Meldung", "party label": "Kennzeichnung als Konfliktpartei",
  "claimed event time": "behaupteter Zeitpunkt", "open questions": "offene Fragen", rationale: "Begründung", "source dependencies": "Abhängigkeit der Quellen" };
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
/** Text aus der Datenbank in der gewählten Sprache: Deutsch über Wörterbuch und Regeln, Englisch im Original, Tigrinya über einige Regeln */
export function de<T extends string | null | undefined>(t: T): T {
  if (t == null || t === "") return t;
  if (lang() === "en") return t;
  if (lang() === "ti") return tiRule(String(t)) as T;
  return toDe(t);
}
function toDe<T extends string | null | undefined>(t: T): T {
  if (t == null || t === "") return t;
  const s = String(t);
  if (Object.prototype.hasOwnProperty.call(TEXTS, s)) return TEXTS[s] as T;
  for (const [re, f] of RULES) if (re.test(s)) return s.replace(re, f as any) as T;
  return s as T;
}
/** Text wurde nicht übersetzt und ist offensichtlich Englisch (in der englischen Fassung nie ein Hinweis wert) */
export const isEnglish = (orig: string | null | undefined, shown: string | null | undefined) =>
  lang() !== "en" && !!orig && orig === shown && /\b(the|and|of|to|is|was|has|have|were|by|from|with)\b/i.test(orig);
/** Quellenname für Zeilen: ohne Zusatz in Klammern, Gedankenstrich statt Bindestrich („DW – Africa“) */
export const srcName = (n: string | null | undefined) => String(n || "").replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+-\s+/g, " – ").trim() || String(n || "");
export const endDot = (t: string | null | undefined) => { const s = String(t || "").trim(); return /[.!?…“"]$/.test(s) ? s : `${s}.`; };

/** Schlagzeile ganz in Großbuchstaben (manche Quellen schreiben so): Wörter mit großem Anfang, sonst klein */
const unshout = (s: string) => (/[a-zäöü]/.test(s) || !/[A-ZÄÖÜ]{4}/.test(s) ? s : s.toLowerCase().replace(/(^|[\s\-–„"(/])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()));
type HL = { title: string; title_de?: string | null; title_en?: string | null; title_ti?: string | null; language?: string | null };
const shownTitle = (it: HL) => {
  const l = lang();
  if (it.language === l) return it.title;
  if (l === "de") return it.title_de || it.title;
  if (l === "en") return it.title_en || it.title;
  return it.title_ti || it.title;
};
/** Die Schlagzeile, wie die App sie zeigt: in der gewählten Sprache, wenn übersetzt, sonst im Original */
export const headline = (it: HL) => unshout(shownTitle(it));
/** Wurde die Schlagzeile übersetzt (weicht die Anzeige vom Original ab)? */
export const translated = (it: HL) => shownTitle(it) !== it.title;

// ---------------------------------------------------------------- Einige Datenbank-Texte auf Tigrinya (sonst Englisch)
const TI_INCIDENT: Record<string, string> = { Attack: "መጥቃዕቲ", "Suspicious Activity": "ጥርጡር ንጥፈት", "Suspicious Approach": "ጥርጡር ምቕራብ", Approach: "ምቕራብ",
  Incident: "ፍጻመ", Hijack: "ጠለፋ", Boarding: "ምድያብ", "Attempted Boarding": "ፈተነ ምድያብ", Explosion: "ነትጒ", Advisory: "ምኽሪ", Warning: "መጠንቀቕታ", "Missile Attack": "መጥቃዕቲ ሚሳይል" };
const TI_COUNTRY: Record<string, string> = { Eritrea: "ኤርትራ", Ethiopia: "ኢትዮጵያ", Yemen: "የመን", Djibouti: "ጅቡቲ", Sudan: "ሱዳን", "Saudi Arabia": "ስዑዲ ዓረብ", Somalia: "ሶማል", Egypt: "ግብጺ" };
const tiPlace = (p: string) => { let x = p; for (const [en, ti] of Object.entries(TI_COUNTRY)) x = x.replace(new RegExp(`\\b${en}\\b`, "g"), ti); return x.replace(/\bRed Sea\b/g, "ቀይሕ ባሕሪ"); };
function tiRule(s: string): string {
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^Earthquake (?:of unknown magnitude|M([\d.]+))(?:, (.+))?$/))) return `ምንቕጥቃጥ ምድሪ${m[1] ? ` ${m[1]}` : ""}${m[2] ? `፣ ${tiPlace(m[2])}` : ""}`;
  if ((m = s.match(/^(.+?)(?:, (.+))? \(UKMTO #(\d+)\)$/))) return `${TI_INCIDENT[m[1].trim()] || m[1]}${m[2] ? `፣ ${tiPlace(m[2])}` : ""} (UKMTO ቁ. ${m[3]})`;
  if ((m = s.match(/^(?:Internet connectivity dip|Major internet drop|Internet connectivity drop) in (\w+)/))) return `ኣብ ${TI_COUNTRY[m[1]] || m[1]} ምንካይ ምትእስሳር ኢንተርነት`;
  if ((m = s.match(/^(\d+) reports on Eritrea from (\d+) outlets in 6 hours$/))) return `ኣብ 6 ሰዓታት ${m[1]} ጸብጻባት ብዛዕባ ኤርትራ ካብ ${m[2]} ማዕከናት`;
  return s;
}
