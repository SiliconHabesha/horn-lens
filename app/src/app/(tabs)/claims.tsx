// Behauptungen: Status auf einen Blick, Filter nach Stufe, Details per Tippen.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Card, Chip, ChipRow, Empty, IconButton, Screen, StatusPill, T, tap } from "../../components/ui";
import { fmtDate, fmtWhen, REGIONS, STATUS, STATUS_ORDER } from "../../lib/de";
import { useData } from "../../lib/data";
import { font, radius, space, useTheme } from "../../lib/theme";

export default function Claims() {
  const t = useTheme();
  const { data, seenBefore } = useData();
  const [st, setSt] = useState<string | null>(null);
  const [legend, setLegend] = useState(false);
  const claims = data?.claims || [];
  const counts = useMemo(() => Object.fromEntries(STATUS_ORDER.map((k) => [k, claims.filter((c) => c.status === k).length])), [claims]);
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = claims.filter((c) => (!st || c.status === st)
    && words.every((w) => `${c.statement} ${c.raw?.statement || ""} ${c.claimant} ${c.disputed_by || ""} ${REGIONS[c.region] || ""}`.toLowerCase().includes(w)));
  return (
    <Screen title="Behauptungen" sub="Einzelne Aussagen und wie gut jede belegt ist. Jede Änderung bleibt mit Datum und Quellen im Verlauf."
      right={data?.owner ? <IconButton icon="add" label="Behauptung hinzufügen" onPress={() => router.push("/claim-form?mode=add")} /> : undefined}>
      {claims.length > 4 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.card, borderRadius: radius.m, paddingHorizontal: 12, height: 44,
          borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, marginBottom: space.m }}>
          <Ionicons name="search" size={17} color={t.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Behauptungen durchsuchen" placeholderTextColor={t.faint} autoCorrect={false}
            style={{ flex: 1, fontFamily: font.regular, fontSize: 16, color: t.ink, height: 42 }} accessibilityLabel="Behauptungen durchsuchen" />
          {q ? <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Suche löschen"><Ionicons name="close-circle" size={18} color={t.faint} /></Pressable> : null}
        </View>
      ) : null}
      <ChipRow>
        <Chip label="Alle" count={claims.length} active={!st} onPress={() => setSt(null)} />
        {STATUS_ORDER.filter((k) => counts[k]).map((k) => (
          <Chip key={k} label={STATUS[k][0]} count={counts[k]} color={t.status[k]} active={st === k} onPress={() => setSt(st === k ? null : k)} />
        ))}
      </ChipRow>
      <Pressable onPress={() => { tap(); setLegend(!legend); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.m }} accessibilityRole="button"
        accessibilityState={{ expanded: legend }}>
        <Ionicons name={legend ? "chevron-down" : "chevron-forward"} size={15} color={t.accent} />
        <T v="smallStrong" color={t.accent}>Was die Stufen bedeuten</T>
      </Pressable>
      {legend ? (
        <Card style={{ marginTop: space.s, gap: 10 }}>
          {STATUS_ORDER.map((k) => (
            <View key={k} style={{ gap: 2 }}>
              <StatusPill status={k} small />
              <T v="small">{STATUS[k][1]}</T>
            </View>
          ))}
          <T v="small">Zwei Quellen gelten nur als unabhängig, wenn es verschiedene Organisationen sind. Eine Reuters-Meldung, die ein anderes Medium übernimmt, zählt einmal.</T>
        </Card>
      ) : null}
      <View style={{ gap: space.s, marginTop: space.m }}>
        {list.map((c) => {
          const changed = c.events.some((e) => new Date(e.at).getTime() > seenBefore);
          let since = null as string | null;
          for (const e of c.events) { if (e.status === c.status) since = e.at; else break; }
          return (
            <Card key={c.id} onPress={() => router.push(`/claim/${c.id}`)} accessibilityLabel={`${STATUS[c.status]?.[0]}: ${c.statement}`}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <StatusPill status={c.status} />
                  {c.party_claim ? <T v="caption" style={{ borderWidth: 1, borderColor: t.rule, borderRadius: 4, paddingHorizontal: 5 }}>Konfliktpartei</T> : null}
                </View>
                {changed ? <T v="label" color={t.accent}>Geändert</T> : null}
              </View>
              <T v="h3" style={{ marginTop: 8 }}>{c.statement}</T>
              <T v="small" style={{ marginTop: 6 }} numberOfLines={2}>Wer sagt es: {c.claimant}</T>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <T v="caption">{REGIONS[c.region] || c.region}{since ? ` · ${STATUS[c.status]?.[0]} seit ${fmtDate(since)}` : ""}</T>
                <T v="caption">{c.events[0] ? fmtWhen(c.events[0].at) : ""}</T>
              </View>
            </Card>
          );
        })}
        {!list.length ? <Empty icon="checkmark-done-circle-outline" text={claims.length ? (q ? "Keine Behauptung passt zur Suche." : "Keine Behauptung mit dieser Stufe.") : "Noch keine Behauptungen erfasst."} /> : null}
      </View>
    </Screen>
  );
}
