// Karte: Hitzepunkte, Erdbeben, Vorfälle auf See und Satelliten-Orte. Zoomen, verschieben, antippen für Herkunft und Einzelheiten.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { boxOf, Box, fit, FULL, Layers, Mark, ZoomMap } from "../../components/MapCanvas";
import { Bone } from "../../components/Skeleton";
import { Banner, Button, Chip, ChipRow, openLink, T } from "../../components/ui";
import { ago, fmtFull, num, plural } from "../../lib/de";
import { useData } from "../../lib/data";
import { feedState, noData } from "../../lib/feeds";
import { font, radius, space, useTheme } from "../../lib/theme";

const VIEWS: Record<string, { label: string; box: Box }> = {
  all: { label: "Gesamt", box: FULL },
  north: { label: "Asmara und Tigray", box: boxOf(16.3, 36.3, 13.2, 40.2) },
  south: { label: "Assab und Bab el-Mandeb", box: boxOf(14.2, 41.3, 12.1, 43.9) },
};
const SPANS: [number, string][] = [[24, "24 Std."], [24 * 7, "7 Tage"], [24 * 30, "30 Tage"]];

export default function MapScreen() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const { data, offline, loadedAt, refresh } = useData();
  const [view, setView] = useState("all");
  const [layers, setLayers] = useState<Layers>({ fire: true, quake: true, ship: true, sat: true });
  const [sel, setSel] = useState<Mark | null>(null);
  const [span, setSpan] = useState(24 * 30);
  const [w, setW] = useState(0);
  // Kartenhöhe: fast quadratisch, aber höchstens gut die Hälfte des Bildschirms, damit darunter Platz bleibt
  const mw = Math.max(w - 2, 0);
  const h = mw ? Math.round(Math.min(mw * 0.96, winH * 0.56)) : 0;
  const [box, setBox] = useState<Box | null>(null);
  const cur = box || (mw ? fit(FULL, h / mw) : FULL);
  const since = Date.now() - span * 3600e3;

  const onLayout = (e: LayoutChangeEvent) => { const nw = Math.round(e.nativeEvent.layout.width); if (nw !== w) { setW(nw); setBox(null); setView("all"); } };
  const pickView = (key: string) => { setView(key); setSel(null); setBox(mw ? fit(VIEWS[key].box, h / mw) : null); };

  const head = (
    <View style={{ paddingHorizontal: space.l, gap: space.m }}>
      <View>
        <T v="display" accessibilityRole="header">Karte</T>
        <T v="small" style={{ marginTop: 4 }}>Messwerte rund um Eritrea. Mit zwei Fingern zoomen, auf eine Markierung tippen.</T>
      </View>
      {offline && loadedAt ? <Banner icon="cloud-offline-outline" tone="warn" text={`Keine Verbindung. Stand: ${ago(loadedAt)}.`} action="Erneut" onAction={refresh} /> : null}
      <ChipRow>
        {Object.entries(VIEWS).map(([key, v]) => <Chip key={key} label={v.label} active={view === key} onPress={() => pickView(key)} />)}
      </ChipRow>
    </View>
  );

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + space.m }}>
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
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + space.m }}>
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
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: space.s, flexWrap: "wrap" }}>
          <T v="h3">Zeitraum</T>
          <T v="caption">Ältere Erdbeben und Vorfälle erscheinen blass.</T>
        </View>
        <ChipRow>
          {SPANS.map(([hrs, label]) => <Chip key={hrs} label={label} active={span === hrs} onPress={() => setSpan(hrs)} />)}
        </ChipRow>

        <T v="h3" style={{ marginTop: space.l, marginBottom: space.s }}>Ebenen</T>
        <View style={{ gap: 2 }}>
          {([
            ["fire", t.fire, "flame", fireNote],
            ["quake", t.quake, "radio-button-off", usgs.ok ? `${num(data.quakes.length)} Erdbeben ab Stärke 2,5, 7 Tage (USGS)${span < 24 * 7 ? `; ${num(quakesIn)} im Zeitraum` : ""}` : noData(usgs, "USGS")],
            ["ship", t.ship, "boat", ukmto.ok ? `${plural(data.maritime.length, "Vorfall", "Vorfälle")} auf See, 30 Tage (UKMTO)${span < 24 * 30 ? `; ${num(shipsIn)} im Zeitraum` : ""}` : noData(ukmto, "UKMTO")],
            ["sat", t.accent, "scan", `${plural(data.sat.filter((p) => p.images.length).length, "Satelliten-Ort", "Satelliten-Orte")} mit Vorher-Nachher-Bildern`],
          ] as [keyof Layers, string, keyof typeof Ionicons.glyphMap, string][]).map(([key, c, icon, label]) => (
            <Pressable key={key} onPress={() => { setLayers({ ...layers, [key]: !layers[key] }); setSel(null); }} accessibilityRole="switch" accessibilityState={{ checked: layers[key] }} accessibilityLabel={label}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, opacity: pressed ? 0.6 : layers[key] ? 1 : 0.5 })}>
              <Ionicons name={layers[key] ? "checkbox" : "square-outline"} size={22} color={c} />
              <Ionicons name={icon} size={16} color={c} />
              <T v="small" color={t.ink} style={{ flex: 1 }}>{label}</T>
            </Pressable>
          ))}
        </View>
        <T v="caption" style={{ marginTop: space.m }}>Gestrichelt: amtliche Regionsgrenzen (Natural Earth); West-Tigray ist seit 2020 umstritten. Ein Feuer wird oft von mehreren Satelliten erfasst. Ein Hitzepunkt zeigt Wärme, nicht ihre Ursache.</T>

        {data.maritime.length ? (
          <>
            <T v="h3" style={{ marginTop: space.xl, marginBottom: space.s }}>Vorfälle auf See</T>
            {data.maritime.map((m, i) => (
              <Pressable key={i} onPress={() => openLink(m.url || "https://www.ukmto.org/recent-incidents")} accessibilityRole="link"
                style={({ pressed }) => ({ paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : +new Date(m.t) < since ? 0.55 : 1 })}>
                <T v="caption">{fmtFull(m.t)} · UKMTO</T>
                <T v="bodyStrong" style={{ fontFamily: font.semibold }}>{m.title}</T>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
