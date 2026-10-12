import { fmtFull, fmtTime } from "./de";
import type { Data } from "./types";

/** Hat eine Messquelle in den letzten 3 Stunden geantwortet? Sonst "keine Daten" statt einer Null */
export function feedState(data: Data | null, id: string) {
  const s = (data?.sources || []).find((x) => x.id === id);
  if (!s) return { ok: false, last: null as string | null, partial: false, failing: false };
  const failing = !!s.last_error && (!s.last_ok_at || new Date(s.last_fetch_at || 0) > new Date(s.last_ok_at));
  const fresh = !!s.last_ok_at && Date.now() - new Date(s.last_ok_at).getTime() < 3 * 3600e3;
  return { ok: fresh, last: s.last_ok_at, partial: !!s.last_error && !failing, failing };
}
export const lastFailed = (st: ReturnType<typeof feedState>) => (st.failing && st.last ? ` Letzte Abfrage gescheitert; Stand ${fmtTime(st.last)} Uhr.` : "");
export const noData = (st: ReturnType<typeof feedState>, who: string) =>
  `${who} hat ${st.last ? `seit dem ${fmtFull(st.last)} Uhr` : "noch"} nicht geantwortet.`;
export const isStale = (s: { kind: string; newest_item_at?: string | null }) =>
  ["rss", "gdelt"].includes(s.kind) && !!s.newest_item_at && Date.now() - new Date(s.newest_item_at).getTime() > 14 * 864e5;

// Private Seite in Claude (dort gibt es KI-Zusammenfassung und Übersetzung)
export const CLAUDE_PAGE = "https://claude.ai/artifact/GaVvLNTjhVbwh5pVPkEQ2p";
export const BELES_URL = "https://beles.app";
// Adresse der Web-Fassung (Vercel); Bestätigungs-Links aus E-Mails führen dorthin
export const WEB_URL = "https://semay-lagebild.vercel.app";
