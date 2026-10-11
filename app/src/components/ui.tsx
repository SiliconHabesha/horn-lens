// Bausteine der Oberfläche: Text, Karten, Chips, Status, Kopfzeilen.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextProps, View, ViewStyle, Switch, SwitchProps, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ago, num, STATUS } from "../lib/de";
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
// Schriftgrade: wenige, klar getrennte Stufen. Etiketten in normaler Schreibung statt Versalien.
const VAR: Record<V, { size: number; line: number; family: string; spacing?: number }> = {
  display: { size: 34, line: 38, family: font.black, spacing: -1 },
  title: { size: 26, line: 31, family: font.black, spacing: -0.6 },
  h2: { size: 20, line: 25, family: font.bold, spacing: -0.35 },
  h3: { size: 16.5, line: 21, family: font.semibold, spacing: -0.1 },
  body: { size: 16, line: 23, family: font.regular },
  bodyStrong: { size: 16, line: 22, family: font.semibold, spacing: -0.1 },
  small: { size: 14, line: 20, family: font.regular },
  smallStrong: { size: 14, line: 20, family: font.semibold },
  caption: { size: 12.5, line: 17, family: font.medium },
  label: { size: 13, line: 17, family: font.semibold },
};
export function T({ v = "body", color, style, tabular, children, ...rest }: TextProps & { v?: V; color?: string; tabular?: boolean }) {
  const t = useTheme();
  const s = VAR[v];
  const muted = v === "small" || v === "caption";
  return (
    <Text {...rest} style={[{ fontSize: s.size, lineHeight: s.line, fontFamily: s.family, letterSpacing: s.spacing, color: color || (muted ? t.muted : t.ink),
      fontVariant: tabular ? ["tabular-nums"] : undefined }, style]}>
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

export function Chip({ label, count, active, onPress, color, disabled }: { label: string; count?: number; active?: boolean; onPress: () => void; color?: string; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active, disabled: !!disabled }} disabled={disabled} onPress={() => { tap(); onPress(); }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, minHeight: 36, paddingVertical: 4, borderRadius: radius.pill,
        backgroundColor: active ? t.ink : t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: active ? t.ink : t.rule, borderStyle: disabled ? "dashed" : "solid",
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
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

// Jede Stufe hat eine eigene Form, nicht nur eine Farbe (auch für Menschen mit Farbsehschwäche)
const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  confirmed: "checkmark-circle", likely: "checkmark-circle-outline", unconfirmed: "help-circle", disputed: "swap-horizontal", false: "close-circle",
};
export function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const t = useTheme();
  const c = t.status[status] || t.muted;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
      <Ionicons name={STATUS_ICON[status] || "ellipse"} size={small ? 13 : 15} color={c} accessibilityElementsHidden importantForAccessibility="no" />
      <T v="label" color={c}>{STATUS[status]?.[0] || "Stufe unbekannt"}</T>
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
      {action && onAction ? <Pressable onPress={() => { tap(); onAction(); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={action}
        style={{ minHeight: 32, justifyContent: "center" }}><T v="smallStrong" color={fg}>{action}</T></Pressable> : null}
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
  // Breite Fenster (Seitenleiste): etwas mehr Luft über dem Titel
  const wide = useWindowDimensions().width >= 900;
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
    <Banner icon="cloud-offline-outline" tone="warn" text={`Keine Verbindung. Stand: ${ago(loadedAt)}.`} action="Erneut versuchen" onAction={doRefresh} />
  ) : loadedAt && Date.now() - loadedAt > 3600e3 && !refreshing ? (
    <Banner icon="time-outline" text={`Diese Ansicht ist von ${ago(loadedAt)}.`} action="Aktualisieren" onAction={doRefresh} />
  ) : null;
  const inner = <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>{head}{offlineBanner}{children}</View>;
  if (!scroll) return <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: (topInset ? ins.top : 0) + space.m + (wide && topInset ? space.xl : 0), paddingHorizontal: space.l }}>{inner}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: (topInset ? ins.top : 0) + space.m + (wide && topInset ? space.xl : 0), paddingHorizontal: space.l, paddingBottom: space.xxl * 2 }}
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

/** Schalter in den Farben von Horn Lens (statt Systemgrün oder -türkis) */
export function Toggle(props: SwitchProps) {
  const t = useTheme();
  return <Switch trackColor={{ false: t.dark ? "#5C7A84" : "#7F9396", true: t.accent }} thumbColor="#FFFFFF" {...({ activeThumbColor: "#FFFFFF" } as any)} ios_backgroundColor={t.dark ? "#5C7A84" : "#7F9396"} {...props} />;
}

/** Eine Zeile in einer gruppierten Liste (Messwerte, Weiter zu, Orte): Symbol, Text, Zusatz, Wert rechts, Pfeil */
export function ListRow({ icon, label, hint, sub, value, tone, onPress, first, external, align }: {
  icon?: keyof typeof Ionicons.glyphMap; label: string; hint?: string; sub?: string; value?: string; tone?: "alert" | "none"; onPress?: () => void; first?: boolean; external?: boolean;
  /** Platz für den Pfeil freihalten, damit Werte bündig mit antippbaren Zeilen stehen */ align?: boolean;
}) {
  const t = useTheme();
  const c = tone === "alert" ? t.warn : tone === "none" ? t.muted : t.ink;
  return (
    <Pressable onPress={onPress ? () => { tap(); onPress(); } : undefined} accessibilityRole={onPress ? (external ? "link" : "button") : "text"}
      accessibilityLabel={`${label}${hint ? `, ${hint}` : ""}${sub ? `, ${sub}` : ""}${value ? `: ${value}` : ""}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, paddingVertical: 9,
        borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed && onPress ? 0.6 : 1 })}>
      {icon ? <Ionicons name={icon} size={19} color={tone === "alert" ? t.warn : t.muted} /> : null}
      <View style={{ flex: 1 }}>
        <T v="body" color={t.ink} numberOfLines={2}>{label}{hint ? <T v="small" color={t.muted}>{`  ${hint}`}</T> : null}</T>
        {sub ? <T v="caption" numberOfLines={2}>{sub}</T> : null}
      </View>
      {value ? <T v="bodyStrong" color={c}>{value}</T> : null}
      {onPress ? <Ionicons name={external ? "open-outline" : "chevron-forward"} size={16} color={t.faint} /> : align ? <View style={{ width: 16 }} /> : null}
    </Pressable>
  );
}

/** Gruppe von ListRows in einer Karte */
export function Group({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.card, borderRadius: radius.l, paddingHorizontal: space.l, paddingVertical: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule }, style]}>{children}</View>;
}

/** Abschnittsüberschrift mit optionalem Link rechts */
export function Head({ title, action, onAction, first, count }: { title: string; action?: string; onAction?: () => void; first?: boolean; count?: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: first ? 0 : space.xl, marginBottom: space.s }}>
      <T v="h2" accessibilityRole="header" accessibilityLabel={count != null ? `${title}, ${count}` : undefined}>{title}</T>
      {count != null && !(action && onAction) ? <T v="small" color={t.muted}>{num(count)}</T> : null}
      {action && onAction ? (
        <Pressable onPress={() => { tap(); onAction(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel={`${title}: ${action}`}>
          <T v="smallStrong" color={t.accent}>{action}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Einfache Inhaltszeile ohne Rahmen (z. B. Vorfälle auf See): Titel, darunter Zeit und Herkunft */
export function PlainRow({ title, meta, onPress, first, external }: { title: string; meta: string; onPress?: () => void; first?: boolean; external?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress ? () => { tap(); onPress(); } : undefined} accessibilityRole={onPress ? (external ? "link" : "button") : "text"} accessibilityLabel={`${title}. ${meta}`}
      style={({ pressed }) => ({ paddingVertical: 12, gap: 4, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed && onPress ? 0.6 : 1 })}>
      <T v="body" color={t.ink}>{title}</T>
      <T v="caption">{meta}</T>
    </Pressable>
  );
}
