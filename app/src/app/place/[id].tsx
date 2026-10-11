// Ein Ort im Überblick: Lage auf der Karte, Schlagzeilen, die ihn nennen, Messwerte im Umkreis, Satellitenbilder, Behauptungen.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ItemRow } from "../../components/items";
import { fit, MapSvg, proj } from "../../components/MapCanvas";
import { Card, Empty, Group, Head, ListRow, openLink, PlainRow, Screen, StatusPill, T, tap } from "../../components/ui";
import { fmtCapDay, fmtFull, fmtWhen, num, plural } from "../../lib/de";
import { useData } from "../../lib/data";
import { dossier, km, PLACES, placeById, RADIUS, seaMeta } from "../../lib/places";
import { dedupe, poolOf } from "../../lib/stories";
import { space, useTheme } from "../../lib/theme";

export default function PlaceScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, seenBefore } = useData();
  const p = placeById(String(id));
  const d = useMemo(() => (p && data ? dossier(p, data, dedupe(poolOf(data))) : null), [p, data]);
  const [w, setW] = useState(0);
  if (!p) return <Screen topInset={false} refresh={false}><Stack.Screen options={{ title: "Ort" }} /><Empty text="Diesen Ort kennt Horn Lens nicht." /></Screen>;
  if (!data || !d) return <Screen topInset={false} refresh={false}><Stack.Screen options={{ title: p.name }} /><Empty text="Wird geladen …" /></Screen>;

  // Ausschnitt: etwa 150 km um den Ort
  const [cx, cy] = proj(p.lat, p.lon), [ex] = proj(p.lat, p.lon + 1.4);
  const half = ex - cx;
  const h = Math.round(Math.min(w * 0.6, 240));
  const box = w ? fit([cx - half, cy - half * (h / w), half * 2, half * 2 * (h / w)], h / w) : null;
  const nearby = PLACES.filter((q) => q.id !== p.id).map((q) => ({ q, d: km(p.lat, p.lon, q.lat, q.lon) })).filter((x) => x.d < 120).sort((a, b) => a.d - b.d).slice(0, 6);
  const capped = data.firesCapped || data.firesTotal > data.fires.length;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: p.name }} />
      <T v="label" color={t.muted}>{p.country}</T>
      <T v="title" accessibilityRole="header">{p.name}</T>

      <Card onPress={() => router.navigate("/map")} style={{ marginTop: space.m, padding: 0, overflow: "hidden" }} accessibilityLabel={`Karte um ${p.name}. Öffnet die große Karte.`}>
        <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} pointerEvents="none">
          {w && box ? <MapSvg data={data} layers={{ fire: true, quake: true, ship: true, sat: true }} box={box} w={w} h={h}
            sel={{ x: cx, y: cy, kind: "", at: 0, when: "", text: "" }} /> : <View style={{ height: 200 }} />}
        </View>
      </Card>

      {/* Messwerte in der Umgebung: gleiche Zeilen wie in der Lage */}
      <Head title="In der Umgebung" />
      <Group>
        <ListRow first icon="flame-outline" label="Hitzepunkte" hint={`${RADIUS.fire} km · 24 Std.`} value={capped && !d.fires.length ? "–" : `${capped ? "≥ " : ""}${num(d.fires.length)}`} onPress={() => router.push("/signal/fires")} />
        <ListRow icon="pulse-outline" label="Erdbeben" hint={`${RADIUS.quake} km · 7 Tage`} value={num(d.quakes.length)} onPress={() => router.push("/signal/quakes")} />
        <ListRow icon="boat-outline" label="Vorfälle auf See" hint={`${RADIUS.ship} km · 30 Tage`} value={num(d.ships.length)} onPress={() => router.push("/signal/sea")} />
        {d.sat.map(({ x: sp }) => <ListRow key={sp.id} icon="planet-outline" label={sp.name} sub={`Satellitenbilder · neuestes ${fmtCapDay(sp.images[0].t)}`} onPress={() => router.navigate(`/satellite?place=${sp.id}`)} />)}
      </Group>

      {data.owner ? (
        <>
          <Head title="Meldungen" />
          {d.items.length ? d.items.map((it, i) => (
            <View key={it.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
              <ItemRow it={it} isNew={new Date(it.fetched_at).getTime() > seenBefore} />
            </View>
          )) : <T v="small">Keine in den letzten 72 Stunden.</T>}
        </>
      ) : null}

      {d.claims.length ? (
        <>
          <Head title="Behauptungen" />
          {d.claims.map((c, i) => (
            <Pressable key={c.id} onPress={() => { tap(); router.push(`/claim/${c.id}`); }} accessibilityRole="button" accessibilityLabel={c.statement}
              style={({ pressed }) => ({ paddingVertical: 12, gap: 4, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
              <StatusPill status={c.status} small />
              <T v="body" color={t.ink}>{c.statement}</T>
            </Pressable>
          ))}
        </>
      ) : null}

      {d.ships.length ? (
        <>
          <Head title="Vorfälle auf See" />
          {d.ships.map(({ x: m }, i) => <PlainRow key={i} first={i === 0} title={m.title} meta={seaMeta(m)} external onPress={() => openLink(m.url || "https://www.ukmto.org/recent-incidents")} />)}
        </>
      ) : null}

      {nearby.length ? (
        <>
          <Head title="Orte in der Nähe" />
          <Group>
            {nearby.map(({ q, d: dist }, i) => <ListRow key={q.id} first={i === 0} label={q.name} value={`${num(Math.round(dist))} km`} onPress={() => router.push(`/place/${q.id}`)} />)}
          </Group>
        </>
      ) : null}
    </Screen>
  );
}
