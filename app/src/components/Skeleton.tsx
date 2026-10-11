// Lade-Platzhalter in der Form des späteren Inhalts statt eines Kreisels. Bei „Bewegung reduzieren“ ohne Pulsieren.
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View, ViewStyle } from "react-native";
import { radius, space, useTheme } from "../lib/theme";

export function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setR);
    return () => sub?.remove?.();
  }, []);
  return r;
}

function usePulse() {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduce) { v.setValue(0.7); return; }
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.55, duration: 700, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [reduce]);
  return v;
}

export function Bone({ w = "100%", h = 14, style }: { w?: number | `${number}%`; h?: number; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ width: w, height: h, borderRadius: 6, backgroundColor: t.cardAlt }, style]} />;
}

/** Zeilen wie in der Meldungsliste */
export function Skeleton({ rows = 5 }: { rows?: number }) {
  const t = useTheme();
  const o = usePulse();
  return (
    <Animated.View style={{ opacity: o }} accessible accessibilityLabel="Wird geladen" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 12, paddingVertical: 14, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule }}>
          <Bone w={3} h={56} />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone w={i % 2 ? "92%" : "80%"} h={15} />
            <Bone w={i % 2 ? "60%" : "70%"} h={15} />
            <Bone w="40%" h={11} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

/** Platzhalter für die Lage: Kacheln und Karten */
export function LageSkeleton() {
  const t = useTheme();
  const o = usePulse();
  const card = { backgroundColor: t.card, borderRadius: radius.l, padding: space.l, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule } as const;
  return (
    <Animated.View style={{ opacity: o, gap: space.s }} accessible accessibilityLabel="Wird geladen" accessibilityRole="progressbar">
      <View style={[card, { gap: 10 }]}><Bone w="45%" h={11} /><Bone w="30%" h={22} /></View>
      <View style={{ flexDirection: "row", gap: space.s }}>
        {[0, 1].map((i) => <View key={i} style={[card, { flex: 1, gap: 8, minHeight: 92 }]}><Bone w="40%" h={22} /><Bone w="80%" h={11} /></View>)}
      </View>
      <View style={[card, { height: 180 }]} />
      <View style={[card, { gap: 10 }]}><Bone w="85%" h={15} /><Bone w="65%" h={15} /><Bone w="35%" h={11} /></View>
    </Animated.View>
  );
}
