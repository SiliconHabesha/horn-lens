// Korrekturen: jede Änderung an einer Behauptung (neue Stufe, berichtigter Wortlaut), neueste zuerst.
// Öffentlich, damit jeder sieht, was Horn Lens geändert hat und warum.
import { router, Stack } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Skeleton } from "../components/Skeleton";
import { Empty, Screen, StatusPill, T, tap } from "../components/ui";
import { fmtFull, STATUS } from "../lib/de";
import { useData } from "../lib/data";
import { space, useTheme } from "../lib/theme";

type Row = { at: string; claim: number; statement: string; kind: "status" | "wording"; from?: string; to?: string; note: string };

export default function Corrections() {
  const t = useTheme();
  const { data } = useData();
  const rows = useMemo(() => {
    if (!data) return [] as Row[];
    const out: Row[] = [];
    for (const c of data.claims) {
      // Verlauf ist neueste zuerst; der älteste Eintrag ist die Aufnahme, keine Änderung
      c.events.forEach((e, i) => {
        const prev = c.events[i + 1];
        if (!prev) return;
        if (/^Berichtigt/.test(e.note)) out.push({ at: e.at, claim: c.id, statement: c.statement, kind: "wording", note: e.note });
        else if (prev.status !== e.status) out.push({ at: e.at, claim: c.id, statement: c.statement, kind: "status", from: prev.status, to: e.status, note: e.note });
      });
    }
    return out.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [data]);

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: "Korrekturen" }} />
      <T v="body">Jede neue Stufe und jeder berichtigte Wortlaut, neueste zuerst. Die Begründung steht dabei; die Belege stehen im Verlauf der Behauptung.</T>
      <View style={{ marginTop: space.l }}>
        {!data ? <Skeleton rows={4} /> : !rows.length ? <Empty icon="git-compare-outline" text="Noch keine Änderung an einer Behauptung." /> : rows.map((r, i) => (
          <Pressable key={`${r.claim}-${r.at}-${i}`} onPress={() => { tap(); router.push(`/claim/${r.claim}`); }} accessibilityRole="button"
            accessibilityLabel={`${fmtFull(r.at)}: ${r.kind === "status" ? `Stufe von ${STATUS[r.from!]?.[0]} zu ${STATUS[r.to!]?.[0]}` : "Wortlaut berichtigt"}. ${r.statement}`}
            style={({ pressed }) => ({ paddingVertical: 14, gap: 6, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <T v="caption">{fmtFull(r.at)}</T>
              {r.kind === "status" ? (
                <>
                  <StatusPill status={r.from!} small />
                  <T v="caption">→</T>
                  <StatusPill status={r.to!} small />
                </>
              ) : <T v="smallStrong">Wortlaut berichtigt</T>}
            </View>
            <T v="bodyStrong" numberOfLines={3}>{r.statement}</T>
            {r.note ? <T v="small" numberOfLines={4}>{r.note}</T> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
