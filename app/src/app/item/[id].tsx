// Eine Meldung im Detail: wer berichtet, wie die Quelle einzuordnen ist, wer noch über dieselbe Geschichte berichtet.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { ItemRow, shareItem, shareStory, titleStyle, whenOf } from "../../components/items";
import { toast } from "../../components/Toast";
import { Button, Empty, openLink, Screen, T, tap } from "../../components/ui";
import { fmtFull, fmtWhen, headline, plural, REGION_ORDER, REGIONS, srcName, translated, TYPE_NOTE, TYPE_ORDER, TYPES } from "../../lib/de";
import { eventLabel, eventTypes } from "../../lib/events";
import { assess, kindColor } from "../../lib/assess";
import { lang, t as tr } from "../../lib/i18n";

// Sprachnamen auf Deutsch; übersetzt wird beim Zeichnen mit tr()
const LANGS: Record<string, string> = { de: "Deutsch", en: "Englisch", am: "Amharisch", ti: "Tigrinya", ar: "Arabisch", fr: "Französisch", it: "Italienisch" };
import { knownItem, useData } from "../../lib/data";
import { placesIn } from "../../lib/places";
import { conflictStory, sidesOf, storiesOf, VOICE_TYPES } from "../../lib/stories";
import { radius, space, useTheme } from "../../lib/theme";
import type { Item } from "../../lib/types";
import { Skeleton } from "../../components/Skeleton";

export default function ItemDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saved, isSaved, toggleSaved } = useData();
  const [how, setHow] = useState(false);
  const [showTi, setShowTi] = useState(false);
  const pool = data ? data.items : [];
  const it: Item | undefined = pool.find((x) => String(x.id) === String(id)) || saved.find((x) => String(x.id) === String(id)) || knownItem(Number(id));
  const story = useMemo(() => (data && it ? storiesOf(data).find((s) => s.items.some((x) => x.id === it.id)) : undefined), [data, it]);

  if (!it) {
    return (
      <Screen topInset={false} refresh={false}>
        <Stack.Screen options={{ title: tr("Meldung") }} />
        {!data ? <Skeleton rows={4} />
          : <Empty icon="newspaper-outline" text={tr("Diese Meldung ist älter als 7 Tage und nicht mehr abrufbar. Gemerkte Meldungen bleiben unter „Gemerkt“.")} />}
      </Screen>
    );
  }
  const c = t.type[it.source_type] || t.type.aggregator;
  const others = story ? story.items.filter((x) => x.id !== it.id) : [];
  const byType = TYPE_ORDER.map((k) => [k, others.filter((x) => x.source_type === k)] as const).filter(([, l]) => l.length);
  // Welche Seiten haben (in unseren Quellen) noch nicht berichtet? Nur Quellenarten, die Semay überhaupt abruft.
  // Vorsichtig: nur Quellenarten, deren Quellen gerade erreichbar sind und die lateinisch geschriebene Schlagzeilen liefern
  // (Schlagzeilen in Tigrinya, Amharisch oder Arabisch kann Semay nicht zuordnen)
  const latin = (s: string) => /[a-z]{3}/i.test(s) && !/[\u1200-\u137f\u0600-\u06ff]/.test(s);
  const okTypes = new Set((data?.sources || []).filter((s) => s.last_ok_at && Date.now() - new Date(s.last_ok_at).getTime() < 24 * 3600e3).map((s) => s.source_type));
  const tracked = new Set(pool.filter((x) => latin(x.title) && okTypes.has(x.source_type)).map((x) => x.source_type));
  const reported = new Set((story?.items || [it]).map((x) => x.source_type));
  // Nur bei Geschichten zu Eritrea, Äthiopien oder Tigray: bei Meldungen etwa zum Jemen wäre „Eritrea schweigt“ irreführend
  const missing = story && story.items.length > 1 && latin(it.title) && conflictStory(story.items) ? VOICE_TYPES.filter((k) => tracked.has(k) && !reported.has(k)) : [];
  const sides = story && story.items.length > 1 && Object.keys(story.types).length > 1 ? sidesOf(story.items).sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) : [];
  const on = isSaved(it);

  return (
    <Screen topInset={false} refresh={false}>
      <Stack.Screen options={{ title: story && story.items.length > 1 ? tr("Geschichte") : tr("Meldung") }} />
      <T v="title" style={titleStyle(headline(it), true)} accessibilityRole="header">{headline(it)}</T>
      {translated(it) ? (
        <View style={{ marginTop: space.s, paddingLeft: 10, borderLeftWidth: 2, borderColor: t.rule }}>
          <T v="caption">{tr("Maschinell übersetzt. Original ({lang}):", { lang: tr(LANGS[it.language || ""] || "Fremdsprache") })}</T>
          <T v="small" style={titleStyle(it.title)}>{it.title}</T>
        </View>
      ) : null}
      {/* Tigrinya: Übersetzung nur auf Wunsch, deutlich als maschinell gekennzeichnet */}
      {lang() === "ti" && it.language !== "ti" && it.title_ti ? (showTi ? (
        <View style={{ marginTop: space.s, paddingLeft: 10, borderLeftWidth: 2, borderColor: t.status.unverified }}>
          <T v="caption">{tr("Maschinelle Übersetzung, kann Fehler enthalten:")}</T>
          <T v="small" color={t.ink} style={titleStyle(it.title_ti)}>{it.title_ti}</T>
        </View>
      ) : (
        <Pressable onPress={() => { tap(); setShowTi(true); }} accessibilityRole="button" style={{ minHeight: 40, justifyContent: "center", alignSelf: "flex-start" }}>
          <T v="smallStrong" color={t.accent}>{tr("Maschinelle Übersetzung zeigen")}</T>
        </Pressable>
      )) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 4, marginTop: space.s, alignItems: "center" }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c, marginRight: 8 }} />
        <T v="smallStrong" color={t.ink}>{srcName(it.origin_domain || it.source_name)}</T>
        <T v="small">{" · "}{TYPES[it.source_type] || it.source_type} · {it.published_at ? whenOf(it) : tr("ohne Zeitangabe der Quelle, {when}", { when: whenOf(it) })}</T>
      </View>
      {/* Einordnung durch Semay: Regionen und Art, beides automatisch nach Stichwörtern */}
      <T v="caption" style={{ marginTop: 4 }}>
        {[REGION_ORDER.filter((r) => it.regions.includes(r)).map((r) => REGIONS[r]).join(", "),
          eventTypes(it).length ? tr("Art: {list}", { list: eventTypes(it).map(eventLabel).join(", ") }) : null].filter(Boolean).join(" · ")}
        {` · ${tr("automatisch eingeordnet")}`}
      </T>
      {/* Zeiten getrennt: wann die Quelle veröffentlicht hat (laut Feed) und wann Semay die Meldung abgerufen hat */}
      <T v="caption" style={{ marginTop: 2 }}>{it.published_at ? tr("Veröffentlicht {pub} (laut Quelle) · abgerufen {got}", { pub: fmtFull(it.published_at), got: fmtFull(it.fetched_at) })
        : tr("Die Quelle nennt keine Zeit · abgerufen {got}", { got: fmtFull(it.fetched_at) })}</T>
      {/* Einordnung: wer berichtet, und was das heißt. Automatisch, ohne Urteil über die Wahrheit. */}
      {(() => { const a = assess(story?.items || [it]); return (
        <View style={{ marginTop: space.m, paddingLeft: 10, borderLeftWidth: 3, borderColor: kindColor(a.kind, t) }} accessibilityRole="summary">
          <T v="smallStrong" color={kindColor(a.kind, t)}>{a.label}</T>
          <T v="small" color={t.ink}>{a.text}</T>
          <T v="caption" style={{ marginTop: 2 }}>{tr("Automatische Einordnung. Semay prüft nicht, ob es stimmt.")}</T>
        </View>); })()}
      {placesIn(it.title).length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.s, alignItems: "center" }}>
          <Ionicons name="location-outline" size={15} color={t.muted} />
          {placesIn(it.title).map((pl) => (
            <Pressable key={pl.id} onPress={() => { tap(); router.push(`/place/${pl.id}`); }} accessibilityRole="button" accessibilityLabel={tr("Mehr zu {name}", { name: pl.name })} hitSlop={8}
              style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, backgroundColor: t.card, opacity: pressed ? 0.6 : 1 })}>
              <T v="caption" color={t.ink}>{pl.name}</T>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: space.s, marginTop: space.l, flexWrap: "wrap" }}>
        <View style={{ flexGrow: 1 }}><Button label={tr("Original lesen")} icon="open-outline" onPress={() => openLink(it.url)} /></View>
        <Pressable onPress={() => { tap(); toggleSaved(it); toast(on ? tr("Nicht mehr gemerkt") : tr("Gemerkt. Zu finden unter Meldungen › Gemerkt"), on ? "bookmark-outline" : "bookmark",
            { label: tr("Rückgängig"), run: () => toggleSaved(it) }); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? tr("Nicht mehr merken") : tr("Merken")}
          style={({ pressed }) => [sq(t), { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name={on ? "bookmark" : "bookmark-outline"} size={20} color={on ? t.accent : t.ink} />
        </Pressable>
        <Pressable onPress={() => (story && story.items.length > 1 ? shareStory(story) : shareItem(it))} accessibilityRole="button" accessibilityLabel={story && story.items.length > 1 ? tr("Geschichte mit allen Medien teilen") : tr("Teilen")} style={({ pressed }) => [sq(t), { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name={Platform.OS === "ios" ? "share-outline" : "share-social-outline"} size={20} color={t.ink} />
        </Pressable>
      </View>

      {it.language !== lang() ? (
        <Pressable onPress={() => { tap(); openLink(`https://translate.google.com/translate?sl=auto&tl=${lang()}&u=${encodeURIComponent(it.url)}`); }} accessibilityRole="link"
          accessibilityHint={tr("Öffnet den Artikel im Google Übersetzer")} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", marginTop: space.xs }}>
          <T v="smallStrong" color={t.accent}>{tr("Auf Deutsch lesen (Google Übersetzer)")} ↗</T>
        </Pressable>
      ) : null}
      <T v="small" style={{ marginTop: space.l }}>{TYPE_NOTE[it.source_type] || tr("Quelle noch nicht eingeordnet.")} {tr("Eine Meldung ist keine geprüfte Tatsache.")}</T>

      {story && story.items.length > 1 ? (
        <>
          <T v="h2" style={{ marginTop: space.xl }} accessibilityRole="header">{tr("Dieselbe Geschichte bei {count}", { count: plural(story.sources, "Medium", "Medien") })}</T>
          <T v="caption" style={{ marginTop: 2 }}>{tr("Zuerst {first} · zuletzt {last}", { first: fmtWhen(story.first), last: fmtWhen(story.last) })}</T>
          {/* Wer berichtet: jede Seite mit ihrer Zahl an Medien, nicht nur eine Gesamtzahl */}
          <View style={{ marginTop: space.m, gap: 6 }} accessible accessibilityLabel={tr("Wer berichtet: {list}", { list: sides.map((x) => `${TYPES[x.type] || x.type}, ${plural(x.media, "Medium", "Medien")}`).join("; ") })}>
            {sides.map((x) => (
              <View key={x.type} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.type[x.type] || t.type.aggregator }} />
                <T v="small" color={t.ink} style={{ flex: 1 }}>{TYPES[x.type] || x.type}</T>
                <T v="caption">{plural(x.media, "Medium", "Medien")}</T>
              </View>
            ))}
          </View>
          {byType.map(([k, list]) => (
            <View key={k} style={{ marginTop: byType.length > 1 ? space.m : space.s }}>
              {byType.length > 1 ? <T v="label" color={t.muted}>{TYPES[k]}</T> : null}
              {list.map((x, i) => (
                <View key={x.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}><ItemRow it={x} /></View>
              ))}
            </View>
          ))}
          {missing.length ? <View style={{ marginTop: space.m }}>
            <T v="small">{tr("Noch keine Meldung dazu in unseren Quellen von: {types}", { types: missing.map((k) => TYPES[k]).join(", ") })}</T>
            <T v="caption">{tr("Bezogen auf die Quellen, die Semay abruft. Schweigen ist keine Aussage.")}</T>
          </View> : null}
          <Pressable onPress={() => { tap(); setHow(!how); }} accessibilityRole="button" accessibilityState={{ expanded: how }} style={{ marginTop: space.s, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <T v="smallStrong" color={t.accent}>{tr("Wie wird zusammengefasst?")}</T>
          </Pressable>
          {how ? (
            <T v="caption">{tr("Schlagzeilen gehören zusammen, wenn sie seltene Wörter teilen{shared} und höchstens 48 Stunden auseinanderliegen. Das geschieht automatisch und kann irren. „Noch keine Meldung“ bezieht sich auf die erreichbaren Quellen der letzten 7 Tage; Schlagzeilen in Tigrinya, Amharisch oder Arabisch werden nicht zugeordnet.", { shared: story.shared.length ? ` ${tr("(hier: {words})", { words: story.shared.join(", ") })}` : "" })}</T>
          ) : null}
        </>
      ) : null}

    </Screen>
  );
}

const sq = (t: ReturnType<typeof useTheme>) => ({ width: 46, height: 46, borderRadius: radius.m, alignItems: "center" as const, justifyContent: "center" as const,
  backgroundColor: t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule });
