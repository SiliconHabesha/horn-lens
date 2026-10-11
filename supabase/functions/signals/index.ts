// Horn Lens – Messsignale
// Holt Feuer-Hotspots (NASA FIRMS), Erdbeben (USGS), Internetausfälle (IODA) und
// Seevorfälle (UKMTO) für das Kartengebiet. Speichert nur, was die Quelle liefert.
// Zugang nur mit internem Schlüssel (Header x-ingest-key), daher verify_jwt=false.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Kartengebiet: Eritrea, Tigray, Afar, südliches Rotes Meer, Bab el-Mandeb (für Erdbeben und Seevorfälle)
const BOX = { west: 34.5, east: 46.0, south: 10.0, north: 20.5 };
const inBox = (lat: number, lon: number) =>
  lat >= BOX.south && lat <= BOX.north && lon >= BOX.west && lon <= BOX.east;
// Hitzepunkte nur für Eritrea, Tigray, Afar und die Grenzgebiete. Ohne die Küste Jemens und Saudi-Arabiens
// nördlich von 14° (Gasfackeln bei Dschasan) und ohne das Ackerland in Benishangul, Amhara-Süd und Sudan.
const FIRE_BOX = { west: 36.3, east: 43.6, south: 11.5, north: 18.1 };
const inFireBox = (lat: number, lon: number) =>
  lat >= FIRE_BOX.south && lat <= FIRE_BOX.north && lon >= FIRE_BOX.west && lon <= FIRE_BOX.east && !(lon > 42.4 && lat > 14.0);

type Signal = {
  kind: "fire" | "quake" | "outage" | "maritime"; source_id: string; external_id: string;
  occurred_at: string; lat: number | null; lon: number | null; title: string;
  detail: Record<string, unknown>; url: string | null;
};
// Ergebnis eines Abrufs; "warning" heißt: teilweise geklappt (wird als Hinweis gespeichert)
type JobResult = { rows: Signal[]; warning?: string };

const UA = { "User-Agent": "HornLens/0.3 (situation monitor; powered by BELES; beles.app)" };
async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url.split("?")[0]}`);
  return res;
}

// NASA FIRMS: öffentliche 24-Stunden-Dateien der VIIRS-Satelliten (Region Nord- und Zentralafrika)
const FIRMS_FILES = [
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Northern_and_Central_Africa_24h.csv",
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_Northern_and_Central_Africa_24h.csv",
  "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Northern_and_Central_Africa_24h.csv",
];
async function firms(): Promise<JobResult> {
  const out: Signal[] = [];
  const errors: string[] = [];
  for (const url of FIRMS_FILES) {
    try {
      const lines = (await (await get(url)).text()).trim().split("\n");
      const head = lines.shift()!.split(",");
      const col = (n: string) => head.indexOf(n);
      const [iLat, iLon, iDate, iTime, iSat, iConf, iFrp, iDn] =
        ["latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "frp", "daynight"].map(col);
      for (const line of lines) {
        const c = line.split(",");
        const lat = Number(c[iLat]), lon = Number(c[iLon]);
        if (!inFireBox(lat, lon)) continue;
        const t = c[iTime].padStart(4, "0");
        const when = `${c[iDate]}T${t.slice(0, 2)}:${t.slice(2)}:00Z`;
        out.push({
          kind: "fire", source_id: "firms", external_id: `firms:${c[iSat]}:${when}:${lat}:${lon}`,
          occurred_at: when, lat, lon, title: "Heat detected by satellite",
          detail: { satellite: c[iSat], confidence: c[iConf], frp_mw: Number(c[iFrp]), daynight: c[iDn] },
          url: `https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${lon},${lat},10z`,
        });
      }
    } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
  }
  if (errors.length === FIRMS_FILES.length) throw new Error(errors.join("; "));
  return { rows: out, warning: errors.length ? `${FIRMS_FILES.length - errors.length} of ${FIRMS_FILES.length} satellite files answered (${errors.join("; ")})` : undefined };
}

// USGS: Erdbeben ab Stärke 2,5 der letzten 7 Tage
async function usgs(): Promise<JobResult> {
  const start = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}` +
    `&minlatitude=${BOX.south}&maxlatitude=${BOX.north}&minlongitude=${BOX.west}&maxlongitude=${BOX.east}&minmagnitude=2.5`;
  const data = await (await get(url)).json();
  if (!Array.isArray(data?.features)) throw new Error("USGS: unexpected answer");
  return { rows: data.features.map((f: any) => {
    const mag = f.properties.mag == null ? null : Number(f.properties.mag);
    return {
      kind: "quake", source_id: "usgs", external_id: `usgs:${f.id}`,
      occurred_at: new Date(f.properties.time).toISOString(),
      lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
      title: `Earthquake ${mag == null ? "of unknown magnitude" : `M${mag.toFixed(1)}`}${f.properties.place ? `, ${f.properties.place}` : ""}`,
      detail: { magnitude: mag, depth_km: f.geometry.coordinates[2], status: f.properties.status ?? null },
      url: f.properties.url ?? null,
    };
  }) };
}

// IODA: Ausfall-Warnungen für Eritrea und Äthiopien der letzten 48 Stunden
async function ioda(): Promise<JobResult> {
  const until = Math.floor(Date.now() / 1000), from = until - 48 * 3600;
  const out: Signal[] = [];
  for (const [code, name] of [["ER", "Eritrea"], ["ET", "Ethiopia"]]) {
    const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/outages/alerts?entityType=country&entityCode=${code}&from=${from}&until=${until}`;
    const data = await (await get(url)).json();
    const alerts = Array.isArray(data?.data) ? data.data : null;
    if (!alerts) throw new Error(`IODA: unexpected answer for ${code}`);
    for (const a of alerts) {
      if (!a?.time || a.level === "normal") continue;
      const when = new Date(Number(a.time) * 1000).toISOString();
      // Titel aus dem gemessenen Rückgang, nicht aus IODAs Stufe ("critical" heißt nur: unter 99 % des Üblichen)
      const v = Number(a.value), h = Number(a.historyValue);
      const drop = h > 0 && Number.isFinite(v) ? Math.round(100 * (1 - v / h)) : null;
      const ds = String(a.datasource ?? "signal").toUpperCase();
      out.push({
        kind: "outage", source_id: "ioda", external_id: `ioda:${code}:${a.datasource}:${a.time}:${a.level}`,
        occurred_at: when, lat: null, lon: null,
        title: drop == null ? `Internet connectivity alert in ${name} (${ds})`
          : `Internet connectivity ${drop >= 30 ? "drop" : "dip"} in ${name} (${ds} ${drop}% below usual)`,
        detail: { country: code, datasource: a.datasource, level: a.level, condition: a.condition,
                  value: a.value, history_value: a.historyValue },
        url: `https://ioda.inetintel.cc.gatech.edu/country/${code}`,
      });
    }
  }
  return { rows: out };
}

// UKMTO: Vorfälle auf See im Kartengebiet
async function ukmto(): Promise<JobResult> {
  const list = await (await get("https://sccd.royalnavy.mod.uk/api/ukmto/all")).json();
  if (!Array.isArray(list)) throw new Error("UKMTO: unexpected answer");
  return { rows: list
    .filter((x: any) => typeof x.locationLatitude === "number" && inBox(x.locationLatitude, x.locationLongitude))
    .map((x: any) => ({
      kind: "maritime", source_id: "ukmto",
      external_id: `ukmto:${x.sitecoreId ?? `${x.incidentNumber}:${x.utcDateOfIncident}`}`,
      occurred_at: x.utcDateOfIncident ?? x.utcDateCreated,
      lat: x.locationLatitude, lon: x.locationLongitude,
      title: `${(x.incidentTypeName ?? "Incident").trim()}${x.place ? `, ${x.place}` : ""} (UKMTO #${x.incidentNumber})`,
      detail: { number: x.incidentNumber, type: x.incidentTypeName, place: x.place, vessel_type: x.vesselType?.trim() || null,
                issuer: x.incidentIssuer },
      url: "https://www.ukmto.org/recent-incidents",
    })) };
}

const JOBS: Record<string, () => Promise<JobResult>> = { firms, usgs, ioda, ukmto };
// Erdbeben und Seevorfälle werden nachträglich berichtigt (Stärke, Ort): dann überschreiben
const REVISED = new Set(["usgs", "ukmto"]);

Deno.serve(async (req) => {
  const { data: ok } = await supabase.rpc("check_ingest_key", { k: req.headers.get("x-ingest-key") ?? "" });
  if (!ok) return new Response("forbidden", { status: 403 });

  const summary: Record<string, string> = {};
  for (const [id, job] of Object.entries(JOBS)) {
    const now = new Date().toISOString();
    try {
      const res = await job();
      const rows = [...new Map(res.rows.map((s) => [s.external_id, s])).values()];
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("signals")
          .upsert(rows.slice(i, i + 500), { onConflict: "external_id", ignoreDuplicates: !REVISED.has(id) });
        if (error) throw new Error(error.message);
      }
      await supabase.from("sources").update({ last_fetch_at: now, last_ok_at: now, last_error: res.warning?.slice(0, 300) ?? null, last_item_count: rows.length }).eq("id", id);
      summary[id] = `ok (${rows.length})${res.warning ? `, ${res.warning}` : ""}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("sources").update({ last_fetch_at: now, last_error: msg.slice(0, 300) }).eq("id", id);
      summary[id] = `error: ${msg}`;
    }
  }
  return Response.json({ ran_at: new Date().toISOString(), summary });
});
