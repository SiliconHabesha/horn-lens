// Meldungen: eine Zeile je Schlagzeile, mit Herkunft, Art der Quelle und Zeit.
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, Share, StyleSheet, View } from "react-native";
import { fmtIsoDay, fmtWhen, headline, num, srcName, TYPE_ORDER, TYPE_SHORT, TYPES } from "../lib/de";
import { t as tr } from "../lib/i18n";
import { font, useTheme } from "../lib/theme";
import type { Story } from "../lib/stories";
import { assess, kindColor } from "../lib/assess";
import type { Item } from "../lib/types";
import { toast } from "./Toast";
import { T, tap } from "./ui";

const ETHIOPIC = /[ሀ-፿]/;
const ARABIC = /[؀-ۿ]/;
const DATE_ONLY = new Set(["unnews"]);
export { dedupe } from "../lib/stories";

// „1 Medium“, „3 Medien“ als eigene Vorlage (nicht plural()), weil „Medien“ auch als Überschrift übersetzt wird
const mediaCount = (n: number) => (n === 1 ? tr("1 Medium") : tr("{n} Medien", { n: num(n) }));

export const itemTime = (it: Item) => it.published_at || it.fetched_at;

export const whenOf = (it: Item) => !it.published_at ? tr("abgerufen {when}", { when: fmtWhen(it.fetched_at) })
  : DATE_ONLY.has(it.source_id) ? fmtIsoDay(String(it.published_at).slice(0, 10), { day: "numeric", month: "short" })
  : fmtWhen(it.published_at);
export const titleStyle = (title: string, strong = false) => [ETHIOPIC.test(title) && { fontFamily: strong ? font.ethiopicBold : font.ethiopic }, ARABIC.test(title) && { textAlign: "right" as const, writingDirection: "rtl" as const }];

export async function shareItem(it: Item) {
  tap();
  try {
    if (Platform.OS === "web" && (navigator as any).share) await (navigator as any).share({ title: headline(it), url: it.url });
    else if (Platform.OS === "web") { await navigator.clipboard.writeText(`${headline(it)} ${it.url}`); toast(tr("Link kopiert"), "link-outline"); }
    else await Share.share({ message: `${headline(it)}\n${it.url}`, url: it.url });
  } catch { /* abgebrochen */ }
}

/** Eine Geschichte mit allen Medien als Text teilen */
export async function shareStory(s: Story) {
  tap();
  const seen = new Set<string>();
  const lines = [tr("Bei {count}: {title}", { count: mediaCount(s.sources), title: headline(s.lead) }), ""];
  for (const it of s.items) {
    const who = srcName(it.origin_domain || it.source_name);
    if (seen.has(who) || seen.size >= 6) continue;
    seen.add(who);
    lines.push(`– ${who} (${TYPES[it.source_type] || it.source_type}): ${it.url}`);
  }
  lines.push("", tr("Zusammengestellt mit Semay. Meldungen sind keine geprüften Tatsachen."));
  const text = lines.join("\n");
  try {
    if (Platform.OS === "web") { await navigator.clipboard.writeText(text); toast(tr("Geschichte als Text kopiert"), "copy-outline"); }
    else await Share.share({ message: text });
  } catch { /* abgebrochen */ }
}

/** Farbpunkte der Quellenarten (höchstens vier), als ruhiges Zeichen dafür, wer berichtet */
/** Welche Seite spricht: eine Quellenart ausgeschrieben, bei mehreren die Zahl der Seiten */
const side = (types: string[]) => (types.length === 1 ? TYPE_SHORT[types[0]] || "" : types.length > 1 ? tr("{n} Quellenarten", { n: types.length }) : "");

function Dots({ types }: { types: string[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {types.slice(0, 4).map((k) => <View key={k} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.type[k] || t.type.aggregator }} />)}
    </View>
  );
}

/** Eine Zeile für Meldung und Geschichte: Schlagzeile, darunter wer und wann */
function NewsRow({ title, types, who, when, isNew, onPress, a11y, items }: { title: string; types: string[]; who: string; when: string; isNew?: boolean; onPress: () => void; a11y: string; items?: Item[] }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={a11y} accessibilityHint={tr("Öffnet Einzelheiten")}
      style={({ pressed }) => ({ paddingVertical: 13, gap: 5, opacity: pressed ? 0.6 : 1 })}>
      {/* Neu seit dem letzten Besuch: Schlagzeile kräftig; Älteres normal */}
      <T v="bodyStrong" color={t.ink} style={titleStyle(title, true)} numberOfLines={3}>{title}</T>
      {/* Einordnung: wer berichtet (automatisch, ohne Wahrheitsurteil) */}
      {items?.length ? (() => { const a = assess(items); return <T v="caption" color={kindColor(a.kind, t)} style={{ fontFamily: font.semibold }}>{a.label}</T>; })() : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* Neu seit dem letzten Besuch: ein Wort statt fetter Schrift, damit die Liste ruhig bleibt */}
        {isNew ? <T v="caption" color={t.accent} style={{ fontFamily: font.bold }}>{tr("Neu")}</T> : null}
        <Dots types={types} />
        <T v="caption" numberOfLines={1} style={{ flexShrink: 1 }}><T v="caption" color={t.ink}>{who}</T>{side(types) ? ` · ${side(types)}` : ""}</T>
        <T v="caption" numberOfLines={1} style={{ flexShrink: 0 }}>{when}</T>

      </View>
    </Pressable>
  );
}

export function ItemRow({ it, isNew, others, onOpen, story }: { it: Item; isNew?: boolean; translation?: string; others?: number; onOpen?: () => void; story?: Item[] }) {
  const name = srcName(it.origin_domain || it.source_name);
  const who = !others ? name : others === 1 ? tr("{name} + 1 weiteres Medium", { name }) : tr("{name} + {n} weitere Medien", { name, n: others });
  const when = whenOf(it);
  return (
    <NewsRow title={headline(it)} types={[it.source_type]} who={who} when={when} isNew={isNew} items={story}
      onPress={() => { onOpen?.(); router.push(`/item/${it.id}`); }}
      a11y={`${headline(it)}. ${it.origin_domain || it.source_name}, ${TYPES[it.source_type] || ""}, ${when}${isNew ? `, ${tr("neu")}` : ""}`} />
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
    <View style={{ gap: 8 }} accessible accessibilityLabel={unit ? tr("Wer berichtet ({unit}): {list}", { unit, list: types.map((k) => `${TYPES[k]} ${counts[k]}`).join(", ") }) : tr("Wer berichtet: {list}", { list: types.map((k) => `${TYPES[k]} ${counts[k]}`).join(", ") })}>
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
  if (s.items.length === 1) return <ItemRow it={s.lead} isNew={seenBefore != null && new Date(s.lead.fetched_at).getTime() > seenBefore} others={s.totalSources && s.totalSources > 1 ? s.totalSources - 1 : undefined}
    story={s.all || s.items} />;
  const isNew = seenBefore != null && s.items.some((i) => new Date(i.fetched_at).getTime() > seenBefore);
  const types = TYPE_ORDER.filter((k) => s.types[k]);
  const a11yVars = { count: mediaCount(s.sources), title: headline(s.lead), types: types.map((k) => TYPES[k]).join(", "), when: fmtWhen(s.last) };
  return (
    <NewsRow title={headline(s.lead)} types={types} who={s.total ? tr("{count} · {n} von {total} Meldungen", { count: mediaCount(s.sources), n: s.items.length, total: s.total }) : mediaCount(s.sources)} when={fmtWhen(s.last)} isNew={isNew}
      onPress={() => router.push(`/item/${s.lead.id}`)} items={s.all || s.items}
      a11y={isNew ? tr("Geschichte bei {count}: {title}. Quellenarten: {types}. Zuletzt {when}, neu.", a11yVars) : tr("Geschichte bei {count}: {title}. Quellenarten: {types}. Zuletzt {when}.", a11yVars)} />
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
