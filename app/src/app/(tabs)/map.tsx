// Karte: Hitzepunkte, Erdbeben, Vorfälle auf See und Satelliten-Orte. Zoomen, verschieben, antippen für Herkunft und Einzelheiten.
// Neben (Computer) oder unter (Handy) der Karte steht, was sie gerade zeigt: jedes Ereignis als Zeile, Antippen zeigt es auf der Karte.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { boxOf, Box, fit, FULL, Layers, Mark, marksOf, proj, ZoomMap } from "../../components/MapCanvas";
import { Bone } from "../../components/Skeleton";
import { Banner, Button, Chip, ChipRow, Head, openLink, T, TabTools, tap } from "../../components/ui";
import { ago, fmtCapDay, fmtWhen, num, plural } from "../../lib/de";
import { lastDays } from "../../lib/timeline";
import { useData } from "../../lib/data";
import { feedState, noData } from "../../lib/feeds";
import { t as tr } from "../../lib/i18n";
import { nearest, newsAreas, placeById, RADIUS, seaMeta, type Range } from "../../lib/places";
import { radius, space, useTheme } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const VIEWS: Record<string, { label: string; box: Box }> = {
  er: { label: "Eritrea und Nachbarn", box: boxOf(20.5, 34.5, 10.0, 46.0) },
  north: { label: "Asmara und Tigray", box: boxOf(16.3, 36.3, 13.2, 40.2) },
  south: { label: "Assab und Bab el-Mandeb", box: boxOf(14.2, 41.3, 12.1, 43.9) },
  ethiopia: { label: "Äthiopien", box: boxOf(15.0, 33.0, 3.4, 48.0) },
  somalia: { label: "Somalia und Somaliland", box: boxOf(12.2, 40.5, -1.8, 51.5) },
  sudan: { label: "Ost-Sudan", box: boxOf(20.8, 31.0, 12.0, 38.6) },
  all: { label: "Horn von Afrika", box: FULL },
};
const HOME = VIEWS.er.box;

const SPANS: [number, string][] = [[24, "24 Std."], [24 * 7, "7 Tage"], [24 * 30, "30 Tage"]];
type Row = { key: string; icon: Icon; color: string; title: string; meta: string; at: number; lat: number; lon: number; kind?: string; sat?: string };

export default function MapScreen() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const wide = winW >= 900;
  const { data, offline, loadedAt, refresh } = useData();
  const [view, setView] = useState("er");
  const [layers, setLayers] = useState<Layers>({ fire: true, quake: true, ship: true, sat: true, news: true });
  // Abspielen: Tag für Tag durch die letzten 7 Tage (Index in days), null = Zeitraum-Ansicht
  const [day, setDay] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<Mark | null>(null);
  const [span, setSpan] = useState(24 * 30);
  const [showLayers, setShowLayers] = useState(false);
  const [w, setW] = useState(0);
  // Kartengröße: am Computer die ganze Höhe neben der Liste, am Handy gut die Hälfte des Bildschirms
  const mw = Math.max(w - 2, 0);
  const top = ins.top + space.m + (wide ? space.xl : 0);
  const h = mw ? Math.round(wide ? Math.max(420, winH - top - 190) : Math.min(mw * 1.05, winH * 0.52)) : 0;
  const [box, setBox] = useState<Box | null>(null);
  const cur = box || (mw ? fit(HOME, h / mw) : HOME);
  // Zeitfenster: auf die Minute gerundet, damit die Karte nicht bei jedem Zeichnen neu rechnet
  const nowMin = Math.floor(Date.now() / 60e3) * 60e3;
  const days = useMemo(() => lastDays(nowMin), [Math.floor(nowMin / 3600e3)]);
  const range: Range = useMemo(() => (day != null && days[day] ? [days[day].start, days[day].end] : [nowMin - span * 3600e3, nowMin]), [day, days, span, nowMin]);
  const since = range[0];
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setDay((d) => { const n = d == null ? 0 : d + 1; if (n >= days.length) { setPlaying(false); return days.length - 1; } return n; }), 1600);
    return () => clearInterval(id);
  }, [playing, days.length]);

  const onLayout = (e: LayoutChangeEvent) => { const nw = Math.round(e.nativeEvent.layout.width); if (nw !== w) { setW(nw); setBox(null); setView("er"); } };
  /** Auf einen Punkt zoomen (etwa km nach jeder Seite) und die passende Markierung auswählen */
  const focusOn = (lat: number, lon: number, km = 120, pick?: (m: Mark) => boolean) => {
    if (!mw || !h) return;
    const [cx, cy] = proj(lat, lon), [ex] = proj(lat, lon + km / 111);
    const half = ex - cx;
    setBox(fit([cx - half, cy - half * (h / mw), half * 2, half * 2 * (h / mw)], h / mw));
    setView("");
    const m = pick ? marks.find(pick) : undefined;
    setSel(m || null);
  };
  // Von einer Ortsseite kommend: auf etwa 150 km um den Ort zoomen
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  useEffect(() => {
    const p = focus ? placeById(String(focus)) : undefined;
    if (!p || !mw || !h) return;
    focusOn(p.lat, p.lon, 150);
    router.setParams({ focus: undefined });
  }, [focus, mw, h]);
  const pickView = (key: string) => { setView(key); setSel(null); setBox(mw ? fit(VIEWS[key].box, h / mw) : null); };
  const marks = useMemo(() => (data ? marksOf(data, layers, range) : []), [data, layers, range]);
  const news = useMemo(() => (data ? newsAreas(data, range) : { areas: [], unplaced: 0 }), [data, range]);

  // Was die Karte zeigt, als Liste: neueste Ereignisse zuerst, dann wo die Hitzepunkte liegen, dann die Satelliten-Orte
  const rows = useMemo(() => {
    if (!data) return { events: [] as Row[], fires: [] as Row[], sats: [] as Row[], places: [] as Row[] };
    const events: Row[] = [];
    const within = (x: string) => +new Date(x) >= range[0] && +new Date(x) <= range[1];
    if (layers.ship) for (const m of data.maritime) if (within(m.t)) events.push({ key: `s${m.t}${m.lat}`, icon: "boat-outline", color: t.ship, title: m.title, meta: seaMeta(m), at: +new Date(m.t), lat: m.lat, lon: m.lon, kind: "ship" });
    if (layers.quake) for (const q of data.quakes) if (within(q.t)) events.push({ key: `q${q.t}${q.lat}`, icon: "pulse-outline", color: t.quake, title: q.title, meta: `${fmtWhen(q.t)} · USGS`, at: +new Date(q.t), lat: q.lat, lon: q.lon, kind: "quake" });
    events.sort((a, b) => b.at - a.at);
    const fires: Row[] = [];
    if (layers.fire && !data.firesError) {
      const by = new Map<string, { n: number; lat: number; lon: number; name: string }>();
      for (const f of data.fires) { const p = nearest(f.lat, f.lon); if (p.d > RADIUS.fire) continue; const x = by.get(p.p.id) || { n: 0, lat: p.p.lat, lon: p.p.lon, name: p.p.name }; x.n++; by.set(p.p.id, x); }
      for (const [id, x] of [...by.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 4))
        fires.push({ key: `f${id}`, icon: "flame-outline", color: t.fire, title: tr("{count} bei {place}", { count: plural(x.n, "Hitzepunkt", "Hitzepunkte"), place: x.name }), meta: tr("24 Std. · NASA FIRMS"), at: 0, lat: x.lat, lon: x.lon });
    }
    const sats: Row[] = data.sat.filter((p) => p.images.length).map((p) => ({ key: `p${p.id}`, icon: "planet-outline" as Icon, color: t.accent, title: p.name,
      meta: tr("Neuestes Bild {date}", { date: fmtCapDay(p.images[0].t) }), at: 0, lat: p.lat, lon: p.lon, sat: p.id }));
    const places: Row[] = layers.news ? news.areas.slice(0, 6).map((a) => ({ key: `n${a.p.id}`, icon: "chatbubbles-outline" as Icon, color: t.accent,
      title: tr("{place}: {count}", { place: a.p.name, count: a.items.length === 1 ? tr("1 Meldung") : tr("{n} Meldungen", { n: num(a.items.length) }) }),
      meta: `${tr("erwähnt, nicht verortet")} · ${tr("zuletzt {when}", { when: fmtWhen(Math.max(...a.items.map((i) => +new Date(i.published_at || i.fetched_at)))) })}`,
      at: 0, lat: a.p.lat, lon: a.p.lon })) : [];
    return { events, fires, sats, places };
  }, [data, layers, range, news, t]);

  const head = (
    <View style={{ paddingHorizontal: space.l, gap: space.m }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T v="display" accessibilityRole="header">{tr("Karte")}</T>
        <TabTools>{data && !wide ? (
          <Pressable onPress={() => { tap(); setShowLayers(!showLayers); }} accessibilityRole="button" accessibilityState={{ expanded: showLayers }} accessibilityLabel={tr("Ebenen und Zeitraum")}
            style={({ pressed }) => ({ height: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: showLayers ? t.ink : t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: showLayers ? t.ink : t.rule, opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="layers-outline" size={17} color={showLayers ? t.bg : t.ink} />
            <T v="smallStrong" color={showLayers ? t.bg : t.ink}>{tr("Ebenen")}</T>
          </Pressable>
        ) : null}</TabTools>
      </View>
      {offline && loadedAt ? <Banner icon="cloud-offline-outline" tone="warn" text={tr("Keine Verbindung. Stand: {ago}.", { ago: ago(loadedAt) })} action={tr("Erneut versuchen")} onAction={refresh} /> : null}
      <ChipRow>
        {Object.entries(VIEWS).map(([key, v]) => <Chip key={key} label={tr(v.label)} active={view === key} onPress={() => pickView(key)} />)}
      </ChipRow>
    </View>
  );

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top }}>
        {head}
        <View style={{ margin: space.l }}><Bone h={320} style={{ borderRadius: radius.l }} /></View>
      </View>
    );
  }
  const usgs = feedState(data, "usgs"), ukmto = feedState(data, "ukmto"), firms = feedState(data, "firms");
  const fireNote = data.firesError ? tr("Hitzepunkte nicht geladen") : !firms.ok ? noData(firms, "NASA FIRMS")
    : data.firesTotal > data.fires.length ? tr("{shown} von {total} Hitzepunkten, 24 Std. (NASA FIRMS)", { shown: num(data.fires.length), total: num(data.firesTotal) }) : tr("{count}, 24 Std. (NASA FIRMS)", { count: plural(data.fires.length, "Hitzepunkt", "Hitzepunkte") });
  const quakesIn = data.quakes.filter((q) => +new Date(q.t) >= since).length, shipsIn = data.maritime.filter((m) => +new Date(m.t) >= since).length;

  const layersPanel = (
    <View style={{ backgroundColor: t.card, borderRadius: radius.l, padding: space.m, gap: space.s, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, marginBottom: space.m }}>
      <T v="label" color={t.muted}>{tr("Ebenen")}</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {([
          ["fire", t.fire, tr("Hitzepunkte"), data.firesError || !firms.ok ? "–" : `${data.firesCapped ? "≥ " : ""}${num(data.firesTotal)}`],
          ["quake", t.quake, tr("Erdbeben"), usgs.ok ? num(span < 24 * 7 ? quakesIn : data.quakes.length) : "–"],
          ["ship", t.ship, tr("Vorfälle auf See"), ukmto.ok ? num(shipsIn) : "–"],
          ["sat", t.accent, tr("Satellitenbilder"), num(data.sat.filter((p) => p.images.length).length)],
          ["news", t.accent, tr("Erwähnte Orte"), num(news.areas.length)],
        ] as [keyof Layers, string, string, string][]).map(([key, c, label, n]) => (
          <Chip key={key} label={label} count={n as any} color={c} active={layers[key]} onPress={() => { setLayers({ ...layers, [key]: !layers[key] }); setSel(null); }} />
        ))}
      </View>
      <T v="label" color={t.muted} style={{ marginTop: 4 }}>{tr("Zeitraum für Meldungen, Erdbeben und Vorfälle auf See")}</T>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {SPANS.map(([hrs, label]) => <Chip key={hrs} label={tr(label)} active={day == null && span === hrs} onPress={() => { setPlaying(false); setDay(null); setSpan(hrs); }} />)}
      </View>
      {/* Abspielen: die letzten 7 Tage Tag für Tag */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
        {([["play-skip-back-outline", tr("Früherer Tag"), () => { setPlaying(false); setDay((d) => Math.max(0, (d ?? days.length) - 1)); }],
          [playing ? "pause" : "play", playing ? tr("Anhalten") : tr("Die letzten 7 Tage abspielen"), () => { if (playing) setPlaying(false); else { if (day == null || day >= days.length - 1) setDay(0); setPlaying(true); } }],
          ["play-skip-forward-outline", tr("Späterer Tag"), () => { setPlaying(false); setDay((d) => (d == null ? null : d + 1 >= days.length ? null : d + 1)); }]] as [Icon, string, () => void][]).map(([icon, label, fn]) => (
          <Pressable key={label} onPress={() => { tap(); fn(); }} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
            style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: t.cardAlt, opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name={icon} size={18} color={t.ink} />
          </Pressable>
        ))}
        <T v="small" color={t.ink} style={{ flex: 1 }} accessibilityLiveRegion="polite">{day != null ? tr("Tag {i} von 7: {date}", { i: day + 1, date: days[day]?.label }) : tr("Abspielen zeigt jeden der letzten 7 Tage einzeln.")}</T>
        {day != null ? <Pressable onPress={() => { tap(); setPlaying(false); setDay(null); }} accessibilityRole="button" hitSlop={8}><T v="smallStrong" color={t.accent}>{tr("Ende")}</T></Pressable> : null}
      </View>
      {day != null ? <T v="caption">{tr("Hitzepunkte gibt es nur für die letzten 24 Stunden; sie bleiben beim Abspielen gleich.")}</T> : null}
    </View>
  );

  const line = (r: Row, i: number, onPress: () => void) => (
    <Pressable key={r.key} onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.meta}`}
      style={({ pressed }) => ({ flexDirection: "row", gap: 12, paddingVertical: 11, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: t.cardAlt, marginTop: 1 }}>
        <Ionicons name={r.icon} size={16} color={r.color} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="body" color={t.ink} numberOfLines={2}>{r.title}</T>
        <T v="caption" style={{ marginTop: 2 }}>{r.meta}</T>
      </View>
      <Ionicons name={r.sat ? "chevron-forward" : "locate-outline"} size={16} color={t.faint} style={{ marginTop: 8 }} />
    </Pressable>
  );
  const near = (lat: number, lon: number) => (m: Mark) => Math.abs(m.x - proj(lat, lon)[0]) < 0.5 && Math.abs(m.y - proj(lat, lon)[1]) < 0.5;

  const panel = (
    <>
      {wide || showLayers ? layersPanel : null}
      <Head title={tr("Was die Karte zeigt")} first />
      {rows.events.length ? rows.events.map((r, i) => line(r, i, () => focusOn(r.lat, r.lon, 90, (m) => near(r.lat, r.lon)(m) && !m.pid)))
        : <T v="small">{tr("Keine Erdbeben oder Vorfälle auf See in diesem Zeitraum.")}</T>}
      {rows.places.length ? (
        <>
          <T v="label" color={t.muted} style={{ marginTop: space.l, marginBottom: 4 }}>{tr("Orte, die Meldungen nennen")}</T>
          {rows.places.map((r, i) => line(r, i, () => focusOn(r.lat, r.lon, 120, (m) => !!m.news && near(r.lat, r.lon)(m))))}
          <T v="caption" style={{ marginTop: 4 }}>{news.unplaced ? tr("{n} weitere Meldungen nennen keinen Ort, den Semay kennt, und stehen nicht auf der Karte.", { n: num(news.unplaced) }) : ""}</T>
        </>
      ) : null}
      {rows.fires.length ? (
        <>
          <T v="label" color={t.muted} style={{ marginTop: space.l, marginBottom: 4 }}>{tr("Wo die Hitzepunkte liegen")}</T>
          {rows.fires.map((r, i) => line(r, i, () => focusOn(r.lat, r.lon, 60)))}
          <T v="caption" style={{ marginTop: 4 }}>{tr("Ein Hitzepunkt zeigt Hitze, nicht ihre Ursache: oft Feldbrände, manchmal Kämpfe.")}</T>
        </>
      ) : null}
      {rows.sats.length && layers.sat ? (
        <>
          <Head title={tr("Satellitenbilder")} />
          <T v="small" style={{ marginBottom: 4 }}>{tr("Vorher und nachher vergleichen: dieselbe Stelle zu zwei Zeitpunkten.")}</T>
          {rows.sats.map((r, i) => line(r, i, () => router.push(`/satellite?place=${r.sat}`)))}
        </>
      ) : null}
      {/* Wie genau die Orte sind: nie ein erfundener Punkt */}
      <Head title={tr("Wie genau die Orte sind")} />
      <View style={{ gap: 6 }}>
        {([["dot", t.fire, tr("Genau: gemessen von Satelliten oder Sensoren (Hitzepunkte etwa 375 m, Erdbeben-Epizentrum)")],
          ["diamond", t.ship, tr("Ungefähr: Vorfälle auf See, so wie UKMTO sie angibt")],
          ["area", t.accent, tr("Fläche: Eine Meldung nennt den Ort. Erwähnt, nicht verortet; wo genau etwas geschah, wissen wir nicht.")],
          ["none", t.faint, tr("Unklar: Meldungen ohne bekannten Ortsnamen stehen nicht auf der Karte.")]] as [string, string, string][]).map(([shape, c, label]) => (
          <View key={label} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <View style={{ width: 16, alignItems: "center", paddingTop: 4 }}>
              <View style={shape === "dot" ? { width: 8, height: 8, borderRadius: 4, backgroundColor: c } : shape === "diamond" ? { width: 8, height: 8, backgroundColor: c, transform: [{ rotate: "45deg" }] }
                : shape === "area" ? { width: 14, height: 14, borderRadius: 7, borderWidth: 1.2, borderStyle: "dashed", borderColor: c, backgroundColor: "rgba(15,110,116,0.14)" } : { width: 10, height: 2, backgroundColor: c }} />
            </View>
            <T v="small" style={{ flex: 1 }}>{label}</T>
          </View>
        ))}
      </View>
      <T v="caption" style={{ marginTop: space.l }}>{layers.fire ? `${fireNote.replace(/\.$/, "")}. ` : ""}{tr("Gestrichelt: Regionsgrenzen. Umstritten: West-Tigray/Welkait, Raya, Badme, Las Anod. Grenzen nach Natural Earth. Darfur liegt westlich des Kartenausschnitts.")}</T>
      <Pressable onPress={() => { tap(); router.push("/places"); }} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", marginTop: space.s }}>
        <T v="smallStrong" color={t.accent}>{tr("Alle Orte")}</T>
      </Pressable>
    </>
  );

  const mapView = (
    <View onLayout={onLayout} style={{ flex: wide ? 1 : undefined, marginHorizontal: wide ? 0 : space.l, borderRadius: radius.l, overflow: "hidden", borderWidth: 1, borderColor: t.rule }}>
      {mw ? (
        <ZoomMap data={data} layers={layers} w={mw} h={h} box={cur} onBox={(b) => { setBox(b); setView(""); }} sel={sel} onSelect={setSel} range={range} home={FULL} />
      ) : <View style={{ height: 300 }} />}
      {/* Legende auf der Karte */}
      {!sel ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 8, bottom: 8, flexDirection: "row", flexWrap: "wrap", gap: 10, maxWidth: mw - 16,
          backgroundColor: t.card, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule }}>
          {([[tr("Hitze"), t.fire, "dot"], [tr("See"), t.ship, "diamond"], [tr("Beben"), t.quake, "ring"], [tr("Satellit"), t.accent, "square"], [tr("Erwähnt"), t.accent, "area"]] as [string, string, string][]).map(([label, c, shape]) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={shape === "dot" ? { width: 7, height: 7, borderRadius: 4, backgroundColor: c } : shape === "diamond" ? { width: 7, height: 7, backgroundColor: c, transform: [{ rotate: "45deg" }] }
                : shape === "ring" ? { width: 9, height: 9, borderRadius: 5, borderWidth: 1.6, borderColor: c } : shape === "area" ? { width: 11, height: 11, borderRadius: 6, borderWidth: 1.2, borderStyle: "dashed", borderColor: c } : { width: 8, height: 8, borderWidth: 1.5, borderColor: c }} />
              <T v="caption" color={t.ink}>{label}</T>
            </View>
          ))}
        </View>
      ) : null}
      {sel ? (
        <View style={{ position: "absolute", left: 8, right: 8, bottom: 8, backgroundColor: t.card, borderRadius: radius.l, padding: space.m,
          borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}
          accessibilityLiveRegion="polite">
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T v="label" color={t.accent}>{sel.pid && !sel.news ? sel.name : sel.kind}{sel.src ? ` · ${sel.src}` : ""}</T>
            <Pressable onPress={() => setSel(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr("Schließen")}><Ionicons name="close" size={20} color={t.faint} /></Pressable>
          </View>
          <T v="caption" style={{ marginTop: 2 }}>{sel.when}{sel.place ? ` · ${sel.place}` : ""}</T>
          {sel.text ? <T v="small" color={t.ink} style={{ marginTop: 4 }} numberOfLines={4}>{sel.text}</T> : null}
          <View style={{ flexDirection: "row", gap: space.s, marginTop: space.s }}>
            {sel.news ? <Button label={tr("Meldungen zu {place}", { place: sel.name })} icon="newspaper-outline" onPress={() => router.push(`/place/${sel.pid}`)} />
              : sel.pid ? <Button label={tr("Mehr zu {place}", { place: sel.name })} icon="location-outline" onPress={() => router.push(`/place/${sel.pid}`)} />
              : sel.sat ? <Button label={tr("Bilder vergleichen")} icon="images-outline" onPress={() => router.push(`/satellite?place=${sel.sat}`)} />
              : sel.url ? <Button label={tr("Bei {source} öffnen", { source: sel.src })} icon="open-outline" kind="secondary" onPress={() => openLink(sel.url)} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top }}>
        <View style={{ maxWidth: 1280, width: "100%", alignSelf: "center", flex: 1 }}>
          {head}
          <View style={{ flex: 1, flexDirection: "row", gap: space.l, padding: space.l }}>
            <View style={{ flex: 1 }}>{mapView}</View>
            <ScrollView style={{ width: 360, flexGrow: 0 }} contentContainerStyle={{ paddingBottom: space.xxl }}>{panel}</ScrollView>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top }}>
      {head}
      <View style={{ marginTop: space.m }}>{mapView}</View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.l, paddingBottom: space.xxl * 2 }}>{panel}</ScrollView>
    </View>
  );
}
