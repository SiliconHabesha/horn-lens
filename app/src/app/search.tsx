// Suche über alles: Orte, Behauptungen, Meldungen und Quellen. Zuletzt Gesuchtes bleibt auf dem Gerät (beim Abmelden gelöscht).
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Stack } from "expo-router";
import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ItemRow, itemTime } from "../components/items";
import { StatusPill, T, tap } from "../components/ui";
import { num, TYPES } from "../lib/de";
import { Skeleton } from "../components/Skeleton";
import { useData } from "../lib/data";
import { mentions, PLACES } from "../lib/places";
import { dedupe, poolOf } from "../lib/stories";
import { noOutline, font, radius, space, useTheme } from "../lib/theme";

const RECENT = (uid: string | null) => `hl:cache:search:${uid || "public"}`;
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: space.xl }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: space.s }}>
        <T v="label" color={t.muted} accessibilityRole="header">{title}</T>
        <T v="caption">{num(count)}</T>
      </View>
      <View>{children}</View>
    </View>
  );
}

export default function Search() {
  const t = useTheme();
  const { data, session, seenBefore } = useData();
  const uid = session?.user?.id ?? null;
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { AsyncStorage.getItem(RECENT(uid)).then((v) => { try { const x = JSON.parse(v || "[]"); if (Array.isArray(x)) setRecent(x); } catch { /* leer */ } }).catch(() => {}); }, [uid]);
  const forget = () => { tap(); setRecent([]); AsyncStorage.removeItem(RECENT(uid)).catch(() => {}); };
  const remember = (s: string) => {
    const v = s.trim();
    if (v.length < 2) return;
    const next = [v, ...recent.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 8);
    setRecent(next);
    AsyncStorage.setItem(RECENT(uid), JSON.stringify(next)).catch(() => {});
  };

  // Einmal je Datenstand vorbereiten, dann pro Tastendruck nur noch vergleichen
  const index = useMemo(() => !data ? null : {
    places: PLACES.map((p) => ({ p, s: norm(`${p.name} ${p.latin.join(" ")} ${p.weak?.alias.join(" ") || ""} ${p.country}`) })),
    claims: data.owner ? data.claims.map((c) => ({ c, s: norm(`${c.statement} ${c.raw?.statement || ""} ${c.claimant} ${c.disputed_by || ""}`) })) : [],
    items: dedupe(poolOf(data)).sort((a, b) => (itemTime(a) < itemTime(b) ? 1 : -1)).map((i) => ({ i, s: norm(`${i.title} ${i.origin_domain || ""} ${i.source_name}`) })),
    sources: data.sources.map((x) => ({ x, s: norm(`${x.name} ${TYPES[x.source_type] || ""}`) })),
  }, [data]);
  const dq = useDeferredValue(q);
  const res = useMemo(() => {
    const words = norm(dq.trim()).split(/\s+/).filter(Boolean);
    if (!index || !words.length) return null;
    const has = (n: string) => words.every((w) => n.includes(w));
    return {
      places: index.places.filter((x) => has(x.s) || (dq.trim().length > 1 && mentions(x.p, dq))).map((x) => x.p),
      claims: index.claims.filter((x) => has(x.s)).map((x) => x.c),
      items: index.items.filter((x) => has(x.s)).map((x) => x.i),
      sources: index.sources.filter((x) => has(x.s)).map((x) => x.x),
    };
  }, [index, dq]);
  const total = res ? res.places.length + res.claims.length + res.items.length + res.sources.length : 0;
  const suggestions = recent.length ? recent : data?.owner ? ["Assab", "Adigrat", "Badme", "UN", "Rotes Meer"] : ["Assab", "Bab el-Mandeb", "Houthi", "UKMTO"];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: "Suchen" }} />
      <View style={{ paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.s, maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.card, borderRadius: radius.m, paddingHorizontal: 12, height: 48,
          borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule }}>
          <Ionicons name="search" size={18} color={t.faint} />
          <TextInput value={q} onChangeText={setQ} autoFocus placeholder="Orte, Meldungen, Quellen …" placeholderTextColor={t.faint}
            style={{ ...noOutline, flex: 1, fontFamily: font.regular, fontSize: 17, color: t.ink, height: 46 }} returnKeyType="search" autoCorrect={false}
            onSubmitEditing={() => remember(q)} accessibilityLabel="Suchbegriff" />
          {q ? <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Suche löschen"><Ionicons name="close-circle" size={20} color={t.faint} /></Pressable> : null}
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: space.l, paddingBottom: space.xxl * 2, maxWidth: 760, width: "100%", alignSelf: "center" }}>
        {!data ? <View style={{ marginTop: space.l }}><Skeleton rows={4} /></View> : !res ? (
          <View style={{ marginTop: space.l }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 32 }}>
              <T v="label" color={t.muted}>{recent.length ? "Zuletzt gesucht" : "Zum Beispiel"}</T>
              {recent.length ? <Pressable onPress={forget} accessibilityRole="button" hitSlop={8} style={{ minHeight: 32, justifyContent: "center" }}>
                <T v="smallStrong" color={t.accent}>Verlauf löschen</T></Pressable> : null}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.s }}>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => { tap(); setQ(s); }} accessibilityRole="button" accessibilityLabel={`Nach ${s} suchen`}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: 999, backgroundColor: t.card,
                    borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                  <Ionicons name={recent.length ? "time-outline" : "search"} size={14} color={t.muted} />
                  <T v="smallStrong">{s}</T>
                </Pressable>
              ))}
            </View>

          </View>
        ) : total === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: space.xxl, gap: 8 }}>
            <Ionicons name="search-outline" size={28} color={t.faint} />
            <T v="small" style={{ textAlign: "center" }}>Nichts gefunden zu „{q.trim()}“. Andere Schreibweise versuchen, z. B. Aseb statt Assab, oder auf Englisch. Gesucht wird in den Schlagzeilen der letzten 72 Stunden.</T>
          </View>
        ) : (
          <>
            {res.places.length ? (
              <Section title="Orte" count={res.places.length}>
                {res.places.map((p, i) => (
                  <Pressable key={p.id} onPress={() => { tap(); remember(q); router.push(`/place/${p.id}`); }} accessibilityRole="button"
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                    <Ionicons name="location-outline" size={18} color={t.accent} />
                    <View style={{ flex: 1 }}><T v="bodyStrong">{p.name}</T>{p.country !== p.name ? <T v="caption">{p.country}</T> : null}</View>
                    <Ionicons name="chevron-forward" size={17} color={t.faint} />
                  </Pressable>
                ))}
              </Section>
            ) : null}
            {res.claims.length ? (
              <Section title="Behauptungen" count={res.claims.length}>
                {res.claims.slice(0, 20).map((c, i) => (
                  <Pressable key={c.id} onPress={() => { tap(); remember(q); router.push(`/claim/${c.id}`); }} accessibilityRole="button" accessibilityLabel={c.statement}
                    style={({ pressed }) => ({ paddingVertical: 12, gap: 4, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                    <StatusPill status={c.status} small />
                    <T v="bodyStrong">{c.statement}</T>
                  </Pressable>
                ))}
                {res.claims.length > 20 ? <T v="caption" style={{ paddingVertical: 10 }}>Die ersten 20 von {res.claims.length}.</T> : null}
              </Section>
            ) : null}
            {res.items.length ? (
              <Section title="Meldungen, 72 Std." count={res.items.length}>
                {res.items.slice(0, 30).map((it, i) => (
                  <View key={it.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
                    <ItemRow it={it} isNew={new Date(it.fetched_at).getTime() > seenBefore} onOpen={() => remember(q)} />
                  </View>
                ))}
                {res.items.length > 30 ? <T v="caption" style={{ paddingVertical: 10 }}>Die ersten 30 von {res.items.length}. Genauer suchen, um weniger zu sehen.</T> : null}
              </Section>
            ) : null}
            {res.sources.length ? (
              <Section title="Quellen" count={res.sources.length}>
                {res.sources.map((s, i) => (
                  <Pressable key={s.id} onPress={() => { tap(); router.push("/sources"); }} accessibilityRole="button"
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.type[s.source_type] || t.muted }} />
                    <View style={{ flex: 1 }}><T v="bodyStrong">{s.name}</T><T v="caption">{TYPES[s.source_type] || s.source_type}</T></View>
                    <Ionicons name="chevron-forward" size={17} color={t.faint} />
                  </Pressable>
                ))}
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
