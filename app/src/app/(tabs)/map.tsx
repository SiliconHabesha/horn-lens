// Karte: Hitzepunkte, Erdbeben, Vorfälle auf See und Satelliten-Orte. Zoomen, verschieben, antippen für Herkunft und Einzelheiten.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { boxOf, Box, fit, FULL, Layers, Mark, proj, ZoomMap } from "../../components/MapCanvas";
import { Bone } from "../../components/Skeleton";
import { Banner, Button, Chip, ChipRow, Group, Head, ListRow, openLink, PlainRow, T, TabTools, tap } from "../../components/ui";
import { placeById, seaMeta } from "../../lib/places";
import { ago, num, plural } from "../../lib/de";
import { useData } from "../../lib/data";
import { feedState, noData } from "../../lib/feeds";
import { radius, space, useTheme } from "../../lib/theme";

const VIEWS: Record<string, { label: string; box: Box }> = {
  all: { label: "Gesamt", box: FULL },
  north: { label: "Asmara und Tigray", box: boxOf(16.3, 36.3, 13.2, 40.2) },
  south: { label: "Assab und Bab el-Mandeb", box: boxOf(14.2, 41.3, 12.1, 43.9) },
};
const SPANS: [number, string][] = [[24, "24 Std."], [24 * 7, "7 Tage"], [24 * 30, "30 Tage"]];

export default function MapScreen() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const { data, offline, loadedAt, refresh } = useData();
  const [view, setView] = useState("all");
  const [layers, setLayers] = useState<Layers>({ fire: true, quake: true, ship: true, sat: true });
  const [sel, setSel] = useState<Mark | null>(null);
  const [span, setSpan] = useState(24 * 30);
  const [showLayers, setShowLayers] = useState(false);
  const [w, setW] = useState(0);
  // Kartenhöhe: fast quadratisch, aber höchstens gut die Hälfte des Bildschirms, damit darunter Platz bleibt
  const mw = Math.max(w - 2, 0);
  const h = mw ? Math.round(Math.min(mw * 0.96, winH * 0.56)) : 0;
  const [box, setBox] = useState<Box | null>(null);
  const cur = box || (mw ? fit(FULL, h / mw) : FULL);
  const since = Date.now() - span * 3600e3;

  const onLayout = (e: LayoutChangeEvent) => { const nw = Math.round(e.nativeEvent.layout.width); if (nw !== w) { setW(nw); setBox(null); setView("all"); } };
  // Von einer Ortsseite kommend: auf etwa 150 km um den Ort zoomen
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  useEffect(() => {
    const p = focus ? placeById(String(focus)) : undefined;
    if (!p || !mw || !h) return;
    const [cx, cy] = proj(p.lat, p.lon), [ex] = proj(p.lat, p.lon + 1.4);
    const half = ex - cx;
    setBox(fit([cx - half, cy - half * (h / mw), half * 2, half * 2 * (h / mw)], h / mw));
    setView("");
    setSel(null);
    router.setParams({ focus: undefined });
  }, [focus, mw, h]);
  const pickView = (key: string) => { setView(key); setSel(null); setBox(mw ? fit(VIEWS[key].box, h / mw) : null); };

  const head = (
    <View style={{ paddingHorizontal: space.l, gap: space.m }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T v="display" accessibilityRole="header">Karte</T>
        <TabTools>{data ? (
          <Pressable onPress={() => { tap(); setShowLayers(!showLayers); }} accessibilityRole="button" accessibilityState={{ expanded: showLayers }} accessibilityLabel="Ebenen und Zeitraum"
            style={({ pressed }) => ({ height: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: showLayers ? t.ink : t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: showLayers ? t.ink : t.rule, opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="layers-outline" size={17} color={showLayers ? t.bg : t.ink} />
            <T v="smallStrong" color={showLayers ? t.bg : t.ink}>Ebenen</T>
          </Pressable>
        ) : null}</TabTools>
      </View>
      {offline && loadedAt ? <Banner icon="cloud-offline-outline" tone="warn" text={`Keine Verbindung. Stand: ${ago(loadedAt)}.`} action="Erneut versuchen" onAction={refresh} /> : null}
      <ChipRow>
        {Object.entries(VIEWS).map(([key, v]) => <Chip key={key} label={v.label} active={view === key} onPress={() => pickView(key)} />)}
      </ChipRow>
    </View>
  );

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + space.m + (winW >= 900 ? space.xl : 0) }}>
        {head}
        <View style={{ margin: space.l }}><Bone h={320} style={{ borderRadius: radius.l }} /></View>
      </View>
    );
  }
  const usgs = feedState(data, "usgs"), ukmto = feedState(data, "ukmto"), firms = feedState(data, "firms");
  const fireNote = data.firesError ? "Hitzepunkte nicht geladen" : !firms.ok ? noData(firms, "NASA FIRMS")
    : data.firesTotal > data.fires.length ? `${num(data.fires.length)} von ${num(data.firesTotal)} Hitzepunkten, 24 Std. (NASA FIRMS)` : `${plural(data.fires.length, "Hitzepunkt", "Hitzepunkte")}, 24 Std. (NASA FIRMS)`;
  const quakesIn = data.quakes.filter((q) => +new Date(q.t) >= since).length, shipsIn = data.maritime.filter((m) => +new Date(m.t) >= since).length;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + space.m + (winW >= 900 ? space.xl : 0) }}>
      <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
        {head}
        <View onLayout={onLayout} style={{ marginTop: space.m, marginHorizontal: space.l, borderRadius: radius.l, overflow: "hidden", borderWidth: 1, borderColor: t.rule }}>
          {mw ? (
            <ZoomMap data={data} layers={layers} w={mw} h={h} box={cur} onBox={(b) => { setBox(b); setView(""); }} sel={sel} onSelect={setSel} since={since} />
          ) : <View style={{ height: 300 }} />}
          {sel ? (
            <View style={{ position: "absolute", left: 8, right: 8, bottom: 8, backgroundColor: t.card, borderRadius: radius.l, padding: space.m,
              borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}
              accessibilityLiveRegion="polite">
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <T v="label" color={t.accent}>{sel.pid ? sel.name : sel.kind}{sel.src ? ` · ${sel.src}` : ""}</T>
                <Pressable onPress={() => setSel(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Schließen"><Ionicons name="close" size={20} color={t.faint} /></Pressable>
              </View>
              <T v="caption" style={{ marginTop: 2 }}>{sel.when}{sel.place ? ` · ${sel.place}` : ""}</T>
              {sel.text ? <T v="small" color={t.ink} style={{ marginTop: 4 }} numberOfLines={4}>{sel.text}</T> : null}
              <View style={{ flexDirection: "row", gap: space.s, marginTop: space.s }}>
                {sel.pid ? <Button label={`Mehr zu ${sel.name}`} icon="location-outline" onPress={() => router.push(`/place/${sel.pid}`)} />
                  : sel.sat ? <Button label="Bilder vergleichen" icon="images-outline" onPress={() => router.push(`/satellite?place=${sel.sat}`)} />
                  : sel.url ? <Button label={`Bei ${sel.src} öffnen`} icon="open-outline" kind="secondary" onPress={() => openLink(sel.url)} /> : null}
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.l, paddingBottom: space.xxl * 2, maxWidth: 760, width: "100%", alignSelf: "center" }}>
        {/* Ebenen und Zeitraum nur bei Bedarf */}
        {showLayers ? (
        <View style={{ backgroundColor: t.card, borderRadius: radius.l, padding: space.m, gap: space.s, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, marginBottom: space.m }}>
        <T v="label" color={t.muted}>Ebenen</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {([
            ["fire", t.fire, "Hitzepunkte", data.firesError || !firms.ok ? "–" : `${data.firesCapped ? "≥ " : ""}${num(data.firesTotal)}`],
            ["quake", t.quake, "Erdbeben", usgs.ok ? num(span < 24 * 7 ? quakesIn : data.quakes.length) : "–"],
            ["ship", t.ship, "Vorfälle auf See", ukmto.ok ? num(shipsIn) : "–"],
            ["sat", t.accent, "Satellitenbilder", num(data.sat.filter((p) => p.images.length).length)],
          ] as [keyof Layers, string, string, string][]).map(([key, c, label, n]) => (
            <Chip key={key} label={label} count={n as any} color={c} active={layers[key]} onPress={() => { setLayers({ ...layers, [key]: !layers[key] }); setSel(null); }} />
          ))}
        </View>
        <T v="label" color={t.muted} style={{ marginTop: 4 }}>Zeitraum für Erdbeben und Vorfälle auf See</T>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {SPANS.map(([hrs, label]) => <Chip key={hrs} label={label} active={span === hrs} onPress={() => setSpan(hrs)} />)}
        </View>
        </View>
        ) : null}
        {/* Legende: welche Form steht wofür */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: space.l, rowGap: 6 }} accessible accessibilityLabel="Legende: Punkt Hitzepunkt, Ring Erdbeben, Raute Vorfall auf See, Quadrat Satellitenbilder">
          {([
            ["Hitzepunkt", <View key="f" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.fire }} />],
            ["Erdbeben", <View key="q" style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: t.quake }} />],
            ["Vorfall auf See", <View key="s" style={{ width: 9, height: 9, backgroundColor: t.ship, transform: [{ rotate: "45deg" }] }} />],
            ["Satellitenbilder", <View key="a" style={{ width: 10, height: 10, borderWidth: 1.6, borderColor: t.accent }} />],
          ] as [string, React.ReactNode][]).map(([label, icon]) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 12, alignItems: "center" }}>{icon}</View><T v="caption" color={t.ink}>{label}</T>
            </View>
          ))}
        </View>
        <T v="caption" style={{ marginTop: 6 }}>{layers.fire ? `${fireNote.replace(/\.$/, "")}. ` : ""}Gestrichelt: Regionsgrenzen. Umstritten: West-Tigray/Welkait, Raya, Badme. Grenzen nach Natural Earth.</T>

        {layers.ship && data.maritime.length ? (
          <>
            <Head title="Vorfälle auf See" />
            {data.maritime.filter((m) => +new Date(m.t) >= since).length === 0 ? <T v="small">Keine Vorfälle in diesem Zeitraum.</T> : null}
            {data.maritime.filter((m) => +new Date(m.t) >= since).map((m, i) => (
              <PlainRow key={i} first={i === 0} title={m.title} meta={seaMeta(m)} external onPress={() => openLink(m.url || "https://www.ukmto.org/recent-incidents")} />
            ))}
            {data.maritime.length - shipsIn > 0 ? <T v="caption" style={{ marginTop: 6 }}>{plural(data.maritime.length - shipsIn, "älterer Vorfall", "ältere Vorfälle")} ausgeblendet, auf der Karte blass.</T> : null}
          </>
        ) : null}

        <Head title="Weiter zu" />
        <Group>
          <ListRow first icon="planet-outline" label="Satellitenbilder" sub={`${data.sat.length} Orte, vorher und nachher vergleichen`} onPress={() => router.push("/satellite")} />
          <ListRow icon="location-outline" label="Orte" sub="Alles zu einem Ort auf einer Seite" onPress={() => router.push("/places")} />
        </Group>
      </ScrollView>
    </View>
  );
}
