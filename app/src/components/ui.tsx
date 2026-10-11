// Bausteine der Oberfläche: Text, Karten, Chips, Status, Kopfzeilen.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextProps, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ago, STATUS } from "../lib/de";
import { useData } from "../lib/data";
import { font, radius, space, useTheme } from "../lib/theme";

export const tap = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); };

export async function openLink(url: string | null | undefined) {
  if (!url) return;
  if (Platform.OS === "web") { window.open(url, "_blank", "noopener"); return; }
  try { await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }); }
  catch { Linking.openURL(url).catch(() => {}); }
}

type V = "display" | "title" | "h2" | "h3" | "body" | "bodyStrong" | "small" | "smallStrong" | "caption" | "label";
const VAR: Record<V, { size: number; line: number; family: string; spacing?: number; upper?: boolean }> = {
  display: { size: 34, line: 38, family: font.black, spacing: -0.8 },
  title: { size: 26, line: 31, family: font.black, spacing: -0.5 },
  h2: { size: 20, line: 25, family: font.bold, spacing: -0.3 },
  h3: { size: 16, line: 21, family: font.semibold },
  body: { size: 15.5, line: 22, family: font.regular },
  bodyStrong: { size: 15.5, line: 22, family: font.semibold },
  small: { size: 13.5, line: 19, family: font.regular },
  smallStrong: { size: 13.5, line: 19, family: font.semibold },
  caption: { size: 12, line: 16, family: font.medium },
  label: { size: 11.5, line: 14, family: font.bold, spacing: 0.7, upper: true },
};
export function T({ v = "body", color, style, children, ...rest }: TextProps & { v?: V; color?: string }) {
  const t = useTheme();
  const s = VAR[v];
  const muted = v === "small" || v === "caption";
  return (
    <Text {...rest} style={[{ fontSize: s.size, lineHeight: s.line, fontFamily: s.family, letterSpacing: s.spacing, color: color || (muted ? t.muted : t.ink),
      textTransform: s.upper ? "uppercase" : undefined }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void; accessibilityLabel?: string }) {
  const t = useTheme();
  const base: ViewStyle = { backgroundColor: t.card, borderRadius: radius.l, padding: space.l, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule };
  if (!onPress) return <View style={[base, style as any]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [base, style as any, pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function Chip({ label, count, active, onPress, color }: { label: string; count?: number; active?: boolean; onPress: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, height: 34, borderRadius: radius.pill,
        backgroundColor: active ? t.ink : t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: active ? t.ink : t.rule, opacity: pressed ? 0.7 : 1 })}>
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      <T v="smallStrong" color={active ? t.bg : t.ink}>{label}</T>
      {count != null ? <T v="caption" color={active ? t.bg : t.muted}>{count}</T> : null}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.l, paddingVertical: 2 }}
      style={{ flexGrow: 0, marginHorizontal: -space.l }}>
      {children}
    </ScrollView>
  );
}

export function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const t = useTheme();
  const c = t.status[status] || t.muted;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
      <View style={{ width: small ? 7 : 9, height: small ? 7 : 9, borderRadius: 5, backgroundColor: c }} />
      <T v="label" color={c} style={status === "false" ? { textDecorationLine: "line-through" } : undefined}>{STATUS[status]?.[0] || status}</T>
    </View>
  );
}

export function SectionHead({ title, action, onAction, sub }: { title: string; action?: string; onAction?: () => void; sub?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: space.xl, marginBottom: space.s }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <T v="h2" accessibilityRole="header">{title}</T>
        {action && onAction ? (
          <Pressable onPress={() => { tap(); onAction(); }} hitSlop={10} accessibilityRole="button">
            <T v="smallStrong" color={t.accent}>{action}</T>
          </Pressable>
        ) : null}
      </View>
      {sub ? <T v="small" style={{ marginTop: 2 }}>{sub}</T> : null}
    </View>
  );
}

export function Banner({ icon, text, tone = "info", action, onAction }: { icon: keyof typeof Ionicons.glyphMap; text: string; tone?: "info" | "warn"; action?: string; onAction?: () => void }) {
  const t = useTheme();
  const bg = tone === "warn" ? t.warnBg : t.cardAlt;
  const fg = tone === "warn" ? t.warn : t.ink;
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: bg, borderRadius: radius.m, padding: space.m, marginBottom: space.m }}>
      <Ionicons name={icon} size={18} color={fg} />
      <T v="small" color={fg} style={{ flex: 1 }}>{text}</T>
      {action && onAction ? <Pressable onPress={onAction} hitSlop={8}><T v="smallStrong" color={fg}>{action}</T></Pressable> : null}
    </View>
  );
}

export function Empty({ icon = "leaf-outline", text }: { icon?: keyof typeof Ionicons.glyphMap; text: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: space.xxl, paddingHorizontal: space.xl, gap: 10 }}>
      <Ionicons name={icon} size={28} color={t.faint} />
      <T v="small" style={{ textAlign: "center" }}>{text}</T>
    </View>
  );
}

/** Bildschirm mit großem Titel, Zieh-zum-Aktualisieren und Hinweis bei altem Stand */
export function Screen({ title, sub, right, children, scroll = true, refresh = true, topInset = true }: {
  title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; scroll?: boolean; refresh?: boolean; topInset?: boolean;
}) {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { refreshing, refresh: doRefresh, offline, loadedAt } = useData();
  const head = title ? (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: space.m, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T v="display" accessibilityRole="header">{title}</T>
        {sub ? <T v="small" style={{ marginTop: 4 }}>{sub}</T> : null}
      </View>
      {right}
    </View>
  ) : null;
  const offlineBanner = offline && loadedAt ? (
    <Banner icon="cloud-offline-outline" tone="warn" text={`Keine Verbindung. Stand: ${ago(loadedAt)}.`} action="Erneut" onAction={doRefresh} />
  ) : null;
  const inner = <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>{head}{offlineBanner}{children}</View>;
  if (!scroll) return <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: (topInset ? ins.top : 0) + space.m, paddingHorizontal: space.l }}>{inner}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: (topInset ? ins.top : 0) + space.m, paddingHorizontal: space.l, paddingBottom: space.xxl * 2 }}
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={doRefresh} tintColor={t.muted} colors={[t.accent]} /> : undefined}
      keyboardShouldPersistTaps="handled">
      {inner}
    </ScrollView>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.rule }} />;
}

export function IconButton({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} hitSlop={10}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: t.card,
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={20} color={t.ink} />
    </Pressable>
  );
}

export function Button({ label, onPress, kind = "primary", icon, disabled }: { label: string; onPress: () => void; kind?: "primary" | "secondary"; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean }) {
  const t = useTheme();
  const primary = kind === "primary";
  return (
    <Pressable disabled={disabled} onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, paddingHorizontal: 18, borderRadius: radius.m,
        backgroundColor: primary ? t.ink : t.card, borderWidth: primary ? 0 : StyleSheet.hairlineWidth, borderColor: t.rule, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 })}>
      {icon ? <Ionicons name={icon} size={18} color={primary ? t.bg : t.ink} /> : null}
      <T v="bodyStrong" color={primary ? t.bg : t.ink}>{label}</T>
    </Pressable>
  );
}
