// Alle Orte: wie oft sie in Schlagzeilen vorkommen und was in der Nähe gemessen wurde.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Card, Screen, T, tap } from "../components/ui";
import { plural } from "../lib/de";
import { useData } from "../lib/data";
import { dossier, PLACES } from "../lib/places";
import { dedupe, poolOf } from "../lib/stories";
import { space, useTheme } from "../lib/theme";

const GROUPS: [string, (c: string) => boolean][] = [
  ["Eritrea", (c) => c === "Eritrea"],
  ["Grenzgebiet", (c) => c.startsWith("Grenzgebiet")],
  ["Tigray und Afar", (c) => c.startsWith("Äthiopien")],
  ["Rotes Meer und Nachbarn", (c) => !c.startsWith("Äthiopien") && c !== "Eritrea" && !c.startsWith("Grenzgebiet")],
];

export default function Places() {
  const t = useTheme();
  const { data } = useData();
  const rows = useMemo(() => (data ? (() => { const pool = dedupe(poolOf(data)); return PLACES.map((p) => ({ p, d: dossier(p, data, pool) })); })() : []), [data]);
  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: "Orte" }} />
      <T v="small">{data?.owner ? "Wie oft ein Ort in Schlagzeilen der letzten 72 Stunden vorkommt und was in seiner Nähe gemessen wurde." : "Was in der Nähe eines Ortes gemessen wurde. Schlagzeilen zählt die offene Ausgabe nur zum Roten Meer."} Antippen für Einzelheiten.</T>
      {GROUPS.map(([g, ok]) => {
        const list = rows.filter((r) => ok(r.p.country)).sort((a, b) => b.d.items.length - a.d.items.length || a.p.name.localeCompare(b.p.name, "de"));
        return (
          <View key={g}>
            <T v="label" color={t.muted} style={{ marginTop: space.xl, marginBottom: space.s }}>{g}</T>
            <Card style={{ paddingVertical: 4 }}>
              {list.map(({ p, d }, i) => {
                const sig = [d.fires.length ? plural(d.fires.length, "Hitzepunkt", "Hitzepunkte") : null, d.quakes.length ? plural(d.quakes.length, "Erdbeben", "Erdbeben") : null,
                  d.ships.length ? plural(d.ships.length, "Vorfall auf See", "Vorfälle auf See") : null, d.sat.length ? "Satellitenbilder" : null].filter(Boolean).join(" · ");
                return (
                  <Pressable key={p.id} onPress={() => { tap(); router.push(`/place/${p.id}`); }} accessibilityRole="button"
                    accessibilityLabel={`${p.name}: ${d.items.length} Schlagzeilen. ${sig}`}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 8,
                      borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                    <View style={{ flex: 1 }}>
                      <T v="bodyStrong">{p.name}</T>
                      <T v="caption" numberOfLines={1}>{sig || p.country}</T>
                    </View>
                    {d.items.length && data?.owner ? (
                      <View style={{ minWidth: 28, paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: t.cardAlt, alignItems: "center", justifyContent: "center" }}>
                        <T v="caption" color={t.ink}>{d.items.length}</T>
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={17} color={t.faint} />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}
