// Eine Behauptung im Detail: wer sagt es, wer bestreitet es, Belege und der ganze Verlauf.
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { Button, Card, Empty, openLink, Screen, StatusPill, T, tap } from "../../components/ui";
import { endDot, fmtDate, fmtIsoDay, REGIONS, STATUS } from "../../lib/de";
import { useData } from "../../lib/data";
import { space, useTheme } from "../../lib/theme";
import type { ClaimEvent, Ref } from "../../lib/types";

const sourcesOf = (e: ClaimEvent): Ref[] => [
  ...(e.source_url ? [{ title: e.source_title, url: e.source_url }] : []),
  ...(e.extra || []).filter((x) => x && x.url),
];

export function SourceLinks({ list }: { list: Ref[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {list.map((s, i) => (
        <Pressable key={i} onPress={() => { tap(); openLink(s.url); }} accessibilityRole="link"
          style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: t.cardAlt, opacity: pressed ? 0.6 : 1 })}>
          <T v="caption" color={t.ink}>{s.title || "Quelle"} ↗</T>
        </Pressable>
      ))}
    </View>
  );
}

export default function ClaimDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useData();
  const c = data?.claims.find((x) => String(x.id) === String(id));
  if (!c) return <Screen topInset={false}><Stack.Screen options={{ title: "Behauptung" }} /><Empty text="Diese Behauptung gibt es nicht (mehr)." /></Screen>;
  const evidence = c.events.find((e) => e.status === c.status && sourcesOf(e).length);
  const earlier = evidence ? null : c.events.find((e) => sourcesOf(e).length);
  let since: string | null = null;
  for (const e of c.events) { if (e.status === c.status) since = e.at; else break; }
  return (
    <Screen refresh topInset={false}>
      <Stack.Screen options={{ title: STATUS[c.status]?.[0] || "Behauptung" }} />
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <StatusPill status={c.status} />
        {c.party_claim ? <T v="caption" style={{ borderWidth: 1, borderColor: t.rule, borderRadius: 4, paddingHorizontal: 5 }}>Konfliktpartei</T> : null}
      </View>
      <T v="title" style={{ marginTop: space.s }}>{c.statement}</T>
      <T v="small" style={{ marginTop: space.s }}>{STATUS[c.status]?.[1]}</T>

      <Card style={{ marginTop: space.l, gap: 10 }}>
        <View><T v="label" color={t.muted}>Wer sagt es</T><T v="body">{endDot(c.claimant)}</T></View>
        {c.disputed_by ? <View><T v="label" color={t.muted}>Wer bestreitet es</T><T v="body">{endDot(c.disputed_by)}</T></View> : null}
        <View style={{ flexDirection: "row", gap: space.xl, flexWrap: "wrap" }}>
          <View><T v="label" color={t.muted}>Region</T><T v="body">{REGIONS[c.region] || c.region}</T></View>
          <View><T v="label" color={t.muted}>Zuerst gemeldet</T><T v="body">{fmtIsoDay(c.first_reported, { day: "numeric", month: "long", year: "numeric" })}</T></View>
          {since ? <View><T v="label" color={t.muted}>Stufe seit</T><T v="body">{fmtDate(since)}</T></View> : null}
        </View>
        {evidence ? (
          <View><T v="label" color={t.muted}>Neueste Belege{evidence.admission ? " · von der betroffenen Seite eingeräumt" : ""}</T><SourceLinks list={sourcesOf(evidence)} /></View>
        ) : earlier ? (
          <View><T v="label" color={t.muted}>Belege aus der Zeit, als sie als „{STATUS[earlier.status]?.[0]}“ galt</T><SourceLinks list={sourcesOf(earlier)} /></View>
        ) : null}
      </Card>

      {data?.owner ? (
        <View style={{ flexDirection: "row", gap: space.s, marginTop: space.m }}>
          <View style={{ flex: 1 }}><Button label="Status ändern" icon="swap-vertical" onPress={() => router.push(`/claim-form?mode=status&id=${c.id}`)} /></View>
          <View style={{ flex: 1 }}><Button label="Berichtigen" icon="create-outline" kind="secondary" onPress={() => router.push(`/claim-form?mode=edit&id=${c.id}`)} /></View>
        </View>
      ) : null}

      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.m }}>Verlauf</T>
      <View>
        {c.events.map((e, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ alignItems: "center", width: 14 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.status[e.status] || t.muted, marginTop: 4 }} />
              {i < c.events.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: t.rule, marginVertical: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: space.l }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <T v="smallStrong">{fmtDate(e.at)}</T>
                <StatusPill status={e.status} small />
              </View>
              <T v="body" style={{ marginTop: 4 }}>{e.note}</T>
              {sourcesOf(e).length ? <SourceLinks list={sourcesOf(e)} /> : null}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
