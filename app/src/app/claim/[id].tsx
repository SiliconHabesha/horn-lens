// Eine Behauptung im Detail: wer sagt es, wer bestreitet es, Belege und der ganze Verlauf.
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Empty, openLink, Screen, StatusPill, T, tap } from "../../components/ui";
import { endDot, fmtDate, fmtIsoDay, REGIONS, STATUS } from "../../lib/de";
import { ItemRow } from "../../components/items";
import { useData } from "../../lib/data";
import { related } from "../../lib/stories";
import { space, useTheme } from "../../lib/theme";
import type { Claim, ClaimEvent, Ref } from "../../lib/types";

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
          <View style={{ flex: 1 }}><Button label="Stufe ändern" icon="swap-vertical" onPress={() => router.push(`/claim-form?mode=status&id=${c.id}`)} /></View>
          <View style={{ flex: 1 }}><Button label="Neuer Beleg" icon="link-outline" kind="secondary" onPress={() => router.push(`/claim-form?mode=status&intent=evidence&id=${c.id}`)} /></View>
        </View>
      ) : null}
      {data?.owner ? (
        <Pressable onPress={() => { tap(); router.push(`/claim-form?mode=edit&id=${c.id}`); }} accessibilityRole="button" hitSlop={6} style={{ alignSelf: "center", paddingVertical: 10 }}>
          <T v="smallStrong" color={t.accent}>Angaben berichtigen</T>
        </Pressable>
      ) : null}

      {data?.owner ? <Related c={c} /> : null}

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

// Neue Meldungen, die zur Behauptung passen könnten: Anlass, die Stufe zu prüfen
function Related({ c }: { c: Claim }) {
  const t = useTheme();
  const { data, seenBefore } = useData();
  const known = new Set(c.events.flatMap((e) => sourcesOf(e).map((s) => s.url)));
  const list = data ? related(`${c.raw?.statement || ""} ${c.statement}`, data, 6).filter((r) => !known.has(r.it.url)).slice(0, 4) : [];
  if (!list.length) return null;
  return (
    <>
      <T v="h2" style={{ marginTop: space.xl }}>Ähnliche Meldungen, 72 Std.</T>
      <T v="small" style={{ marginTop: 2, marginBottom: space.s }}>Automatisch über gemeinsame Wörter gefunden. Prüfen, ob sie die Behauptung stützen, widerlegen oder nur erwähnen.</T>
      <Card style={{ paddingVertical: space.s }}>
        {list.map(({ it, shared }, i) => (
          <View key={it.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
            <ItemRow it={it} isNew={new Date(it.fetched_at).getTime() > seenBefore} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: -6, marginBottom: 10, marginLeft: 15 }}>
              <T v="caption" style={{ flex: 1 }}>Gemeinsam: {shared.slice(0, 4).join(", ")}</T>
              <Pressable onPress={() => { tap(); router.push({ pathname: "/claim-form", params: { mode: "status", id: String(c.id),
                src_title: `${it.origin_domain || it.source_name}, ${fmtDate(it.published_at || it.fetched_at)}`, src_url: it.url } }); }}
                accessibilityRole="button" accessibilityLabel={`${it.title} als Beleg übernehmen`} hitSlop={8}
                style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, backgroundColor: t.card, opacity: pressed ? 0.6 : 1 })}>
                <T v="caption" color={t.ink}>Als Beleg übernehmen</T>
              </Pressable>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}
