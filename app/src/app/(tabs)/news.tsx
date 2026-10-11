// Meldungen: als Geschichten (gleiche Nachricht, mehrere Medien) oder einzeln; nach Region, Zeitraum, Quellenart und Suchwort filtern; Gemerktes.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Switch, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dedupe, ItemRow, itemTime, StoryCard, Voices } from "../../components/items";
import { Skeleton } from "../../components/Skeleton";
import { Banner, Chip, ChipRow, Empty, IconButton, T, tap } from "../../components/ui";
import { ago, plural, REGION_ORDER, REGIONS, TYPE_ORDER, TYPES } from "../../lib/de";
import { useData } from "../../lib/data";
import { narrow, storiesOf, type Story } from "../../lib/stories";
import { noOutline, font, radius, space, useTheme } from "../../lib/theme";
import type { Item } from "../../lib/types";

type Mode = "stories" | "items" | "saved";
const MODES: [Mode, string][] = [["stories", "Geschichten"], ["items", "Einzeln"], ["saved", "Gemerkt"]];

function Segmented({ value, onChange, saved }: { value: Mode; onChange: (m: Mode) => void; saved: number }) {
  const t = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: t.cardAlt, borderRadius: radius.m, padding: 3 }}>
      {MODES.map(([m, label]) => {
        const on = value === m;
        return (
          <Pressable key={m} onPress={() => { tap(); onChange(m); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: 40, borderRadius: radius.m - 3, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5,
              backgroundColor: on ? t.card : "transparent", ...(on ? { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : {}) }}>
            <T v="smallStrong" color={on ? t.ink : t.muted}>{label}</T>
            {m === "saved" && saved ? <T v="caption" color={on ? t.ink : t.muted}>{saved}</T> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function News() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const p = useLocalSearchParams<{ region?: string; new?: string; mode?: string; k?: string }>();
  const { data, refreshing, refresh, seenBefore, offline, loadedAt, loading, saved, session } = useData();
  const uid = session?.user?.id ?? null;
  const owner = !!data?.owner;
  const [mode, setMode] = useState<Mode>(p.mode === "saved" ? "saved" : "stories");
  const [region, setRegion] = useState<string>(p.region && REGIONS[p.region] ? p.region : "all");
  const [hours, setHours] = useState(24);
  const [onlyNew, setOnlyNew] = useState(p.new === "1");
  const [most, setMost] = useState(false);
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const grouped = mode !== "items";
  // Sprung aus anderen Bildschirmen (k ändert sich bei jedem Sprung, damit er auch beim zweiten Mal greift)
  useEffect(() => { if (p.region && REGIONS[p.region]) { setRegion(p.region); setMode((m) => (m === "saved" ? "stories" : m)); } }, [p.region, p.k]);
  useEffect(() => { if (p.new === "1") { setOnlyNew(true); setHours(72); } }, [p.new, p.k]);
  useEffect(() => { if (p.mode === "saved") setMode("saved"); }, [p.mode, p.k]);
  // Die offene Ausgabe hat keine Regionen-Auswahl: dann immer alle
  useEffect(() => { if (data && !data.owner && region !== "all") setRegion("all"); }, [data, region]);
  // Filter bleiben gemerkt (je Konto, beim Abmelden gelöscht); Sprünge aus anderen Bildschirmen haben Vorrang
  const FKEY = `hl:cache:newsfilter:${uid || "public"}`;
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(FKEY).then((v) => {
      if (v && !p.region && !p.mode && !p.new) {
        try { const f = JSON.parse(v); if (REGIONS[f.region] || f.region === "all") setRegion(f.region); if (f.hours === 72) setHours(72); if (f.type) setType(f.type); if (f.most) setMost(true); if (["stories", "items"].includes(f.mode)) setMode(f.mode); } catch { /* egal */ }
      }
      setRestored(true);
    }).catch(() => setRestored(true));
  }, [FKEY]);
  // Nach einem Sprung (z. B. „Alle zu Eritrea“) die gemerkten Filter nicht überschreiben
  const jumped = !!(p.region || p.mode || p.new);
  useEffect(() => { if (restored && !jumped) AsyncStorage.setItem(FKEY, JSON.stringify({ region, hours, type, most, mode })).catch(() => {}); }, [restored, region, hours, type, most, mode]);

  const base = useMemo(() => {
    if (!data) return [];
    const pool = owner ? data.items : data.items.filter((i) => i.regions.length === 1 && i.regions[0] === "red_sea");
    return pool.filter((i) => Date.now() - new Date(itemTime(i)).getTime() < hours * 3600e3);
  }, [data, owner, hours]);
  const counts = useMemo(() => Object.fromEntries(REGION_ORDER.map((r) => [r, dedupe(base.filter((i) => i.regions.includes(r))).length])), [base]);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const match = (i: Item) => words.every((w) => `${i.title} ${i.origin_domain || ""} ${i.source_name}`.toLowerCase().includes(w));
  const list = useMemo(() => dedupe(base.filter((i) => (region === "all" || i.regions.includes(region))
      && (!onlyNew || new Date(i.fetched_at).getTime() > seenBefore)
      && (!type || i.source_type === type) && match(i)))
      .sort((a, b) => (itemTime(a) < itemTime(b) ? 1 : -1)), [base, region, onlyNew, type, q, seenBefore]);
  // Eine Geschichte erscheint mit den Meldungen, die zu den Filtern passen; Kopf und Zahlen beziehen sich auf diese
  const stories = useMemo(() => {
    if (!data) return [] as Story[];
    const ids = new Set(list.map((i) => i.id));
    const s = storiesOf(data).map((x) => narrow(x, (i) => ids.has(i.id))).filter((x): x is Story => !!x);
    return most ? [...s].sort((a, b) => b.sources - a.sources || (a.last < b.last ? 1 : -1)) : s;
  }, [data, list, most]);
  const savedList = useMemo(() => saved.filter(match), [saved, q]);
  const typesPresent = useMemo(() => TYPE_ORDER.filter((k) => base.some((i) => i.source_type === k && (region === "all" || i.regions.includes(region)))), [base, region]);
  const active = (hours !== 24 ? 1 : 0) + (type ? 1 : 0) + (onlyNew ? 1 : 0) + (most && mode === "stories" ? 1 : 0) + (mode === "items" ? 1 : 0);
  const multi = stories.filter((s) => s.items.length > 1).length;

  const header = (
    <View style={{ paddingTop: ins.top + space.m, gap: space.m, paddingBottom: space.s, maxWidth: 760, width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <T v="display" accessibilityRole="header">{mode === "saved" ? "Gemerkt" : owner ? "Meldungen" : "Rotes Meer"}</T>
        <IconButton icon={mode === "saved" ? "close" : "bookmark-outline"} label={mode === "saved" ? "Gemerkt schließen" : `Gemerkt (${saved.length})`}
          onPress={() => setMode(mode === "saved" ? (grouped ? "stories" : "items") : "saved")} />
      </View>
      {offline && loadedAt ? <Banner icon="cloud-offline-outline" tone="warn" text={`Keine Verbindung. Stand: ${ago(loadedAt)}.`} action="Erneut" onAction={refresh} /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.card, borderRadius: radius.m, paddingHorizontal: 12, height: 44,
          borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule }}>
          <Ionicons name="search" size={17} color={t.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder={mode === "saved" ? "Gemerktes durchsuchen" : "Suchen"} placeholderTextColor={t.faint}
            style={{ ...noOutline, flex: 1, fontFamily: font.regular, fontSize: 16, color: t.ink, height: 42 }} returnKeyType="search" clearButtonMode="while-editing"
            accessibilityLabel="Meldungen durchsuchen" autoCorrect={false} />
          {q ? <Pressable onPress={() => setQ("")} accessibilityRole="button" accessibilityLabel="Suche löschen" hitSlop={10}><Ionicons name="close-circle" size={18} color={t.faint} /></Pressable> : null}
        </View>
        {mode !== "saved" ? (
          <Pressable onPress={() => { tap(); setShowFilters(!showFilters); }} accessibilityRole="button" accessibilityState={{ expanded: showFilters }}
            accessibilityLabel={active ? `Filter, ${active} aktiv` : "Filter"}
            style={({ pressed }) => ({ height: 44, minWidth: 44, paddingHorizontal: 12, borderRadius: radius.m, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
              backgroundColor: active || showFilters ? t.ink : t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: active || showFilters ? t.ink : t.rule, opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name="options-outline" size={18} color={active || showFilters ? t.bg : t.ink} />
            {active ? <T v="smallStrong" color={t.bg}>{active}</T> : null}
          </Pressable>
        ) : null}
      </View>
      {mode !== "saved" && showFilters ? (
        <View style={{ backgroundColor: t.card, borderRadius: radius.l, padding: space.m, gap: space.s, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule }}>
          <T v="label" color={t.muted}>Zeitraum</T>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Chip label="24 Stunden" active={hours === 24} onPress={() => setHours(24)} />
            <Chip label="3 Tage" active={hours === 72} onPress={() => setHours(72)} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            <T v="body">Nur neue seit dem letzten Besuch</T>
            <Switch value={onlyNew} onValueChange={(v) => { tap(); setOnlyNew(v); }} accessibilityLabel="Nur neue Meldungen" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            <T v="body" style={{ flex: 1 }}>Gleiche Geschichte zusammenfassen</T>
            <Switch value={grouped} onValueChange={(v) => { tap(); setMode(v ? "stories" : "items"); }} accessibilityLabel="Gleiche Geschichte zusammenfassen" />
          </View>
          {mode === "stories" ? (
            <>
              <T v="label" color={t.muted} style={{ marginTop: 4 }}>Reihenfolge</T>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Chip label="Neueste zuerst" active={!most} onPress={() => setMost(false)} />
                <Chip label="Meistberichtet zuerst" active={most} onPress={() => setMost(true)} />
              </View>
            </>
          ) : null}
          {typesPresent.length > 1 ? (
            <>
              <T v="label" color={t.muted} style={{ marginTop: 4 }}>Quellenart</T>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {typesPresent.map((k) => <Chip key={k} label={TYPES[k]} color={t.type[k]} active={type === k} onPress={() => setType(type === k ? null : k)} />)}
              </View>
            </>
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            {active ? (
              <Pressable onPress={() => { tap(); setHours(24); setType(null); setOnlyNew(false); setMost(false); setMode("stories"); }} accessibilityRole="button" hitSlop={8} style={{ paddingVertical: 6 }}>
                <T v="smallStrong" color={t.accent}>Zurücksetzen</T>
              </Pressable>
            ) : <View />}
            <Pressable onPress={() => { tap(); setShowFilters(false); }} accessibilityRole="button" hitSlop={8} style={{ paddingVertical: 6 }}>
              <T v="smallStrong">Fertig</T>
            </Pressable>
          </View>
        </View>
      ) : null}
      {mode !== "saved" && owner ? (
        <ChipRow>
          <Chip label="Alle" active={region === "all"} onPress={() => setRegion("all")} />
          {REGION_ORDER.filter((r) => counts[r] > 0 || region === r).map((r) => <Chip key={r} label={REGIONS[r]} count={counts[r]} active={region === r} onPress={() => setRegion(r)} />)}
        </ChipRow>
      ) : null}
      {mode !== "saved" && active && !showFilters ? (
        <T v="caption">Filter: {[hours === 72 ? "3 Tage" : null, onlyNew ? "nur neue" : null, most && mode === "stories" ? "meistberichtet zuerst" : null, mode === "items" ? "einzeln" : null, type ? TYPES[type] : null].filter(Boolean).join(", ")}</T>
      ) : null}
    </View>
  );

  const rows: (Item | Story)[] = mode === "stories" ? stories : mode === "items" ? list : savedList;
  const emptyText = mode === "saved" ? (q ? "Nichts Gemerktes passt zur Suche." : "Noch nichts gemerkt. In einer Meldung auf das Lesezeichen tippen.")
    : q || onlyNew || type ? "Keine Meldung passt zu diesen Filtern."
    : region === "eritrea" ? "Keine Meldungen zu Eritrea in diesem Zeitraum. Aus dem Land dringen kaum unabhängige Nachrichten." : "Keine Meldungen in diesem Zeitraum aus unseren Quellen.";

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingHorizontal: space.l, paddingBottom: space.xxl * 2 }}
      data={rows as any[]}
      keyExtractor={(x: any) => ("key" in x ? x.key : `i${x.id}`)}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => (
        <View style={{ maxWidth: 760, width: "100%", alignSelf: "center", borderTopWidth: index ? StyleSheet.hairlineWidth : 0, borderColor: t.rule }}>
          {"key" in item ? <StoryCard s={item as Story} seenBefore={seenBefore} />
            : <ItemRow it={item as Item} isNew={mode !== "saved" && new Date((item as Item).fetched_at).getTime() > seenBefore} />}
        </View>
      )}
      ListEmptyComponent={!data && loading && mode !== "saved" ? <Skeleton rows={6} /> : <Empty icon={mode === "saved" ? "bookmark-outline" : "newspaper-outline"} text={emptyText} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.muted} colors={[t.accent]} />}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={14}
    />
  );
}
