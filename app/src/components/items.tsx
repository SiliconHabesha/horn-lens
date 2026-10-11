// Meldungen: eine Zeile je Schlagzeile, mit Herkunft, Art der Quelle und Zeit.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, Share, StyleSheet, View } from "react-native";
import { fmtIsoDay, fmtWhen, TYPE_ORDER, TYPES } from "../lib/de";
import { font, useTheme } from "../lib/theme";
import type { Story } from "../lib/stories";
import type { Item } from "../lib/types";
import { toast } from "./Toast";
import { T, tap } from "./ui";

const ETHIOPIC = /[ሀ-፿]/;
const ARABIC = /[؀-ۿ]/;
const DATE_ONLY = new Set(["unnews"]);
export { dedupe } from "../lib/stories";

export const itemTime = (it: Item) => it.published_at || it.fetched_at;

export const whenOf = (it: Item) => !it.published_at ? `Zeit nicht angegeben, abgerufen ${fmtWhen(it.fetched_at)}`
  : DATE_ONLY.has(it.source_id) ? fmtIsoDay(String(it.published_at).slice(0, 10), { day: "numeric", month: "short" })
  : fmtWhen(it.published_at);
export const titleStyle = (title: string) => [ETHIOPIC.test(title) && { fontFamily: font.ethiopic }, ARABIC.test(title) && { textAlign: "right" as const, writingDirection: "rtl" as const }];

export async function shareItem(it: Item) {
  tap();
  try {
    if (Platform.OS === "web" && (navigator as any).share) await (navigator as any).share({ title: it.title, url: it.url });
    else if (Platform.OS === "web") { await navigator.clipboard.writeText(`${it.title} ${it.url}`); toast("Link kopiert", "link-outline"); }
    else await Share.share({ message: `${it.title}\n${it.url}`, url: it.url });
  } catch { /* abgebrochen */ }
}

export function ItemRow({ it, isNew, translation, others, onOpen }: { it: Item; isNew?: boolean; translation?: string; others?: number; onOpen?: () => void }) {
  const t = useTheme();
  const c = t.type[it.source_type] || t.type.aggregator;
  const when = whenOf(it);
  return (
    <Pressable onPress={() => { tap(); onOpen?.(); router.push(`/item/${it.id}`); }} accessibilityRole="button"
      accessibilityLabel={`${it.title}. ${it.origin_domain || it.source_name}, ${TYPES[it.source_type] || ""}, ${when}${others ? `. Auch bei ${others} weiteren Medien` : ""}`}
      accessibilityHint="Öffnet Einzelheiten und das Original"
      style={({ pressed }) => ({ flexDirection: "row", gap: 12, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 3, borderRadius: 2, backgroundColor: c }} />
      <View style={{ flex: 1, gap: 6 }}>
        <T v="bodyStrong" style={titleStyle(it.title)}>
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
          {others ? <T v="caption" color={t.ink}>+ {others} {others === 1 ? "weiteres Medium" : "weitere Medien"}</T> : null}
        </View>
      </View>
      <Pressable onPress={() => shareItem(it)} hitSlop={14} accessibilityRole="button" accessibilityLabel="Teilen" style={{ paddingTop: 2 }}>
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
export function Voices({ items, counts: given, compact, unit }: { items?: Item[]; counts?: Record<string, number>; compact?: boolean; unit?: string }) {
  const t = useTheme();
  const counts: Record<string, number> = given ? { ...given } : {};
  if (!given) for (const it of items || []) counts[it.source_type] = (counts[it.source_type] || 0) + 1;
  const types = TYPE_ORDER.filter((k) => counts[k]);
  if (!types.length) return null;
  return (
    <View style={{ gap: 8 }} accessible accessibilityLabel={`Wer berichtet${unit ? ` (${unit})` : ""}: ${types.map((k) => `${TYPES[k]} ${counts[k]}`).join(", ")}`}>
      <View style={{ flexDirection: "row", height: compact ? 6 : 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
        {types.map((k) => <View key={k} style={{ flex: counts[k], backgroundColor: t.type[k] }} />)}
      </View>
      {compact ? null : <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4 }}>
        {types.map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.type[k] }} />
            <T v="caption" color={t.ink}>{counts[k]}</T>
            <T v="caption">{TYPES[k]}</T>
          </View>
        ))}
      </View>}
    </View>
  );
}


/** Eine Geschichte: oberste Schlagzeile, wie viele Medien berichten, aus welchen Quellenarten, gemeinsame Wörter */
export function StoryCard({ s, seenBefore }: { s: Story; seenBefore?: number }) {
  const t = useTheme();
  if (s.items.length === 1) return <ItemRow it={s.lead} isNew={seenBefore != null && new Date(s.lead.fetched_at).getTime() > seenBefore} others={s.totalSources && s.totalSources > 1 ? s.totalSources - 1 : undefined} />;
  const isNew = seenBefore != null && s.items.some((i) => new Date(i.fetched_at).getTime() > seenBefore);
  const typeNames = TYPE_ORDER.filter((k) => s.types[k]).map((k) => TYPES[k]);
  return (
    <Pressable onPress={() => { tap(); router.push(`/item/${s.lead.id}`); }} accessibilityRole="button"
      accessibilityLabel={`Geschichte bei ${s.sources} Medien: ${s.lead.title}. Quellenarten: ${typeNames.join(", ")}. Zuletzt ${fmtWhen(s.last)}.`}
      style={({ pressed }) => ({ paddingVertical: 14, gap: 8, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: t.cardAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Ionicons name="layers-outline" size={13} color={t.ink} />
          <T v="caption" color={t.ink}>{s.sources} Medien</T>
        </View>
        {s.total ? <T v="caption">{s.items.length} von {s.total} Meldungen passen</T> : null}
        {isNew ? <T v="label" color={t.accent}>Neu</T> : null}
        <T v="caption" style={{ marginLeft: "auto" }}>{fmtWhen(s.last)}</T>
      </View>
      <T v="bodyStrong" style={titleStyle(s.lead.title)}>{s.lead.title}</T>
      <Voices counts={s.types} compact unit="Medien" />
      <T v="caption" numberOfLines={2}>
        <T v="caption" color={t.ink}>{typeNames.join(" · ")}</T>
        {s.shared.length ? `   Gemeinsam: ${s.shared.slice(0, 4).join(", ")}` : ""}
      </T>
    </Pressable>
  );
}

export function StoryList({ stories, seenBefore, limit }: { stories: Story[]; seenBefore?: number; limit?: number }) {
  const t = useTheme();
  const list = limit ? stories.slice(0, limit) : stories;
  return (
    <View>
      {list.map((s, i) => (
        <View key={s.key} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
          <StoryCard s={s} seenBefore={seenBefore} />
        </View>
      ))}
    </View>
  );
}
