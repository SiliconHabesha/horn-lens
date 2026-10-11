// Meldungen: nach Region, Zeitraum und Suchwort filtern.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dedupe, ItemRow, itemTime, Voices } from "../../components/items";
import { Banner, Chip, ChipRow, Empty, T } from "../../components/ui";
import { ago, REGION_ORDER, REGIONS, TYPE_ORDER, TYPES } from "../../lib/de";
import { useData } from "../../lib/data";
import { font, radius, space, useTheme } from "../../lib/theme";

export default function News() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const p = useLocalSearchParams<{ region?: string; new?: string }>();
  const { data, refreshing, refresh, seenBefore, offline, loadedAt } = useData();
  const owner = !!data?.owner;
  const [region, setRegion] = useState<string>(p.region && REGIONS[p.region] ? p.region : "all");
  const [hours, setHours] = useState(24);
  const [onlyNew, setOnlyNew] = useState(p.new === "1");
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { if (p.region && REGIONS[p.region]) setRegion(p.region); }, [p.region]);
  useEffect(() => { if (p.new === "1") { setOnlyNew(true); setHours(72); } }, [p.new]);

  const base = useMemo(() => {
    if (!data) return [];
    const pool = owner ? data.items : data.items.filter((i) => i.regions.length === 1 && i.regions[0] === "red_sea");
    return pool.filter((i) => Date.now() - new Date(itemTime(i)).getTime() < hours * 3600e3);
  }, [data, owner, hours]);
  const counts = useMemo(() => Object.fromEntries(REGION_ORDER.map((r) => [r, dedupe(base.filter((i) => i.regions.includes(r))).length])), [base]);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return dedupe(base.filter((i) => (region === "all" || i.regions.includes(region))
      && (!onlyNew || new Date(i.fetched_at).getTime() > seenBefore)
      && (!type || i.source_type === type)
      && words.every((w) => `${i.title} ${i.origin_domain || ""} ${i.source_name}`.toLowerCase().includes(w))))
      .sort((a, b) => (itemTime(a) < itemTime(b) ? 1 : -1));
  }, [base, region, onlyNew, type, q, seenBefore]);
  const typesPresent = useMemo(() => TYPE_ORDER.filter((k) => base.some((i) => i.source_type === k && (region === "all" || i.regions.includes(region)))), [base, region]);

  const header = (
    <View style={{ paddingTop: ins.top + space.m, gap: space.m, paddingBottom: space.s, maxWidth: 760, width: "100%", alignSelf: "center" }}>
      <View>
        <T v="display" accessibilityRole="header">{owner ? "Meldungen" : "Rotes Meer"}</T>
        <T v="small" style={{ marginTop: 4 }}>Schlagzeilen mit Link zum Original. Eine Meldung ist keine geprüfte Tatsache.</T>
      </View>
      {offline && loadedAt ? <Banner icon="cloud-offline-outline" tone="warn" text={`Keine Verbindung. Stand: ${ago(loadedAt)}.`} action="Erneut" onAction={refresh} /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.card, borderRadius: radius.m, paddingHorizontal: 12, height: 42,
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule }}>
        <Ionicons name="search" size={17} color={t.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder="Suchen, z. B. Assab oder Reuters" placeholderTextColor={t.faint}
          style={{ flex: 1, fontFamily: font.regular, fontSize: 15.5, color: t.ink, height: 40 }} returnKeyType="search" clearButtonMode="while-editing"
          accessibilityLabel="Meldungen durchsuchen" autoCorrect={false} />
        {q ? <Ionicons name="close-circle" size={18} color={t.faint} onPress={() => setQ("")} accessibilityLabel="Suche löschen" /> : null}
      </View>
      {owner ? (
        <ChipRow>
          <Chip label="Alle" active={region === "all"} onPress={() => setRegion("all")} />
          {REGION_ORDER.map((r) => <Chip key={r} label={REGIONS[r]} count={counts[r]} active={region === r} onPress={() => setRegion(r)} />)}
        </ChipRow>
      ) : null}
      <ChipRow>
        <Chip label="24 Stunden" active={hours === 24} onPress={() => setHours(24)} />
        <Chip label="3 Tage" active={hours === 72} onPress={() => setHours(72)} />
        <Chip label="Nur neue" active={onlyNew} onPress={() => setOnlyNew(!onlyNew)} />
        {typesPresent.length > 1 ? typesPresent.map((k) => (
          <Chip key={k} label={TYPES[k]} color={t.type[k]} active={type === k} onPress={() => setType(type === k ? null : k)} />
        )) : null}
      </ChipRow>
      {list.length ? <View style={{ paddingTop: 4 }}><Voices items={list} /></View> : null}
      <T v="caption">{list.length === 1 ? "1 Meldung" : `${list.length} Meldungen`}</T>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingHorizontal: space.l, paddingBottom: space.xxl * 2 }}
      data={list}
      keyExtractor={(it, i) => `${it.id}-${i}`}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => (
        <View style={{ maxWidth: 760, width: "100%", alignSelf: "center", borderTopWidth: index ? StyleSheet.hairlineWidth : 0, borderColor: t.rule }}>
          <ItemRow it={item} isNew={new Date(item.fetched_at).getTime() > seenBefore} />
        </View>
      )}
      ListEmptyComponent={<Empty icon="newspaper-outline" text={q || onlyNew || type ? "Keine Meldung passt zu diesen Filtern." :
        region === "eritrea" ? "Keine Meldungen zu Eritrea in diesem Zeitraum. Aus dem Land dringen kaum unabhängige Nachrichten." : "Keine Meldungen in diesem Zeitraum aus unseren Quellen."} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.muted} colors={[t.accent]} />}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={20}
    />
  );
}
