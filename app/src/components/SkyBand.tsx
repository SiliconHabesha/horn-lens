// Das Himmelsband oben auf der Lage: Marke, Datum, Neues seit dem letzten Besuch, die Region als kleine Karte
// und die vier wichtigsten Messwerte. Immer im dunklen Farbschema (Tiefsee), in beiden Modi: der „Himmel“ von Semay.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { useColorScheme } from "react-native";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { boxOf, fit, MapSvg } from "./MapCanvas";
import { Logo } from "./Logo";
import { T, TabTools, tap } from "./ui";
import type { Data } from "../lib/types";
import { BRAND, ForceDark, font, radius, space, useTheme } from "../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
export type Tile = { icon: Icon; label: string; hint: string; value: string; tone?: "alert" | "none"; to: string };
export type Line = { text: string; to: string };

// Ausschnitt: Eritrea mit Grenzgebiet zu Tigray, Afar und dem Roten Meer bis Bab el-Mandeb
const REGION = boxOf(18.4, 36.1, 12.0, 43.7);

export function SkyBand(props: { data: Data; day: string; stand: string; lines: Line[]; tiles: Tile[] }) {
  // Helle Statusleiste über dem dunklen Band; beim Verlassen zurück zum Schema der App
  const scheme = useColorScheme();
  useFocusEffect(useCallback(() => {
    setStatusBarStyle("light");
    return () => setStatusBarStyle(scheme === "dark" ? "light" : "dark");
  }, [scheme]));
  return <ForceDark.Provider value={true}><Inner {...props} /></ForceDark.Provider>;
}

function Inner({ data, day, stand, lines, tiles }: { data: Data; day: string; stand: string; lines: Line[]; tiles: Tile[] }) {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 900;
  const [w, setW] = useState(0);
  const h = Math.round(Math.min(Math.max(w * (wide ? 0.72 : 0.7), 200), 320));
  const go = (to: string) => { tap(); router.navigate(`${to}${to.includes("?") ? "&" : "?"}k=${Date.now()}` as any); };
  return (
    <View style={{ backgroundColor: BRAND.ink, paddingTop: ins.top + space.m + (wide ? space.l : 0), paddingBottom: space.l, paddingHorizontal: space.l,
      borderBottomLeftRadius: wide ? 0 : 24, borderBottomRightRadius: wide ? 0 : 24 }}>
      <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
          {wide ? <View /> : <Logo size={18} color={t.ink} />}
          <TabTools />
        </View>

        <T v="display" accessibilityRole="header" style={{ marginTop: wide ? 0 : space.l }}>Lage</T>
        <T v="small" style={{ marginTop: 2 }}>{day} · Stand {stand} Uhr</T>

        {lines.length ? (
          <View style={{ marginTop: space.s }}>
            {lines.map((n) => (
              <Pressable key={n.to} onPress={() => go(n.to)} accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 34, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.accent }} />
                <T v="smallStrong" color={t.accent} style={{ flex: 1 }}>{n.text}</T>
                <Ionicons name="chevron-forward" size={15} color={t.accent} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: wide ? "row" : "column", gap: wide ? space.m : 0, marginTop: space.m }}>
        {/* Die Region auf einen Blick. Antippen öffnet die große Karte. */}
        <Pressable onPress={() => go("/map")} accessibilityRole="button" accessibilityLabel="Karte der Region mit Hitzepunkten, Erdbeben und Vorfällen auf See. Öffnet die große Karte."
          onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
          style={({ pressed }) => ({ flex: wide ? 3 : undefined, borderRadius: radius.l, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.85 : 1 })}>
          <View pointerEvents="none">
            {w ? <MapSvg data={data} layers={{ fire: true, quake: true, ship: true, sat: false }} box={fit(REGION, h / w)} w={w} h={h} mini /> : <View style={{ height: 200 }} />}
          </View>
          <View pointerEvents="none" style={{ position: "absolute", right: 10, top: 10, flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: "rgba(14,26,31,0.82)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Ionicons name="expand-outline" size={13} color={t.ink} />
            <T v="caption" color={t.ink}>Karte</T>
          </View>
        </Pressable>

        {/* Die vier Messwerte, je eine Kachel. Ohne aktuelle Daten ein Strich, nie eine Null. */}
        <View style={{ flex: wide ? 2 : undefined, flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start", gap: 8, marginTop: wide ? 0 : space.m }}>
          {tiles.map((x) => (
            <Pressable key={x.label} onPress={() => go(x.to)} accessibilityRole="button"
              accessibilityLabel={`${x.label}, ${x.hint}: ${x.value === "–" ? "keine aktuellen Daten" : x.value}`}
              style={({ pressed }) => ({ flexGrow: 1, flexBasis: "45%", minHeight: wide ? 0 : 74, height: wide ? (h - 8) / 2 : undefined, justifyContent: wide ? "center" : undefined, padding: 12, borderRadius: radius.m,
                backgroundColor: "rgba(237,240,238,0.07)", opacity: pressed ? 0.6 : 1 })}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name={x.icon} size={15} color={x.tone === "alert" ? t.warn : t.muted} />
                <T v="caption" numberOfLines={1} style={{ flexShrink: 1 }}>{x.label}</T>
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <T style={{ fontFamily: font.black, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: x.tone === "alert" ? t.warn : x.value === "–" ? t.faint : t.ink }}>{x.value}</T>
                <T v="caption" color={t.faint}>{x.hint}</T>
              </View>
            </Pressable>
          ))}
        </View>
        </View>
      </View>
    </View>
  );
}
