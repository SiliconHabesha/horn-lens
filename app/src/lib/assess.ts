// Einordnung einer Geschichte: Wer berichtet, und was heißt das? Automatisch, ohne Wahrheitsurteil.
// Grundsatz (Entscheidung des Inhabers, 13.10.2026): Eine einzige Quelle ist ein Warnzeichen; viele Quellen beweisen nichts.
// Semay prüft nichts selbst. Es beschreibt nur, was sich zählen lässt: Anzahl der Medien, ihre Seite, Widerspruch.
// Tests: tests/unit/lib.test.ts
import { t as tr } from "./i18n";
import type { Story } from "./stories";
import type { Item } from "./types";

/** Seiten im Konflikt. Alle anderen Quellenarten berichten von außen oder sind keiner Konfliktpartei zugeordnet. */
const SIDE: Record<string, string> = {
  government_er: "er_gov", progov_er: "er_gov", exile: "er_exile",
  government_et: "et_gov", progov_et: "et_gov", tigray: "tigray",
};
export const sideOf = (sourceType: string) => SIDE[sourceType] || "outside";
const SIDE_DE: Record<string, string> = {
  er_gov: "Eritreas Regierung und ihr nahe Medien", er_exile: "eritreische Exilmedien",
  et_gov: "Äthiopiens Regierung und ihr nahe Medien", tigray: "Medien aus Tigray", outside: "Medien von außerhalb",
};
export const sideLabel = (side: string) => tr(SIDE_DE[side] || SIDE_DE.outside);

/** Jemand bestreitet, dementiert oder weist zurück (englisch und deutsch) */
const DENIAL = /\b(den(y|ies|ied|ial|ials)|reject(s|ed)?|dismiss(es|ed)?|refut(e|es|ed)|rebuff(s|ed)?|false claims?|baseless|fabricat(ed|ion)|bestreit\w*|dementi\w*|weist\w* zurück|zurückgewiesen|haltlos)\b/i;

export type Kind = "contested" | "single" | "oneSide" | "outside" | "multi";
export const KIND_ORDER: Kind[] = ["contested", "single", "oneSide", "outside", "multi"];
export type Assessment = { kind: Kind; media: number; sides: string[]; label: string; text: string };

const LABEL_DE: Record<Kind, string> = {
  contested: "Bestritten", single: "Nur eine Quelle", oneSide: "Nur eine Seite", outside: "Nur von außen berichtet", multi: "Verschiedene Seiten",
};
export const kindLabel = (k: Kind) => tr(LABEL_DE[k]);

const mediaOf = (items: Item[]) => new Set(items.map((i) => i.origin_domain || i.source_name)).size;
const titlesOf = (it: Item) => `${it.title} ${it.title_en || ""} ${it.title_de || ""}`;

/** Einordnung einer Geschichte (oder einer einzelnen Meldung) nach festen Regeln. Reihenfolge: bestritten, eine Quelle, eine Seite, verschiedene Seiten. */
export function assess(items: Item[]): Assessment {
  const media = mediaOf(items);
  const sides = [...new Set(items.map((i) => sideOf(i.source_type)))];
  const party = sides.filter((s) => s !== "outside");
  if (items.some((i) => DENIAL.test(titlesOf(i)))) {
    return { kind: "contested", media, sides, label: kindLabel("contested"),
      text: tr("Mindestens eine Meldung berichtet, dass etwas bestritten oder zurückgewiesen wird. Hier steht Aussage gegen Aussage.") };
  }
  if (media <= 1) {
    const one = items[0];
    return { kind: "single", media, sides, label: kindLabel("single"),
      text: tr("Bisher berichtet nur {source} darüber. Eine einzige Quelle ist ein Grund zur Vorsicht.", { source: one?.origin_domain || one?.source_name || "" }) };
  }
  if (sides.length === 1 && party.length === 1) {
    return { kind: "oneSide", media, sides, label: kindLabel("oneSide"),
      text: tr("Alle {n} Medien gehören zu einer Seite: {side}. Die anderen Seiten haben in unseren Quellen noch nicht berichtet.", { n: media, side: sideLabel(party[0]) }) };
  }
  if (!party.length) {
    return { kind: "outside", media, sides, label: kindLabel("outside"),
      text: tr("{n} Medien berichten, alle von außerhalb (international, UN, Fachpresse). Keine Quelle, die einer Konfliktseite zugeordnet ist (Eritrea, Äthiopien, Tigray), hat bisher berichtet.", { n: media }) };
  }
  return { kind: "multi", media, sides, label: kindLabel("multi"),
    text: tr("{n} Medien von verschiedenen Seiten berichten. Das bestätigt es nicht: Oft stützen sich alle auf dieselbe Erklärung oder Agenturmeldung.", { n: media }) };
}
export const assessStory = (s: Story) => assess(s.items);

/** Farbe der Einordnung im Farbschema: Warnung nur bei einer Quelle, einer Seite oder Widerspruch; nie Grün (das hieße „stimmt“) */
export const kindColor = (k: Kind, t: { status: Record<string, string>; muted: string }) =>
  k === "contested" ? t.status.conflicting : k === "single" || k === "oneSide" ? t.status.unverified : t.muted;
