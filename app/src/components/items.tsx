// Meldungen: eine Zeile je Schlagzeile, mit Herkunft, Art der Quelle und Zeit.
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, Share, StyleSheet, View } from "react-native";
import { fmtIsoDay, fmtWhen, plural, srcName, TYPE_ORDER, TYPE_SHORT, TYPES } from "../lib/de";
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

export const whenOf = (it: Item) => !it.published_at ? `abgerufen ${fmtWhen(it.fetched_at)}`
  : DATE_ONLY.has(it.source_id) ? fmtIsoDay(String(it.published_at).slice(0, 10), { day: "numeric", month: "short" })
  : fmtWhen(it.published_at);
export const titleStyle = (title: string, strong = false) => [ETHIOPIC.test(title) && { fontFamily: strong ? font.ethiopicBold : font.ethiopic }, ARABIC.test(title) && { textAlign: "right" as const, writingDirection: "rtl" as const }];

export async function shareItem(it: Item) {
  tap();
  try {
    if (Platform.OS === "web" && (navigator as any).share) await (navigator as any).share({ title: it.title, url: it.url });
    else if (Platform.OS === "web") { await navigator.clipboard.writeText(`${it.title} ${it.url}`); toast("Link kopiert", "link-outline"); }
    else await Share.share({ message: `${it.title}\n${it.url}`, url: it.url });
  } catch { /* abgebrochen */ }
}

/** Eine Geschichte mit allen Medien als Text teilen */
export async function shareStory(s: Story) {
  tap();
  const seen = new Set<string>();
  const lines = [`Bei ${plural(s.sources, "Medium", "Medien")}: ${s.lead.title}`, ""];
  for (const it of s.items) {
    const who = srcName(it.origin_domain || it.source_name);
    if (seen.has(who) || seen.size >= 6) continue;
    seen.add(who);
    lines.push(`– ${who} (${TYPES[it.source_type] || it.source_type}): ${it.url}`);
  }
  lines.push("", "Zusammengestellt mit Semay. Meldungen sind keine geprüften Tatsachen.");
  const text = lines.join("\n");
  try {
    if (Platform.OS === "web") { await navigator.clipboard.writeText(text); toast("Geschichte als Text kopiert", "copy-outline"); }
    else await Share.share({ message: text });
  } catch { /* abgebrochen */ }
}

/** Farbpunkte der Quellenarten (höchstens vier), als ruhiges Zeichen dafür, wer berichtet */
/** Welche Seite spricht: eine Quellenart ausgeschrieben, bei mehreren die Zahl der Seiten */
const side = (types: string[]) => (types.length === 1 ? TYPE_SHORT[types[0]] || "" : types.length > 1 ? `${types.length} Quellenarten` : "");

function Dots({ types }: { types: string[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {types.slice(0, 4).map((k) => <View key={k} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.type[k] || t.type.aggregator }} />)}
    </View>
  );
}

/** Eine Zeile für Meldung und Geschichte: Schlagzeile, darunter wer und wann */
function NewsRow({ title, types, who, when, isNew, onPress, a11y }: { title: string; types: string[]; who: string; when: string; isNew?: boolean; onPress: () => void; a11y: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint="Öffnet Einzelheiten"
      style={({ pressed }) => ({ paddingVertical: 13, gap: 5, opacity: pressed ? 0.6 : 1 })}>
      {/* Neu seit dem letzten Besuch: Schlagzeile kräftig; Älteres normal */}
      <T v="bodyStrong" color={t.ink} style={titleStyle(title, true)} numberOfLines={3}>{title}</T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* Neu seit dem letzten Besuch: ein Wort statt fetter Schrift, damit die Liste ruhig bleibt */}
        {isNew ? <T v="caption" color={t.accent} style={{ fontFamily: font.bold }}>Neu</T> : null}
        <Dots types={types} />
        <T v="caption" numberOfLines={1} style={{ flexShrink: 1 }}><T v="caption" color={t.ink}>{who}</T>{side(types) ? ` · ${side(types)}` : ""}</T>
        <T v="caption" numberOfLines={1} style={{ flexShrink: 0 }}>{when}</T>

      </View>
    </Pressable>
  );
}

export function ItemRow({ it, isNew, others, onOpen }: { it: Item; isNew?: boolean; translation?: string; others?: number; onOpen?: () => void }) {
  const who = `${srcName(it.origin_domain || it.source_name)}${others ? ` + ${others} ${others === 1 ? "weiteres Medium" : "weitere Medien"}` : ""}`;
  const when = whenOf(it);
  return (
    <NewsRow title={it.title} types={[it.source_type]} who={who} when={when} isNew={isNew}
      onPress={() => { onOpen?.(); router.push(`/item/${it.id}`); }}
      a11y={`${it.title}. ${it.origin_domain || it.source_name}, ${TYPES[it.source_type] || ""}, ${when}${isNew ? ", neu" : ""}`} />
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


/** Eine Geschichte: oberste Schlagzeile und wie viele Medien welcher Art berichten */
export function StoryCard({ s, seenBefore }: { s: Story; seenBefore?: number }) {
  if (s.items.length === 1) return <ItemRow it={s.lead} isNew={seenBefore != null && new Date(s.lead.fetched_at).getTime() > seenBefore} others={s.totalSources && s.totalSources > 1 ? s.totalSources - 1 : undefined} />;
  const isNew = seenBefore != null && s.items.some((i) => new Date(i.fetched_at).getTime() > seenBefore);
  const types = TYPE_ORDER.filter((k) => s.types[k]);
  return (
    <NewsRow title={s.lead.title} types={types} who={`${plural(s.sources, "Medium", "Medien")}${s.total ? ` · ${s.items.length} von ${s.total} Meldungen` : ""}`} when={fmtWhen(s.last)} isNew={isNew}
      onPress={() => router.push(`/item/${s.lead.id}`)}
      a11y={`Geschichte bei ${plural(s.sources, "Medium", "Medien")}: ${s.lead.title}. Quellenarten: ${types.map((k) => TYPES[k]).join(", ")}. Zuletzt ${fmtWhen(s.last)}${isNew ? ", neu" : ""}.`} />
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
