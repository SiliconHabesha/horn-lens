// Behauptungen: Status auf einen Blick, Filter nach Stufe, Details per Tippen.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Card, Chip, ChipRow, Empty, IconButton, Screen, StatusPill, T, tap } from "../../components/ui";
import { fmtDate, fmtWhen, REGIONS, STATUS, STATUS_ORDER } from "../../lib/de";
import { useData } from "../../lib/data";
import { noOutline, font, radius, space, useTheme } from "../../lib/theme";

export default function Claims() {
  const t = useTheme();
  const { data, seenBefore } = useData();
  const [st, setSt] = useState<string | null>(null);
  const claims = data?.claims || [];
  const counts = useMemo(() => Object.fromEntries(STATUS_ORDER.map((k) => [k, claims.filter((c) => c.status === k).length])), [claims]);
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const [sort, setSort] = useState<"changed" | "stale">("changed");
  const lastAt = (c: typeof claims[0]) => c.events[0]?.at || c.updated_at;
  const list = claims.filter((c) => (!st || c.status === st)
    && words.every((w) => `${c.statement} ${c.raw?.statement || ""} ${c.claimant} ${c.disputed_by || ""} ${REGIONS[c.region] || ""}`.toLowerCase().includes(w))).sort((x, y) => (sort === "changed" ? (lastAt(x) < lastAt(y) ? 1 : -1) : (lastAt(x) < lastAt(y) ? -1 : 1)));
  return (
    <Screen title="Behauptungen"
      right={data?.owner ? <IconButton icon="add" label="Behauptung hinzufügen" onPress={() => router.push("/claim-form?mode=add")} /> : undefined}>
      <ChipRow>
        <Chip label="Alle" count={claims.length} active={!st} onPress={() => setSt(null)} />
        {STATUS_ORDER.filter((k) => counts[k]).map((k) => (
          <Chip key={k} label={STATUS[k][0]} count={counts[k]} color={t.status[k]} active={st === k} onPress={() => setSt(st === k ? null : k)} />
        ))}
      </ChipRow>
      {claims.length > 4 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: space.m }}>
          {claims.length > 4 ? (
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.card, borderRadius: radius.m, paddingHorizontal: 12, height: 44,
              borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule }}>
              <Ionicons name="search" size={17} color={t.faint} />
              <TextInput value={q} onChangeText={setQ} placeholder="Suchen" placeholderTextColor={t.faint} autoCorrect={false}
                style={{ ...noOutline, flex: 1, fontFamily: font.regular, fontSize: 16, color: t.ink, height: 42 }} accessibilityLabel="Behauptungen durchsuchen" />
              {q ? <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Suche löschen"><Ionicons name="close-circle" size={18} color={t.faint} /></Pressable> : null}
            </View>
          ) : <View style={{ flex: 1 }} />}
          <Pressable onPress={() => { tap(); setSort(sort === "changed" ? "stale" : "changed"); }} accessibilityRole="button"
            accessibilityLabel={`Reihenfolge: ${sort === "changed" ? "zuletzt geändert zuerst" : "länger nicht geprüft zuerst"}. Tippen zum Wechseln`}
            style={({ pressed }) => ({ height: 44, paddingHorizontal: 12, borderRadius: radius.m, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.card,
              borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="swap-vertical" size={16} color={t.ink} />
            <T v="smallStrong">{sort === "changed" ? "Neueste" : "Älteste"}</T>
          </Pressable>
        </View>
      ) : null}
      <View style={{ marginTop: space.s }}>
        {list.map((c, i) => {
          const changed = c.events.some((e) => new Date(e.at).getTime() > seenBefore);
          let since = null as string | null;
          for (const e of c.events) { if (e.status === c.status) since = e.at; else break; }
          const days = Math.floor((Date.now() - new Date(lastAt(c)).getTime()) / 864e5);
          return (
            <Pressable key={c.id} onPress={() => { tap(); router.push(`/claim/${c.id}`); }} accessibilityRole="button" accessibilityLabel={`${STATUS[c.status]?.[0]}: ${c.statement}`}
              style={({ pressed }) => ({ paddingVertical: 14, gap: 5, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <StatusPill status={c.status} small />
                {c.party_claim ? <T v="caption">· Konfliktpartei</T> : null}
              </View>
              <T v={changed ? "bodyStrong" : "body"} color={t.ink} numberOfLines={3}>{c.statement}</T>
              <T v="caption">
                {REGIONS[c.region] || c.region}{since ? ` · seit ${fmtDate(since)}` : ""}
                {changed ? " · geändert" : sort === "stale" && days >= 7 ? ` · ${days} Tage unverändert` : ""}
              </T>
            </Pressable>
          );
        })}
        {!list.length ? <Empty icon="checkmark-done-circle-outline" text={claims.length ? (q ? "Keine Behauptung passt zur Suche." : "Keine Behauptung mit dieser Stufe.") : "Noch keine Behauptungen erfasst."} /> : null}
      </View>
    </Screen>
  );
}
