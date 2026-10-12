// Kurze Bestätigung unten am Bildschirm („Gemerkt“, „Link kopiert“). Verschwindet von selbst; Bildschirmleser lesen sie vor.
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
import { AccessibilityInfo, Animated, Platform, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, space, useTheme } from "../lib/theme";
import { useReduceMotion } from "./Skeleton";
import { T } from "./ui";

type Msg = { text: string; icon: keyof typeof Ionicons.glyphMap; id: number; action?: { label: string; run: () => void } };
let listener: ((m: Msg) => void) | null = null;
let seq = 0;
export function toast(text: string, icon: keyof typeof Ionicons.glyphMap = "checkmark-circle", action?: Msg["action"]) {
  listener?.({ text, icon, id: ++seq, action });
  AccessibilityInfo.announceForAccessibility?.(text);
}

export function ToastHost() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  // Über der Tab-Leiste nur auf den Haupt-Bildschirmen mit Leiste unten; sonst nah am unteren Rand
  const path = usePathname();
  const { width } = useWindowDimensions();
  const overTabs = width < 900 && ["/", "/news", "/claims", "/map"].includes(path);
  const reduce = useReduceMotion();
  const [msg, setMsg] = useState<Msg | null>(null);
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mit Bildschirmleser länger stehen lassen, damit „Rückgängig“ erreichbar bleibt
  const sr = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled?.().then((v) => { sr.current = v; }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("screenReaderChanged", (v: boolean) => { sr.current = v; });
    return () => sub?.remove?.();
  }, []);
  useEffect(() => {
    listener = (m) => {
      setMsg(m);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(v, { toValue: 1, duration: reduce ? 0 : 180, useNativeDriver: Platform.OS !== "web" }).start();
      timer.current = setTimeout(() => Animated.timing(v, { toValue: 0, duration: reduce ? 0 : 220, useNativeDriver: Platform.OS !== "web" }).start(({ finished }) => { if (finished) setMsg(null); }), (m.action ? 4000 : 2200) * (sr.current ? 2.5 : 1));
    };
    return () => { listener = null; if (timer.current) clearTimeout(timer.current); };
  }, [reduce]);
  if (!msg) return null;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: ins.bottom + (overTabs ? 76 : 20), alignItems: "center" }}>
      <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.ink, borderRadius: radius.pill, paddingHorizontal: space.l, paddingVertical: 10,
        shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6, maxWidth: 420 }}>
        <Ionicons name={msg.icon} size={18} color={t.bg} />
        <T v="smallStrong" color={t.bg} style={{ flexShrink: 1 }}>{msg.text}</T>
        {msg.action ? (
          <Pressable onPress={() => { msg.action!.run(); setMsg(null); }} accessibilityRole="button" accessibilityLabel={`${msg.action.label}: ${msg.text}`} hitSlop={12} style={{ marginLeft: 8, minHeight: 32, justifyContent: "center" }}>
            <T v="smallStrong" color={t.dark ? "#0F6E74" : "#7FD3D5"}>{msg.action.label}</T>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
