import { fmtFull, fmtTime } from "./de";
import { t } from "./i18n";
import type { Data } from "./types";

/** Hat eine Messquelle in den letzten 3 Stunden geantwortet? Sonst "keine Daten" statt einer Null */
export function feedState(data: Data | null, id: string) {
  const s = (data?.sources || []).find((x) => x.id === id);
  if (!s) return { ok: false, last: null as string | null, partial: false, failing: false };
  const failing = !!s.last_error && (!s.last_ok_at || new Date(s.last_fetch_at || 0) > new Date(s.last_ok_at));
  const fresh = !!s.last_ok_at && Date.now() - new Date(s.last_ok_at).getTime() < 3 * 3600e3;
  return { ok: fresh, last: s.last_ok_at, partial: !!s.last_error && !failing, failing };
}
export const lastFailed = (st: ReturnType<typeof feedState>) => (st.failing && st.last ? ` ${t("Letzte Abfrage gescheitert; Stand {time} Uhr.", { time: fmtTime(st.last) })}` : "");
export const noData = (st: ReturnType<typeof feedState>, who: string) =>
  st.last ? t("{who} hat seit dem {time} Uhr nicht geantwortet.", { who, time: fmtFull(st.last) }) : t("{who} hat noch nicht geantwortet.", { who });
export const isStale = (s: { kind: string; newest_item_at?: string | null }) =>
  ["rss", "gdelt"].includes(s.kind) && !!s.newest_item_at && Date.now() - new Date(s.newest_item_at).getTime() > 14 * 864e5;

// Private Seite in Claude (dort gibt es KI-Zusammenfassung und Übersetzung)
export const CLAUDE_PAGE = "https://claude.ai/artifact/GaVvLNTjhVbwh5pVPkEQ2p";
export const BELES_URL = "https://beles.app";
// Adresse der Web-Fassung (Vercel); Bestätigungs-Links aus E-Mails führen dorthin
export const WEB_URL = "https://semay-lagebild.vercel.app";

/** Quellen, die Semay nutzen möchte, aber (noch) nicht nutzen kann. Zustand: access = Zugang fehlt, blocked = Quelle lehnt ab. */
export const NOT_SET_UP: { id: string; name: string; state: "access" | "blocked"; note: string; url: string }[] = [
  { id: "reliefweb", name: "ReliefWeb (UN OCHA)", state: "access", url: "https://apidoc.reliefweb.int/parameters#appname",
    note: "Die Schnittstelle verlangt seit November 2025 einen vorab genehmigten App-Namen. Der Antrag läuft über ein Formular von ReliefWeb und muss vom Betreiber gestellt werden." },
  { id: "acled", name: "ACLED (Konfliktereignisse)", state: "access", url: "https://acleddata.com/",
    note: "ACLED verlangt ein Konto und einen Zugangsschlüssel; die Nutzungsbedingungen schränken die Weitergabe der Daten ein. Erst nach Registrierung und Prüfung der Bedingungen einsetzbar." },
];

/** Zustand einer Quelle, wie die App ihn zeigt. Reihenfolge der Prüfung: nie abgefragt → Zugang verweigert → gestört → veraltet → ohne Ergebnis → aktuell. */
export type SourceStateKey = "current" | "empty" | "stale" | "failed" | "access" | "never" | "off" | "notset";
const MEASURE_KINDS = ["firms", "ukmto", "usgs", "ioda", "sentinel2"];
export function sourceState(s: { kind: string; last_ok_at: string | null; last_fetch_at: string | null; last_error: string | null;
  newest_item_at?: string | null; runs?: { kept: number | null; n: number } | null }, now = Date.now()): SourceStateKey {
  if (!s.last_fetch_at && !s.last_ok_at) return "never";
  const failingNow = !!s.last_error && (!s.last_ok_at || new Date(s.last_fetch_at || 0) > new Date(s.last_ok_at));
  if (failingNow && /HTTP 40[13]|forbidden|unauthori[sz]ed|appname/i.test(s.last_error || "")) return "access";
  if (failingNow) return "failed";
  const age = now - new Date(s.last_ok_at || 0).getTime();
  // Abholer laufen stündlich (Nachrichten, Messwerte) bzw. für Satellitenbilder stündlich mit Lücken: über 3 Stunden ohne Erfolg ist veraltet
  if (age > 3 * 3600e3) return "stale";
  if (!MEASURE_KINDS.includes(s.kind)) {
    if (s.newest_item_at && now - new Date(s.newest_item_at).getTime() > 14 * 864e5) return "stale";
    if (s.runs && s.runs.n > 0 && !s.runs.kept) return "empty";
  }
  return "current";
}
export const STATE_LABEL: Record<SourceStateKey, string> = {
  current: "Aktuell", empty: "Erreichbar, ohne Treffer", stale: "Veraltet", failed: "Gestört", access: "Zugang verweigert",
  never: "Noch nicht abgefragt", off: "Abgeschaltet", notset: "Nicht eingerichtet",
};
export const STATE_NOTE: Record<SourceStateKey, string> = {
  current: "Letzter Abruf erfolgreich, innerhalb der letzten 3 Stunden.",
  empty: "Erreichbar, aber in 24 Stunden keine Meldung zu unseren Regionen.",
  stale: "Seit über 3 Stunden kein erfolgreicher Abruf, oder seit über 14 Tagen keine neue Meldung zu unseren Regionen.",
  failed: "Der letzte Abruf ist gescheitert. Angezeigt wird der Stand des letzten Erfolgs.",
  access: "Die Quelle lehnt unsere Abfragen ab. Wir umgehen keine Sperren.",
  never: "Noch kein Abruf seit dem Einrichten.",
  off: "Bewusst abgeschaltet; der Grund steht dabei.",
  notset: "Gewünscht, aber noch ohne Zugang.",
};
