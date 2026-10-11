// Eine Meldung im Detail: wer berichtet, wie die Quelle einzuordnen ist, wer noch über dieselbe Geschichte berichtet.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { ItemRow, shareItem, shareStory, titleStyle, whenOf } from "../../components/items";
import { toast } from "../../components/Toast";
import { Button, Empty, openLink, Screen, T, tap } from "../../components/ui";
import { fmtWhen, plural, TYPE_NOTE, TYPE_ORDER, TYPES } from "../../lib/de";
import { knownItem, useData } from "../../lib/data";
import { placesIn } from "../../lib/places";
import { storiesOf, VOICE_TYPES } from "../../lib/stories";
import { radius, space, useTheme } from "../../lib/theme";
import type { Item } from "../../lib/types";
import { Skeleton } from "../../components/Skeleton";

export default function ItemDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saved, isSaved, toggleSaved } = useData();
  const [how, setHow] = useState(false);
  // Offene Ausgabe: nur Meldungen, die sie auch in der Liste zeigt (Rotes Meer)
  const pool = data ? (data.owner ? data.items : data.items.filter((i) => i.regions.length === 1 && i.regions[0] === "red_sea")) : [];
  const it: Item | undefined = pool.find((x) => String(x.id) === String(id)) || saved.find((x) => String(x.id) === String(id)) || knownItem(Number(id));
  const story = useMemo(() => (data && it ? storiesOf(data).find((s) => s.items.some((x) => x.id === it.id)) : undefined), [data, it]);

  if (!it) {
    return (
      <Screen topInset={false} refresh={false}>
        <Stack.Screen options={{ title: "Meldung" }} />
        {data ? <Empty icon="newspaper-outline" text="Diese Meldung ist älter als 72 Stunden und nicht mehr abrufbar. Gemerkte Meldungen bleiben unter „Gemerkt“." /> : <Skeleton rows={4} />}
      </Screen>
    );
  }
  const c = t.type[it.source_type] || t.type.aggregator;
  const others = story ? story.items.filter((x) => x.id !== it.id) : [];
  const byType = TYPE_ORDER.map((k) => [k, others.filter((x) => x.source_type === k)] as const).filter(([, l]) => l.length);
  // Welche Seiten haben (in unseren Quellen) noch nicht berichtet? Nur Quellenarten, die Horn Lens überhaupt abruft.
  // Vorsichtig: nur Quellenarten, deren Quellen gerade erreichbar sind und die lateinisch geschriebene Schlagzeilen liefern
  // (Schlagzeilen in Tigrinya, Amharisch oder Arabisch kann Horn Lens nicht zuordnen)
  const latin = (s: string) => /[a-z]{3}/i.test(s) && !/[\u1200-\u137f\u0600-\u06ff]/.test(s);
  const okTypes = new Set((data?.sources || []).filter((s) => s.last_ok_at && Date.now() - new Date(s.last_ok_at).getTime() < 24 * 3600e3).map((s) => s.source_type));
  const tracked = new Set(pool.filter((x) => latin(x.title) && okTypes.has(x.source_type)).map((x) => x.source_type));
  const reported = new Set((story?.items || [it]).map((x) => x.source_type));
  const missing = data?.owner && story && story.items.length > 1 && latin(it.title) ? VOICE_TYPES.filter((k) => tracked.has(k) && !reported.has(k)) : [];
  const on = isSaved(it);

  return (
    <Screen topInset={false} refresh={false}>
      <Stack.Screen options={{ title: story && story.items.length > 1 ? "Geschichte" : "Meldung" }} />
      <T v="title" style={titleStyle(it.title, true)} accessibilityRole="header">{it.title}</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 8, rowGap: 4, marginTop: space.s, alignItems: "center" }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c }} />
        <T v="smallStrong" color={t.ink}>{it.origin_domain || it.source_name}</T>
        <T v="small">{TYPES[it.source_type] || it.source_type} · {it.published_at ? whenOf(it) : `ohne Zeitangabe der Quelle, ${whenOf(it)}`}</T>
      </View>
      {placesIn(it.title).length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.s, alignItems: "center" }}>
          <Ionicons name="location-outline" size={15} color={t.muted} />
          {placesIn(it.title).map((pl) => (
            <Pressable key={pl.id} onPress={() => { tap(); router.push(`/place/${pl.id}`); }} accessibilityRole="button" accessibilityLabel={`Mehr zu ${pl.name}`} hitSlop={8}
              style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, backgroundColor: t.card, opacity: pressed ? 0.6 : 1 })}>
              <T v="caption" color={t.ink}>{pl.name}</T>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: space.s, marginTop: space.l, flexWrap: "wrap" }}>
        <View style={{ flexGrow: 1 }}><Button label="Original lesen" icon="open-outline" onPress={() => openLink(it.url)} /></View>
        <Pressable onPress={() => { tap(); toggleSaved(it); toast(on ? "Nicht mehr gemerkt" : "Gemerkt. Zu finden unter Meldungen › Gemerkt", on ? "bookmark-outline" : "bookmark",
            { label: "Rückgängig", run: () => toggleSaved(it) }); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? "Nicht mehr merken" : "Merken"}
          style={({ pressed }) => [sq(t), { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name={on ? "bookmark" : "bookmark-outline"} size={20} color={on ? t.accent : t.ink} />
        </Pressable>
        <Pressable onPress={() => (story && story.items.length > 1 ? shareStory(story) : shareItem(it))} accessibilityRole="button" accessibilityLabel={story && story.items.length > 1 ? "Geschichte mit allen Medien teilen" : "Teilen"} style={({ pressed }) => [sq(t), { opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name={Platform.OS === "ios" ? "share-outline" : "share-social-outline"} size={20} color={t.ink} />
        </Pressable>
      </View>

      <T v="small" style={{ marginTop: space.l }}>{TYPE_NOTE[it.source_type] || "Quelle noch nicht eingeordnet."} Eine Meldung ist keine geprüfte Tatsache.</T>

      {story && story.items.length > 1 ? (
        <>
          <T v="h2" style={{ marginTop: space.xl }} accessibilityRole="header">Dieselbe Geschichte bei {plural(story.sources, "Medium", "Medien")}</T>
          <T v="caption" style={{ marginTop: 2 }}>Erste Meldung {fmtWhen(story.first)}, letzte {fmtWhen(story.last)}</T>
          {byType.map(([k, list]) => (
            <View key={k} style={{ marginTop: byType.length > 1 ? space.m : space.s }}>
              {byType.length > 1 ? <T v="label" color={t.muted}>{TYPES[k]}</T> : null}
              {list.map((x, i) => (
                <View key={x.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}><ItemRow it={x} /></View>
              ))}
            </View>
          ))}
          {missing.length ? <T v="small" style={{ marginTop: space.m }}>Nicht berichtet von: {missing.map((k) => TYPES[k]).join(", ")}</T> : null}
          <Pressable onPress={() => { tap(); setHow(!how); }} accessibilityRole="button" accessibilityState={{ expanded: how }} hitSlop={6} style={{ marginTop: space.m, paddingVertical: 6 }}>
            <T v="smallStrong" color={t.accent}>Wie wird zusammengefasst?</T>
          </Pressable>
          {how ? (
            <T v="caption">Schlagzeilen gehören zusammen, wenn sie seltene Wörter teilen{story.shared.length ? ` (hier: ${story.shared.join(", ")})` : ""} und höchstens 48 Stunden auseinanderliegen. Das geschieht automatisch und kann irren. „Nicht berichtet“ bezieht sich auf die erreichbaren Quellen der letzten 72 Stunden; Schlagzeilen in Tigrinya, Amharisch oder Arabisch werden nicht zugeordnet.</T>
          ) : null}
        </>
      ) : null}

      {data?.owner ? (
        <View style={{ marginTop: space.xl }}>
          <Button label="Behauptung daraus anlegen" icon="add-circle-outline" kind="secondary"
            onPress={() => router.push({ pathname: "/claim-form", params: { mode: "add", src_title: `${it.origin_domain || it.source_name}: ${it.title}`.slice(0, 300), src_url: it.url } })} />
        </View>
      ) : null}
    </Screen>
  );
}

const sq = (t: ReturnType<typeof useTheme>) => ({ width: 46, height: 46, borderRadius: radius.m, alignItems: "center" as const, justifyContent: "center" as const,
  backgroundColor: t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule });
