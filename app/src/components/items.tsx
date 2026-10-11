// Meldungen: eine Zeile je Schlagzeile, mit Herkunft, Art der Quelle und Zeit.
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Platform, Pressable, Share, StyleSheet, View } from "react-native";
import { fmtIsoDay, fmtWhen, TYPE_ORDER, TYPES } from "../lib/de";
import { font, useTheme } from "../lib/theme";
import type { Item } from "../lib/types";
import { openLink, T, tap } from "./ui";

const ETHIOPIC = /[ሀ-፿]/;
const ARABIC = /[؀-ۿ]/;
const DATE_ONLY = new Set(["unnews"]);
const urlKey = (u: string) => String(u || "").replace(/[?&](traffic_source|maca|utm_[a-z]+)=[^&#]*/gi, "").replace(/[?&#]+$/, "").replace(/^http:/, "https:");

/** Doppelte Meldungen (gleiche Quelle und Überschrift oder gleicher Link) nur einmal */
export function dedupe(items: Item[]) {
  const seen = new Set<string>();
  return items.filter((it) => {
    const a = `${it.source_id || it.source_name}|${String(it.title).trim().toLowerCase()}`, b = urlKey(it.url);
    if (seen.has(a) || seen.has(b)) return false;
    seen.add(a); seen.add(b);
    return true;
  });
}

export const itemTime = (it: Item) => it.published_at || it.fetched_at;

export function ItemRow({ it, isNew, translation }: { it: Item; isNew?: boolean; translation?: string }) {
  const t = useTheme();
  const c = t.type[it.source_type] || t.type.aggregator;
  const when = !it.published_at ? `Zeit nicht angegeben, abgerufen ${fmtWhen(it.fetched_at)}`
    : DATE_ONLY.has(it.source_id) ? fmtIsoDay(String(it.published_at).slice(0, 10), { day: "numeric", month: "short" })
    : fmtWhen(it.published_at);
  const rtl = ARABIC.test(it.title);
  const share = async () => {
    tap();
    try {
      if (Platform.OS === "web" && (navigator as any).share) await (navigator as any).share({ title: it.title, url: it.url });
      else if (Platform.OS === "web") await navigator.clipboard.writeText(`${it.title} ${it.url}`);
      else await Share.share({ message: `${it.title}\n${it.url}`, url: it.url });
    } catch { /* abgebrochen */ }
  };
  return (
    <Pressable onPress={() => { tap(); openLink(it.url); }} accessibilityRole="link" accessibilityLabel={`${it.title}. ${it.origin_domain || it.source_name}, ${TYPES[it.source_type] || ""}, ${when}`}
      style={({ pressed }) => ({ flexDirection: "row", gap: 12, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 3, borderRadius: 2, backgroundColor: c }} />
      <View style={{ flex: 1, gap: 6 }}>
        <T v="bodyStrong" style={[ETHIOPIC.test(it.title) && { fontFamily: font.ethiopic }, rtl && { textAlign: "right", writingDirection: "rtl" }]}>
          {isNew ? <T v="label" color={t.accent}>Neu  </T> : null}{it.title}
        </T>
        {translation ? (
          <View style={{ borderLeftWidth: 2, borderColor: t.rule, paddingLeft: 8 }}>
            <T v="caption" color={t.faint}>Maschinell übersetzt</T>
            <T v="small" color={t.ink}>{translation}</T>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 2 }}>
          <T v="smallStrong" color={c}>{it.origin_domain || it.source_name}</T>
          <T v="caption">{TYPES[it.source_type] || it.source_type}</T>
          <T v="caption">{when}</T>
        </View>
      </View>
      <Pressable onPress={share} hitSlop={10} accessibilityRole="button" accessibilityLabel="Teilen" style={{ paddingTop: 2 }}>
        <Ionicons name={Platform.OS === "ios" ? "share-outline" : "share-social-outline"} size={18} color={t.faint} />
      </Pressable>
    </Pressable>
  );
}

export function ItemList({ items, seenBefore, limit }: { items: Item[]; seenBefore?: number; limit?: number }) {
  const t = useTheme();
  const list = limit ? items.slice(0, limit) : items;
  return (
    <View>
      {list.map((it, i) => (
        <View key={`${it.id}-${i}`} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
          <ItemRow it={it} isNew={seenBefore != null && new Date(it.fetched_at).getTime() > seenBefore} />
        </View>
      ))}
    </View>
  );
}

/** Wer berichtet: Anteile der Quellenarten als Balken */
export function Voices({ items }: { items: Item[] }) {
  const t = useTheme();
  const counts: Record<string, number> = {};
  for (const it of items) counts[it.source_type] = (counts[it.source_type] || 0) + 1;
  const types = TYPE_ORDER.filter((k) => counts[k]);
  if (!types.length) return null;
  return (
    <View style={{ gap: 8 }} accessible accessibilityLabel={`Wer berichtet: ${types.map((k) => `${TYPES[k]} ${counts[k]}`).join(", ")}`}>
      <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
        {types.map((k) => <View key={k} style={{ flex: counts[k], backgroundColor: t.type[k] }} />)}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
        {types.map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.type[k] }} />
            <T v="caption" color={t.ink}>{counts[k]}</T>
            <T v="caption">{TYPES[k]}</T>
          </View>
        ))}
      </View>
    </View>
  );
}

