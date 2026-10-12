// Daten laden, zwischenspeichern und für alle Bildschirme bereitstellen.
// Alle lesen ohne Konto (app_public). Angemeldet als Betreiber: zusätzlich Tagesberichte und Bearbeiten (app_data).
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import type { Session } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addTexts, de, deDates, resetTexts, srcName } from "./de";
import { refreshPushOwner } from "./push";
import { sb } from "./supabase";
import type { Alert, Claim, Data, Item, Report } from "./types";

const firmsUrl = (lat: number, lon: number) => `https://firms.modaps.eosdis.nasa.gov/map/#d:24hrs;@${lon},${lat},10z`;
const platformOf = (item: string) => (/^S2([A-D])_/.test(item || "") ? `Sentinel-2${item[2]}` : "Sentinel-2");

type Raw = { owner: boolean; texts: Record<string, string> | null; data: any };

async function loadOwner(): Promise<Raw> {
  const [d, t] = await Promise.all([sb.rpc("app_data"), sb.rpc("app_texts")]);
  if (d.error) throw d.error;
  return { owner: true, texts: (t.data as any) || null, data: d.data };
}

// Offene Ausgabe: alles Lesbare in einer Abfrage (Meldungen, Behauptungen, Messwerte, Satellit), ohne Tagesbericht
async function loadPublic(): Promise<Raw> {
  const [d, t] = await Promise.all([sb.rpc("app_public"), sb.rpc("app_texts")]);
  if (d.error) throw d.error;
  return { owner: false, texts: (t.data as any) || null, data: d.data };
}

const localizeAlerts = (list: Alert[]) => list.map((a) => ({ ...a, title: de(a.title), note: de(a.note), source: de(a.source) }));

function toData(raw: Raw): Data {
  resetTexts();
  addTexts(raw.texts);
  const d = raw.data || {};
  const s = d.signals || {};
  const fires = (s.fires || []).map(([lat, lon, t, sat, frp]: any[]) => ({ lat: Number(lat), lon: Number(lon), t: new Date(Number(t) * 1000).toISOString(), sat, frp: frp == null ? null : Number(frp), url: firmsUrl(lat, lon) }));
  const claims: Claim[] = (d.claims || []).map((c: Claim) => ({
    ...c,
    raw: { statement: c.statement, claimant: c.claimant, disputed_by: c.disputed_by },
    statement: de(c.statement), claimant: de(c.claimant), disputed_by: de(c.disputed_by),
    events: (c.events || []).map((e) => ({ ...e, note: de(e.note), source_title: deDates(e.source_title) ?? null,
      extra: (e.extra || []).filter(Boolean).map((x) => ({ ...x, title: deDates(x.title) ?? null })) })),
  }));
  return {
    now: d.now || new Date().toISOString(),
    owner: raw.owner,
    sources: (d.sources || []).map((x: any) => ({ ...x, name: de(x.name), stance_note: de(x.stance_note) })),
    reports: d.reports || [],
    items: (d.items || []).map((i: any) => ({ ...i, source_name: srcName(de(i.source_name)) })),
    fires, firesTotal: Number(s.fires_total ?? fires.length), firesCapped: !!s.fires_capped,
    quakes: (s.quakes || []).map((x: any) => ({ ...x, title: de(x.title) })),
    maritime: (s.maritime || []).map((x: any) => ({ ...x, title: de(x.title) })),
    outages: (s.outages || []).map((x: any) => ({ ...x, title: de(x.title) })),
    alerts: localizeAlerts(d.alerts || []),
    claims,
    sat: (d.sat || []).map((p: any) => ({ ...p, country_raw: p.country, name: de(p.name), country: de(p.country), why: de(p.why),
      images: (p.images || []).map(([id, t, cloud, item, b]: any[]) => ({ id, t: new Date(Number(t) * 1000).toISOString(), cloud, item, b, platform: platformOf(item) })) })),
  };
}

// Meldungen, die außerhalb der 72 Stunden angezeigt wurden (z. B. in alten Tagesberichten), damit ihre Detailseite sie findet
const extraItems = new Map<number, Item>();
export const rememberItems = (list: Item[]) => { for (const i of list) extraItems.set(i.id, i); };
export const knownItem = (id: number) => extraItems.get(id);

// Tagesberichte: die letzten sieben bleiben auf dem Gerät (unter hl:cache:, beim Abmelden gelöscht), damit sie auch ohne Netz öffnen
const REPORT = (uid: string, date: string) => `hl:cache:report:${uid}:${date}`;
export async function loadReport(date: string): Promise<Report | null> {
  const uid = (await sb.auth.getSession()).data.session?.user?.id || "public";
  let data: any;
  try {
    const res = await sb.rpc("app_report", { p_date: date });
    if (res.error) throw res.error;
    data = res.data;
    const still = (await sb.auth.getSession()).data.session?.user?.id || "public";
    if (data && still === uid) {
      AsyncStorage.setItem(REPORT(uid, date), JSON.stringify(data)).catch(() => {});
      AsyncStorage.getAllKeys().then((keys) => {
        const mine = keys.filter((k) => k.startsWith(`hl:cache:report:${uid}:`)).sort();
        if (mine.length > 7) AsyncStorage.multiRemove(mine.slice(0, mine.length - 7)).catch(() => {});
      }).catch(() => {});
    }
  } catch (e: any) {
    // Gespeicherte Fassung nur bei Verbindungsproblemen; ohne Berechtigung nichts Gespeichertes zeigen
    if (!/fetch|network|timeout|abort|offline/i.test(String(e?.message || e))) throw e;
    const c = await AsyncStorage.getItem(REPORT(uid, date)).catch(() => null);
    if (!c) throw e;
    data = JSON.parse(c);
    (data as any)._offline = true;
  }
  if (!data) return null;
  const r = data as Report;
  const p = r.payload || {};
  for (const reg of p.regions || []) { for (const it of reg.items || []) it.source_name = srcName(de(it.source_name)); rememberItems(reg.items || []); }
  for (const c of p.changes || []) { c.statement = de(c.statement); c.note = de(c.note); c.source_title = deDates(c.source_title); }
  if (p.alerts) p.alerts = localizeAlerts(p.alerts);
  return r;
}

// ---------------------------------------------------------------- Zustand
type Ctx = {
  data: Data | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  offline: boolean;            // zeigt gespeicherten Stand, weil das Laden scheiterte
  loadedAt: number | null;
  session: Session | null;
  authReady: boolean;
  seenBefore: number;          // Zeitpunkt des vorigen Besuchs: alles danach gilt als neu
  firstVisit: boolean;         // erster Start auf diesem Gerät: dann zählen die letzten 24 Stunden als neu
  recovery: boolean;           // über den Link "Passwort vergessen" gekommen: neues Passwort setzen
  saved: Item[];               // gemerkte Meldungen (nur auf diesem Gerät, je Konto, beim Abmelden gelöscht)
  isSaved: (it: Item) => boolean;
  toggleSaved: (it: Item) => void;
  endRecovery: () => void;
  refresh: () => Promise<void>;
};
const DataCtx = createContext<Ctx | null>(null);
// Zwischenspeicher je Konto: niemand sieht den Stand eines anderen Kontos. Beim Abmelden wird alles gelöscht.
const CACHE = (uid: string | null) => `hl:cache:v2:${uid || "public"}`;
async function clearCaches() {
  extraItems.clear();
  try { const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith("hl:cache:")); if (keys.length) await AsyncStorage.multiRemove(keys); } catch { /* egal */ }
}
const SEEN = "hl:seen:v1";
// Gemerkte Meldungen liegen unter "hl:cache:", damit sie beim Abmelden mit gelöscht werden
const SAVED = (uid: string | null) => `hl:cache:saved:${uid || "public"}`;

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [seenBefore, setSeenBefore] = useState<number>(Date.now());
  const [firstVisit, setFirstVisit] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const token = useRef(0);
  const seenWritten = useRef(false);
  const loadedRef = useRef<number | null>(null);
  const [saved, setSaved] = useState<Item[]>([]);

  const uid = session?.user?.id ?? null;
  useEffect(() => {
    sb.auth.getSession().then(({ data: s }) => { setSession(s.session); setAuthReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((e, s) => {
      // Nur echte Wechsel weitergeben; das stündliche Erneuern des Zugangs lädt nichts neu
      setSession((prev) => (prev?.user?.id === s?.user?.id && e === "TOKEN_REFRESHED" ? prev : s));
      if (e === "SIGNED_OUT") { setData(null); resetTexts(); clearCaches(); }
      if (e === "PASSWORD_RECOVERY") setRecovery(true);
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") refreshPushOwner().catch(() => {});
    });
    // Voriger Besuch: was danach kam, ist neu. Der neue Zeitpunkt gilt ab dem nächsten Öffnen.
    AsyncStorage.getItem(SEEN).then((v) => {
      const prev = v ? Number(v) : Date.now() - 24 * 3600e3;
      setFirstVisit(!v);
      setSeenBefore(prev);
    }).catch(() => {});
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadingRef = useRef(false);
  const load = useCallback(async (isRefresh: boolean, silent = false) => {
    const my = ++token.current;
    loadingRef.current = true;
    if (isRefresh) { if (!silent) setRefreshing(true); } else { setLoading(true); setData(null); }
    // Sofort den letzten Stand dieses Kontos zeigen, dann frisch laden
    if (!isRefresh) {
      try {
        const c = await AsyncStorage.getItem(CACHE(uid));
        if (c && my === token.current) { const raw = JSON.parse(c); if (raw.uid === uid) { setData(toData(raw.raw)); setLoadedAt(raw.at); } }
      } catch { /* kein Zwischenspeicher */ }
    }
    try {
      let raw: Raw;
      if (uid) {
        try { raw = await loadOwner(); }
        catch (e: any) {
          // Angemeldet, aber nicht als Betreiber freigegeben: öffentliche Daten
          if (/not allowed/.test(String(e?.message || e))) raw = await loadPublic(); else throw e;
        }
      } else raw = await loadPublic();
      if (my !== token.current) return;
      setData(toData(raw)); setError(null); setOffline(false); setLoadedAt(Date.now());
      // Kurzes Antippen spürbar machen, wenn Ziehen-zum-Aktualisieren fertig ist
      if (isRefresh && !silent && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AsyncStorage.setItem(CACHE(uid), JSON.stringify({ at: Date.now(), uid, raw })).catch(() => {});
      // Erst wenn wirklich geladen wurde, gilt dieser Besuch als gesehen (sonst gingen „Neu“-Markierungen verloren)
      if (!seenWritten.current) { seenWritten.current = true; AsyncStorage.setItem(SEEN, String(Date.now())).catch(() => {}); }
    } catch (e: any) {
      if (my !== token.current) return;
      setError(String(e?.message || e || "Fehler"));
      setOffline(true);
    } finally {
      if (my === token.current) { setLoading(false); setRefreshing(false); loadingRef.current = false; }
    }
  }, [uid]);

  useEffect(() => { if (authReady) load(false); }, [authReady, uid, load]);
  loadedRef.current = loadedAt;
  // Zurück in der App (oder im Browser-Tab): älter als 10 Minuten, dann still neu laden.
  // War man länger als 30 Minuten weg, beginnt ein neuer Besuch: „neu“ zählt dann ab dem vorigen Besuch.
  const awaySince = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") { if (awaySince.current == null) awaySince.current = Date.now(); return; }
      const away = awaySince.current; awaySince.current = null;
      if (away && Date.now() - away > 30 * 60e3) {
        AsyncStorage.getItem(SEEN).then((v) => {
          if (v) { setSeenBefore(Number(v)); setFirstVisit(false); }
          AsyncStorage.setItem(SEEN, String(Date.now())).catch(() => {});
        }).catch(() => {});
      }
      if (authReady && !loadingRef.current && loadedRef.current && Date.now() - loadedRef.current > 10 * 60e3) load(true, true);
    });
    return () => sub.remove();
  }, [authReady, load]);
  const savedFor = useRef<string | null | undefined>(undefined); // Konto, dessen Merkliste geladen ist
  useEffect(() => {
    if (!authReady) return;
    let live = true;
    savedFor.current = undefined;
    setSaved([]);
    AsyncStorage.getItem(SAVED(uid)).then((v) => {
      if (!live) return;
      let x: Item[] = [];
      try { const p = v ? JSON.parse(v) : []; if (Array.isArray(p)) x = p; } catch { /* kaputt: leer beginnen */ }
      setSaved(x);
      savedFor.current = uid;
    }).catch(() => { if (live) savedFor.current = uid; });
    return () => { live = false; };
  }, [authReady, uid]);
  const toggleSaved = useCallback((it: Item) => {
    if (savedFor.current !== uid) return; // Merkliste noch nicht geladen oder Kontowechsel: nichts überschreiben
    setSaved((prev) => {
      const next = prev.some((x) => x.id === it.id) ? prev.filter((x) => x.id !== it.id) : [it, ...prev].slice(0, 200);
      AsyncStorage.setItem(SAVED(uid), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [uid]);
  const savedIds = useMemo(() => new Set(saved.map((x) => x.id)), [saved]);
  // Bei jedem Start einmal abgleichen, ob das Gerät private Benachrichtigungen bekommen darf
  useEffect(() => { if (authReady) refreshPushOwner().catch(() => {}); }, [authReady]);

  const value = useMemo<Ctx>(() => ({
    data, loading, refreshing, error, offline, loadedAt, session, authReady, seenBefore, firstVisit, recovery,
    saved, isSaved: (it: Item) => savedIds.has(it.id), toggleSaved,
    endRecovery: () => setRecovery(false),
    refresh: () => load(true),
  }), [data, loading, refreshing, error, offline, loadedAt, session, authReady, seenBefore, firstVisit, recovery, load, saved, savedIds, toggleSaved]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const c = useContext(DataCtx);
  if (!c) throw new Error("DataProvider fehlt");
  return c;
}

// ---------------------------------------------------------------- Satellitenbilder
// Höchstens 16 Bilder im Speicher (ältestes fliegt zuerst), sonst wird es auf schwachen Handys eng
const imgCache = new Map<number, Promise<string>>();
const IMG_MAX = 16;
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function hexToBase64(hex: string) {
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const n = h.length / 2;
  const bytes = new Uint8Array(n);
  for (let i = 0; i < n; i++) bytes[i] = parseInt(h.substr(i * 2, 2), 16);
  let out = "";
  for (let i = 0; i < n; i += 3) {
    const a = bytes[i], b = i + 1 < n ? bytes[i + 1] : 0, c = i + 2 < n ? bytes[i + 2] : 0;
    const t = (a << 16) | (b << 8) | c;
    out += B64[(t >> 18) & 63] + B64[(t >> 12) & 63] + (i + 1 < n ? B64[(t >> 6) & 63] : "=") + (i + 2 < n ? B64[t & 63] : "=");
  }
  return out;
}
/** Bild als data:-Adresse (WebP), einmal geladen bleibt es im Speicher */
export function satImageUri(id: number, retry = false): Promise<string> {
  if (retry) imgCache.delete(id);
  if (!imgCache.has(id)) {
    const p = (async () => {
      const { data, error } = await sb.from("sat_images").select("image").eq("id", id).single();
      if (error) throw error;
      return `data:image/webp;base64,${hexToBase64(String((data as any).image))}`;
    })();
    p.catch(() => imgCache.delete(id));
    imgCache.set(id, p);
    while (imgCache.size > IMG_MAX) imgCache.delete(imgCache.keys().next().value as number);
  } else {
    const p = imgCache.get(id)!; imgCache.delete(id); imgCache.set(id, p); // zuletzt benutzt nach hinten
  }
  return imgCache.get(id)!;
}
