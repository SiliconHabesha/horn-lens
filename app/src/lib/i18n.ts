// Sprachen der App: Deutsch (Ausgangstext), Englisch, Tigrinya.
// Jeder sichtbare Text steht im Code auf Deutsch und läuft durch t(). Die Übersetzungen liegen in src/i18n/parts/*.json,
// Schlüssel ist der deutsche Text. Platzhalter in geschweiften Klammern: t("{n} neue Meldungen", { n: 3 }).
// Fehlt eine Tigrinya-Übersetzung, erscheint die englische, fehlt auch die, der deutsche Text.
import CORE from "../i18n/parts/core.json";
import A from "../i18n/parts/a.json";
import B from "../i18n/parts/b.json";
import C from "../i18n/parts/c.json";
import D from "../i18n/parts/d.json";
import E from "../i18n/parts/e.json";

export type Lang = "de" | "en" | "ti";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "de", label: "Deutsch" },
  { id: "en", label: "English" },
  { id: "ti", label: "ትግርኛ" },
];

type Dict = Record<string, string>;
const merge = (k: "en" | "ti") => Object.assign({}, ...[CORE, A, B, C, D, E].map((p: any) => p[k] || {})) as Dict;
const EN = merge("en"), TI = merge("ti");

let LANG: Lang = "de";
export const lang = () => LANG;
export const setLangNow = (l: Lang) => { LANG = l; };

/** Übersetzt einen deutschen Text in die gewählte Sprache und setzt Platzhalter ein */
export function t(de: string, vars?: Record<string, string | number | null | undefined>): string {
  let s = LANG === "de" ? de : LANG === "en" ? EN[de] ?? de : TI[de] ?? EN[de] ?? de;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? "" : String(vars[k])));
  return s;
}

/** Sprache des Geräts als Vorschlag beim ersten Start */
export function deviceLang(): Lang {
  let loc = "";
  try { loc = Intl.DateTimeFormat().resolvedOptions().locale || ""; } catch { /* egal */ }
  try { if (typeof navigator !== "undefined" && (navigator as any).language) loc = (navigator as any).language; } catch { /* egal */ }
  const l = loc.toLowerCase();
  if (l.startsWith("ti") || l.startsWith("am")) return "ti";
  if (l.startsWith("de")) return "de";
  return "en";
}

/** Fehlende Übersetzungen (für Tests) */
export const missing = (keys: string[]) => ({ en: keys.filter((k) => !(k in EN)), ti: keys.filter((k) => !(k in TI)) });
