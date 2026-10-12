export type Item = {
  id: number; title: string; url: string; language: string | null; regions: string[]; origin_domain: string | null;
  published_at: string | null; fetched_at: string; source_id: string; source_name: string; source_type: string;
  /** Maschinell übersetzte deutsche Schlagzeile (fehlt, solange nicht übersetzt) */
  title_de?: string | null; title_en?: string | null; title_ti?: string | null;
};
/** Abrufe der letzten 24 Stunden (aus dem Protokoll ingest_runs) */
export type Runs = { n: number; failed: number; found: number | null; kept: number | null; new: number | null; dupes: number | null };
export type LastRun = { start: string | null; end: string; ok: boolean; found: number | null; kept: number | null; new: number | null; dupes: number | null; error: string | null };
export type Source = {
  id: string; name: string; kind: string; source_type: string; homepage: string | null; stance_note: string | null;
  last_ok_at: string | null; last_fetch_at: string | null; last_error: string | null; last_item_count: number | null; newest_item_at?: string | null;
  language?: string | null; publisher?: string | null; origin?: string | null; focus?: string[]; limitations?: string | null; failing_since?: string | null;
  runs?: Runs | null; last_run?: LastRun | null;
};
/** Abgeschaltete Quelle mit Grund */
export type SourceOff = { id: string; name: string; kind: string; source_type: string; homepage: string | null; stance_note: string | null; last_error: string | null; last_ok_at: string | null };
export type Ref = { title: string | null; url: string };
export type ClaimEvent = { at: string; status: string; note: string; source_title: string | null; source_url: string | null; extra: Ref[]; admission: boolean;
  /** stützt, widerspricht oder ordnet ein (nur bei Einträgen mit Beleg) */
  direction?: "supports" | "contradicts" | "context" | null;
  /** Bezeichnung der Stufe vor der Umstellung am 13.10.2026 */
  legacy?: string | null };
export type Claim = {
  id: number; statement: string; claimant: string; disputed_by: string | null; region: string; status: string; party_claim: boolean;
  first_reported: string; updated_at: string; events: ClaimEvent[];
  /** Behaupteter Zeitpunkt des Ereignisses, wie berichtet (Freitext) */
  event_time?: string | null; open_questions?: string | null; rationale?: string | null; dependencies?: string | null; checked_at?: string | null;
  raw?: { statement: string; claimant: string; disputed_by: string | null };
};
export type Fire = { lat: number; lon: number; t: string; sat: string | null; frp: number | null; url: string };
export type Quake = { t: string; lat: number; lon: number; title: string; mag: number | null; url: string | null };
export type Maritime = { t: string; lat: number; lon: number; title: string; url: string | null };
export type Outage = { t: string; title: string; country: string; level: string; url: string | null };
export type Alert = { kind: string; t: string; title: string; note: string | null; url: string | null; source: string | null };
export type SatImage = { id: number; t: string; cloud: number; item: string; b: number; platform: string;
  /** Wann Semay das Bild geholt hat, und wann ESA das Produkt erzeugt hat (aus dem Produktnamen) */
  fetched?: string | null; processed?: string | null };
export type SatPlace = { id: string; name: string; country: string; country_raw: string; why: string | null; lat: number; lon: number; half_km: number; images: SatImage[] };
export type ReportRef = { report_date: string; generated_at: string; has_summary: boolean };
export type Report = {
  report_date: string; generated_at: string; window_start: string; window_end: string; summary: any;
  payload: { regions?: { region: string; items: Item[] }[]; changes?: any[]; signals?: any; alerts?: Alert[] };
};
export type Data = {
  now: string;
  owner: boolean;
  sources: Source[];
  sourcesOff: SourceOff[];
  reports: ReportRef[];
  items: Item[];
  fires: Fire[]; firesTotal: number; firesCapped: boolean; firesError?: string;
  quakes: Quake[]; maritime: Maritime[]; outages: Outage[];
  alerts: Alert[];
  claims: Claim[];
  sat: SatPlace[]; satError?: string;
};
