// Alle Orte: wie oft sie in Schlagzeilen vorkommen und was in der Nähe gemessen wurde.
import { router, Stack } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";
import { Group, Head, ListRow, Screen } from "../components/ui";
import { plural } from "../lib/de";
import { useData } from "../lib/data";
import { dossier, PLACES } from "../lib/places";
import { dedupe, poolOf } from "../lib/stories";

const GROUPS: [string, (c: string) => boolean][] = [
  ["Eritrea", (c) => c === "Eritrea"],
  ["Grenzgebiet", (c) => c.startsWith("Grenzgebiet")],
  ["Nordäthiopien und umstrittene Gebiete", (c) => c.startsWith("Äthiopien")],
  ["Rotes Meer und Nachbarn", (c) => !c.startsWith("Äthiopien") && c !== "Eritrea" && !c.startsWith("Grenzgebiet")],
];

export default function Places() {
  const { data } = useData();
  const rows = useMemo(() => (data ? (() => { const pool = dedupe(poolOf(data)); return PLACES.map((p) => ({ p, d: dossier(p, data, pool) })); })() : []), [data]);
  // Hitzepunkte sind oft nur eine Auswahl: dann „mind.“
  const sample = !!data && (data.firesCapped || data.firesTotal > data.fires.length);
  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: "Orte" }} />
      {GROUPS.map(([g, ok]) => {
        const list = rows.filter((r) => ok(r.p.country)).sort((a, b) => b.d.items.length - a.d.items.length || a.p.name.localeCompare(b.p.name, "de"));
        return (
          <View key={g}>
            <Head title={g} first={g === GROUPS[0][0]} />
            <Group>
              {list.map(({ p, d }, i) => {
                const sig = [data?.owner && d.items.length ? plural(d.items.length, "Meldung", "Meldungen") : null, d.fires.length ? `${sample ? "mind. " : ""}${plural(d.fires.length, "Hitzepunkt", "Hitzepunkte")}` : null, d.quakes.length ? plural(d.quakes.length, "Erdbeben", "Erdbeben") : null,
                  d.ships.length ? plural(d.ships.length, "Vorfall auf See", "Vorfälle auf See") : null, d.sat.length ? "Satellitenbilder" : null].filter(Boolean).join(" · ");
                return <ListRow key={p.id} first={i === 0} label={p.name} sub={sig || undefined}
                  onPress={() => router.push(`/place/${p.id}`)} />;
              })}
            </Group>
          </View>
        );
      })}
    </Screen>
  );
}
