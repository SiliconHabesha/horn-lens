// Ereignisarten: Meldungen nach festen Stichwörtern in der Schlagzeile einordnen (Militär, Gefechte, Grenze, …).
// Keine KI und keine Bewertung: Eine Meldung bekommt höchstens zwei Arten, und zwar nur, wenn ein Stichwort passt.
// Geprüft wird die englische Fassung der Schlagzeile (Original oder maschinelle Übersetzung), sonst die deutsche.
// Die App kennzeichnet die Einordnung überall als „automatisch“. Tests: tests/unit/lib.test.mjs
import { t as tr } from "./i18n";

export type EventType = "clashes" | "military" | "maritime" | "border" | "humanitarian" | "disinformation" | "infrastructure" | "diplomacy" | "politics";
/** Reihenfolge = Vorrang, wenn mehrere passen */
export const EVENT_ORDER: EventType[] = ["clashes", "military", "maritime", "border", "humanitarian", "disinformation", "infrastructure", "diplomacy", "politics"];

const LABEL_DE: Record<EventType | "other", string> = {
  clashes: "Gefechte und Angriffe", military: "Militär", maritime: "Seefahrt", border: "Grenze", humanitarian: "Humanitäre Lage",
  disinformation: "Desinformation", infrastructure: "Infrastruktur", diplomacy: "Diplomatie", politics: "Politik", other: "Ohne Einordnung",
};
export const eventLabel = (k: string) => tr(LABEL_DE[k as EventType] || LABEL_DE.other);

const W = (words: string) => new RegExp(`\\b(?:${words})\\b`, "i");
// Englisch und Deutsch (für Schlagzeilen, die nur maschinell auf Deutsch vorliegen)
const RULES: Record<EventType, RegExp> = {
  clashes: W("clash(?:es|ed)?|fighting|fought|battles?|offensive|attack(?:s|ed)?|ambush(?:ed)?|shelling|shelled|air ?strikes?|drone strikes?|bombing|bombed|killed|killings?|massacre|gunmen|insurgents?|raid(?:s|ed)?|siege|"
    + "kämpfe?n?|gefecht(?:e|en)?|angriff(?:e|en)?|anschlag|getötet|tote|beschuss|luftangriff(?:e|en)?|drohnenangriff(?:e|en)?|überfall"),
  military: W("army|troops?|military|soldiers?|mobili[sz]ation|conscripts?|conscription|national service|defen[cs]e minister|weapons?|arms|deploy(?:s|ed|ment)?|militias?|endf|edf|saf|rapid support forces|warplanes?|"
    + "armee|truppen?|militär|soldaten|mobilmachung|wehrdienst|waffen|stationiert|miliz(?:en)?"),
  maritime: W("ships?|vessels?|tankers?|maritime|naval|navy|piracy|pirates?|shipping|ukmto|red sea|gulf of aden|bab[- ]el[- ]mandeb|"
    + "schiff(?:e|en)?|tanker|seefahrt|marine|piraterie|rotes meer|rotes meeres|golf von aden"),
  border: W("borders?|frontier|crossings?|badme|sovereignty|territorial|annex(?:ation|ed)?|sea access|access to the sea|"
    + "grenzen?|grenzübergang|souveränität|meerzugang|zugang zum meer"),
  humanitarian: W("refugees?|displaced|idps?|aid|famine|hunger|food insecurity|cholera|outbreak|drought|floods?|unhcr|wfp|ocha|humanitarian|malnutrition|starvation|"
    + "flüchtlinge?|vertriebene?|hilfe|hungersnot|hunger|cholera|dürre|überschwemmung(?:en)?|humanitär(?:e|en)?"),
  disinformation: W("disinformation|misinformation|fake news|fake|fabricated|propaganda|hoax|debunk(?:ed)?|false claims?|"
    + "desinformation|falschmeldung(?:en)?|gefälscht|propaganda"),
  infrastructure: W("internet|blackout|power cuts?|electricity|telecom|dam|gerd|roads?|bridges?|airports?|railway|fuel|outages?|shutdown|"
    + "strom|stromausfall|staudamm|straßen?|brücken?|flughafen|treibstoff|ausfall|abschaltung"),
  diplomacy: W("talks|envoys?|summit|ambassadors?|agreement|deal|treaty|mediation|mediat(?:e|es|ed|or)|igad|african union|security council|sanctions?|bilateral|foreign minister|ceasefire|peace|visit(?:s|ed)?|"
    + "gespräche|gesandte?r?|gipfel|botschafter|abkommen|vermittlung|sanktionen|außenminister|waffenruhe|frieden|besuch"),
  politics: W("elections?|parliament|president|prime minister|cabinet|part(?:y|ies)|pfdj|tplf|government|opposition|protests?|referendum|constitution|interim administration|reshuffle|appoint(?:s|ed)?|"
    + "wahl(?:en)?|parlament|präsident|premierminister|regierung|opposition|proteste?|verfassung|übergangsverwaltung|ernannt"),
};

type Titled = { title: string; title_en?: string | null; title_de?: string | null; language?: string | null };

/** Ereignisarten einer Meldung, höchstens zwei, in fester Reihenfolge. Leere Liste: kein Stichwort gefunden. */
export function eventTypes(it: Titled): EventType[] {
  const en = it.language === "en" ? it.title : it.title_en || "";
  const text = `${en} ${en ? "" : it.title_de || ""}`.trim();
  if (!text) return [];
  const out: EventType[] = [];
  for (const k of EVENT_ORDER) {
    if (!RULES[k].test(text)) continue;
    out.push(k);
    if (out.length === 2) break;
  }
  return out;
}

/** Häufigkeit der Arten in einer Liste von Meldungen */
export function eventCounts(items: Titled[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const it of items) { const ks = eventTypes(it); if (!ks.length) c.other = (c.other || 0) + 1; for (const k of ks) c[k] = (c[k] || 0) + 1; }
  return c;
}
