// Was kursiert: Geschichten aus den Medien, automatisch eingeordnet (eine Quelle, eine Seite, bestritten, von außen, verschiedene Seiten).
// Semay prüft nichts selbst (Entscheidung des Inhabers, 13.10.2026). Die Einordnung beschreibt nur, wer berichtet.
// Was nur in sozialen Netzwerken kursiert, sieht Semay nicht; das steht oben.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { StoryCard } from "../../components/items";
import { Skeleton } from "../../components/Skeleton";
import { Chip, ChipRow, Empty, Screen, T, TabTools, tap } from "../../components/ui";
import { assess, KIND_ORDER, kindColor, kindLabel, type Kind } from "../../lib/assess";
import { PERIODS, periodLabel } from "../../lib/brief";
import { useData } from "../../lib/data";
import { t as tr } from "../../lib/i18n";
import { storiesOf } from "../../lib/stories";
import { radius, space, useTheme } from "../../lib/theme";

export default function Circulating() {
  const t = useTheme();
  const { data, seenBefore } = useData();
  const [hours, setHours] = useState(72);
  const [kind, setKind] = useState<Kind | null>(null);
  const [legend, setLegend] = useState(false);
  const rows = useMemo(() => {
    if (!data) return [];
    const since = Date.now() - hours * 3600e3;
    return storiesOf(data).filter((s) => new Date(s.last).getTime() >= since).map((s) => ({ s, a: assess(s.items) }))
      // Was Vorsicht braucht, zuerst; innerhalb einer Art die meistberichteten und neuesten
      .sort((x, y) => KIND_ORDER.indexOf(x.a.kind) - KIND_ORDER.indexOf(y.a.kind) || y.s.sources - x.s.sources || (x.s.last < y.s.last ? 1 : -1));
  }, [data, hours]);
  const counts = useMemo(() => { const c: Partial<Record<Kind, number>> = {}; for (const r of rows) c[r.a.kind] = (c[r.a.kind] || 0) + 1; return c; }, [rows]);
  const list = rows.filter((r) => !kind || r.a.kind === kind);

  if (!data) return <Screen title={tr("Was kursiert")} right={<TabTools />}><Skeleton rows={5} /></Screen>;
  return (
    <Screen title={tr("Was kursiert")} sub={tr("Geschichten aus den Medien, automatisch eingeordnet: wer berichtet, und was das heißt.")} right={<TabTools />}>
      {/* Ehrlich, was Semay nicht kann */}
      <View style={{ flexDirection: "row", gap: 10, padding: space.m, borderRadius: radius.l, backgroundColor: t.cardAlt, marginBottom: space.m }}>
        <Ionicons name="information-circle-outline" size={18} color={t.muted} style={{ marginTop: 1 }} />
        <T v="small" color={t.ink} style={{ flex: 1 }}>{tr("Semay zeigt, was Medien berichten, nicht, was in sozialen Netzwerken kursiert. Semay prüft nichts selbst: Eine einzige Quelle ist ein Grund zur Vorsicht, viele Quellen beweisen aber nichts.")}</T>
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: space.s }} accessibilityRole="radiogroup" accessibilityLabel={tr("Zeitraum")}>
        {PERIODS.map((h) => <Chip key={h} label={periodLabel(h)} active={hours === h} onPress={() => setHours(h)} />)}
      </View>
      <ChipRow>
        <Chip label={tr("Alle")} count={rows.length} active={!kind} onPress={() => setKind(null)} />
        {KIND_ORDER.filter((k) => counts[k]).map((k) => <Chip key={k} label={kindLabel(k)} count={counts[k]} color={kindColor(k, t)} active={kind === k} onPress={() => setKind(kind === k ? null : k)} />)}
      </ChipRow>
      <Pressable onPress={() => { tap(); setLegend(!legend); }} accessibilityRole="button" accessibilityState={{ expanded: legend }} style={{ minHeight: 40, justifyContent: "center", alignSelf: "flex-start" }}>
        <T v="smallStrong" color={t.accent}>{legend ? tr("Erklärung schließen") : tr("Was die Hinweise bedeuten")}</T>
      </Pressable>
      {legend ? (
        <View style={{ gap: 8, marginBottom: space.m }}>
          {([["contested", "Mindestens eine Meldung berichtet, dass etwas bestritten oder zurückgewiesen wird."],
            ["single", "Bisher berichtet nur ein Medium darüber. Grund zur Vorsicht."],
            ["oneSide", "Alle Medien gehören zu einer Konfliktseite, etwa nur Eritreas Regierung oder nur Exilmedien."],
            ["outside", "Nur Medien von außerhalb berichten; keine Konfliktseite hat sich in unseren Quellen geäußert."],
            ["multi", "Medien verschiedener Seiten berichten. Das bestätigt es nicht, oft stützen sich alle auf dieselbe Erklärung."]] as [Kind, string][]).map(([k, text]) => (
            <View key={k} style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: kindColor(k, t) }} />
              <T v="small" style={{ flex: 1 }}><T v="smallStrong" color={t.ink}>{kindLabel(k)}: </T>{tr(text)}</T>
            </View>
          ))}
          <T v="caption">{tr("Die Zuordnung der Quellen zu Seiten steht unter Mehr › Quellen.")}</T>
        </View>
      ) : null}
      <View>
        {list.map(({ s }, i) => (
          <View key={s.key} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
            <StoryCard s={s} seenBefore={seenBefore} />
          </View>
        ))}
        {!list.length ? <Empty icon="chatbubbles-outline" text={rows.length ? tr("Keine Geschichte mit diesem Hinweis im Zeitraum.") : tr("In diesem Zeitraum keine Meldungen aus unseren Quellen.")} /> : null}
      </View>
      {data.claims.length ? (
        <Pressable onPress={() => { tap(); router.push("/archive"); }} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center", marginTop: space.l }}>
          <T v="smallStrong" color={t.accent}>{tr("Archiv: früher von Hand geprüfte Behauptungen ({n})", { n: data.claims.length })}</T>
        </Pressable>
      ) : null}
    </Screen>
  );
}
