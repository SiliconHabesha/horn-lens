export type Item = {
  id: number; title: string; url: string; language: string | null; regions: string[]; origin_domain: string | null;
  published_at: string | null; fetched_at: string; source_id: string; source_name: string; source_type: string;
};
export type Source = {
  id: string; name: string; kind: string; source_type: string; homepage: string | null; stance_note: string | null;
  last_ok_at: string | null; last_fetch_at: string | null; last_error: string | null; last_item_count: number | null; newest_item_at?: string | null;
};
export type Ref = { title: string | null; url: string };
export type ClaimEvent = { at: string; status: string; note: string; source_title: string | null; source_url: string | null; extra: Ref[]; admission: boolean };
export type Claim = {
  id: number; statement: string; claimant: string; disputed_by: string | null; region: string; status: string; party_claim: boolean;
  first_reported: string; updated_at: string; events: ClaimEvent[];
  raw?: { statement: string; claimant: string; disputed_by: string | null };
};
export type Fire = { lat: number; lon: number; t: string; sat: string | null; frp: number | null; url: string };
export type Quake = { t: string; lat: number; lon: number; title: string; mag: number | null; url: string | null };
export type Maritime = { t: string; lat: number; lon: number; title: string; url: string | null };
export type Outage = { t: string; title: string; country: string; level: string; url: string | null };
export type Alert = { kind: string; t: string; title: string; note: string | null; url: string | null; source: string | null };
export type SatImage = { id: number; t: string; cloud: number; item: string; b: number; platform: string };
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
  reports: ReportRef[];
  items: Item[];
  fires: Fire[]; firesTotal: number; firesCapped: boolean; firesError?: string;
  quakes: Quake[]; maritime: Maritime[]; outages: Outage[];
  alerts: Alert[];
  claims: Claim[];
  sat: SatPlace[]; satError?: string;
};
