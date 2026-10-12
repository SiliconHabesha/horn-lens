// Das Himmelsband oben auf der Lage: „Auf einen Blick“ in wenigen Sätzen und die Region als kleine Karte.
// Immer im dunklen Farbschema (Tiefsee), in beiden Modi: der „Himmel“ von Semay. Wer nur dieses Band liest, kennt die Lage.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, useColorScheme, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BriefLine } from "../lib/brief";
import { BRAND, ForceDark, radius, space, useTheme } from "../lib/theme";
import type { Data } from "../lib/types";
import { Logo } from "./Logo";
import { boxOf, fit, MapSvg } from "./MapCanvas";
import { T, TabTools, tap } from "./ui";

// Ausschnitt: Eritrea mit Grenzgebiet zu Tigray, Afar und dem Roten Meer bis Bab el-Mandeb
const REGION = boxOf(18.4, 36.1, 12.0, 43.7);

export function SkyBand(props: { data: Data; day: string; stand: string; brief: BriefLine[] }) {
  // Helle Statusleiste über dem dunklen Band; beim Verlassen zurück zum Schema der App
  const scheme = useColorScheme();
  useFocusEffect(useCallback(() => {
    setStatusBarStyle("light");
    return () => setStatusBarStyle(scheme === "dark" ? "light" : "dark");
  }, [scheme]));
  return <ForceDark.Provider value={true}><Inner {...props} /></ForceDark.Provider>;
}

const go = (to: string) => { tap(); router.navigate(`${to}${to.includes("?") ? "&" : "?"}k=${Date.now()}` as any); };

function Inner({ data, day, stand, brief }: { data: Data; day: string; stand: string; brief: BriefLine[] }) {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 900;
  const [w, setW] = useState(0);
  const h = Math.round(Math.min(Math.max(w * (wide ? 1.05 : 0.6), 180), wide ? 400 : 260));
  return (
    <View style={{ backgroundColor: BRAND.ink, paddingTop: ins.top + space.m + (wide ? space.l : 0), paddingBottom: space.xl, paddingHorizontal: space.l,
      borderBottomLeftRadius: wide ? 0 : 24, borderBottomRightRadius: wide ? 0 : 24 }}>
      <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
        {wide ? null : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m, marginBottom: space.l }}>
            <Logo size={18} color={t.ink} />
            <TabTools />
          </View>
        )}
        <T v="display" accessibilityRole="header">Lage</T>
        <T v="small" style={{ marginTop: 2 }}>{day}, Stand {stand} Uhr</T>

        <View style={{ flexDirection: wide ? "row" : "column", gap: wide ? space.xl : 0, marginTop: space.l, alignItems: wide ? "flex-start" : "stretch" }}>
          {/* Auf einen Blick: ein Satz je Thema, Wichtigstes zuerst */}
          <View style={{ flex: wide ? 5 : undefined }} accessibilityRole="list">
            {brief.map((b, i) => (
              <Pressable key={`${b.head}${i}`} onPress={() => go(b.to)} accessibilityRole="button" accessibilityLabel={`${b.head}: ${b.text} Quelle: ${b.src}`}
                style={({ pressed }) => ({ flexDirection: "row", gap: 12, paddingVertical: 11, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 1,
                  backgroundColor: b.alert ? t.warn : "rgba(237,240,238,0.08)" }}>
                  <Ionicons name={b.icon} size={16} color={b.alert ? BRAND.ink : t.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="body" color={t.ink}><T v="bodyStrong" color={b.alert ? t.warn : t.ink}>{b.head}. </T>{b.text}</T>
                  <T v="caption" style={{ marginTop: 2 }}>{b.src}</T>
                </View>
                <Ionicons name="chevron-forward" size={15} color={t.faint} style={{ marginTop: 8 }} />
              </Pressable>
            ))}
          </View>

          {/* Die Region als Bild. Antippen öffnet die große Karte. */}
          <Pressable onPress={() => go("/map")} accessibilityRole="button" accessibilityLabel="Karte der Region mit Hitzepunkten, Erdbeben und Vorfällen auf See. Öffnet die große Karte."
            onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
            style={({ pressed }) => ({ flex: wide ? 4 : undefined, marginTop: wide ? 0 : space.m, borderRadius: radius.l, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.85 : 1 })}>
            <View pointerEvents="none">
              {w ? <MapSvg data={data} layers={{ fire: true, quake: true, ship: true, sat: false }} box={fit(REGION, h / w)} w={w} h={h} mini /> : <View style={{ height: 200 }} />}
            </View>
            <View pointerEvents="none" style={{ position: "absolute", right: 10, top: 10, flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: "rgba(14,26,31,0.82)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Ionicons name="expand-outline" size={13} color={t.ink} />
              <T v="caption" color={t.ink}>Karte</T>
            </View>
            {/* Legende in einer Zeile */}
            <View pointerEvents="none" style={{ position: "absolute", left: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: "rgba(14,26,31,0.82)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Legend color={t.fire} label="Hitze" shape="dot" />
              <Legend color={t.ship} label="See" shape="diamond" />
              <Legend color={t.quake} label="Beben" shape="ring" />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Legend({ color, label, shape }: { color: string; label: string; shape: "dot" | "diamond" | "ring" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={shape === "dot" ? { width: 7, height: 7, borderRadius: 4, backgroundColor: color }
        : shape === "diamond" ? { width: 7, height: 7, backgroundColor: color, transform: [{ rotate: "45deg" }] }
        : { width: 9, height: 9, borderRadius: 5, borderWidth: 1.6, borderColor: color }} />
      <T v="caption">{label}</T>
    </View>
  );
}
