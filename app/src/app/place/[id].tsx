// Ein Ort im Überblick: Lage auf der Karte, Schlagzeilen, die ihn nennen, Messwerte im Umkreis, Satellitenbilder, Behauptungen.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ItemRow } from "../../components/items";
import { fit, MapSvg, proj } from "../../components/MapCanvas";
import { Card, Empty, openLink, Screen, StatusPill, T, tap } from "../../components/ui";
import { fmtCapDay, fmtFull, fmtWhen, num, plural } from "../../lib/de";
import { useData } from "../../lib/data";
import { dossier, km, PLACES, placeById, RADIUS } from "../../lib/places";
import { dedupe, poolOf } from "../../lib/stories";
import { space, useTheme } from "../../lib/theme";

function Fact({ icon, color, big, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; big: string; label: string }) {
  return (
    <Card style={{ flexBasis: "47%", flexGrow: 1, padding: space.m }} accessibilityLabel={`${big} ${label}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={16} color={color} />
        <T v="h2">{big}</T>
      </View>
      <T v="caption" style={{ marginTop: 4 }}>{label}</T>
    </Card>
  );
}

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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.m }}>
        {data.owner ? <Fact icon="newspaper-outline" color={t.ink} big={num(d.items.length)} label={`${d.items.length === 1 ? "Schlagzeile nennt" : "Schlagzeilen nennen"} den Ort, 72 Std.`} /> : null}
        <Fact icon="flame" color={t.fire} big={capped && !d.fires.length ? "–" : `${capped ? "≥ " : ""}${num(d.fires.length)}`} label={`Hitzepunkte im Umkreis von ${RADIUS.fire} km, 24 Std.${capped ? (d.fires.length ? " (nur ein Teil aller Hitzepunkte geladen)" : " Keiner unter den geladenen; geladen ist nur ein Teil.") : ""}`} />
        <Fact icon="radio-button-off" color={t.quake} big={num(d.quakes.length)} label={`Erdbeben im Umkreis von ${RADIUS.quake} km, 7 Tage`} />
        <Fact icon="boat" color={t.ship} big={num(d.ships.length)} label={`Vorfälle auf See im Umkreis von ${RADIUS.ship} km, 30 Tage`} />
      </View>
      <T v="caption" style={{ marginTop: space.s }}>Wird ein Ort in einer Schlagzeile genannt, heißt das nicht, dass dort etwas geschah. Messwerte zeigen, dass etwas gemessen wurde, nicht warum.</T>

      {d.sat.length ? (
        <>
          <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Satellitenbilder</T>
          {d.sat.map(({ x: s, d: dist }) => (
            <Card key={s.id} onPress={() => router.navigate(`/satellite?place=${s.id}`)} style={{ marginBottom: space.s }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ionicons name="images-outline" size={20} color={t.accent} />
                <View style={{ flex: 1 }}>
                  <T v="h3">{s.name}</T>
                  <T v="small">{plural(s.images.length, "klares Bild", "klare Bilder")}, das neueste vom {fmtCapDay(s.images[0].t)}{dist > 3 ? ` · ${num(Math.round(dist))} km entfernt` : ""}</T>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.faint} />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {!data.owner ? null : <>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Schlagzeilen, die {p.name} nennen</T>
      {d.items.length ? (
        <Card style={{ paddingVertical: space.s }}>
          {d.items.map((it, i) => (
            <View key={it.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
              <ItemRow it={it} isNew={new Date(it.fetched_at).getTime() > seenBefore} />
            </View>
          ))}
        </Card>
      ) : <Card><T v="small">In den letzten 72 Stunden nennt keine Schlagzeile aus unseren Quellen {p.name}.</T></Card>}
      </>}

      {d.claims.length ? (
        <>
          <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Behauptungen</T>
          <View style={{ gap: space.s }}>
            {d.claims.map((c) => (
              <Card key={c.id} onPress={() => router.push(`/claim/${c.id}`)} accessibilityLabel={c.statement}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <StatusPill status={c.status} small />
                  <T v="caption">{c.events[0] ? fmtWhen(c.events[0].at) : ""}</T>
                </View>
                <T v="bodyStrong" style={{ marginTop: 6 }}>{c.statement}</T>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {d.ships.length ? (
        <>
          <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Vorfälle auf See in der Nähe</T>
          {d.ships.map(({ x: m, d: dist }, i) => (
            <Pressable key={i} onPress={() => openLink(m.url || "https://www.ukmto.org/recent-incidents")} accessibilityRole="link"
              style={({ pressed }) => ({ paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
              <T v="caption">{fmtFull(m.t)} · UKMTO · etwa {num(Math.round(dist))} km entfernt</T>
              <T v="bodyStrong">{m.title}</T>
            </Pressable>
          ))}
        </>
      ) : null}

      {nearby.length ? (
        <>
          <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Orte in der Nähe</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {nearby.map(({ q, d: dist }) => (
              <Pressable key={q.id} onPress={() => { tap(); router.push(`/place/${q.id}`); }} accessibilityRole="button" accessibilityLabel={`${q.name}, ${Math.round(dist)} Kilometer`}
                style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                <T v="smallStrong">{q.name} <T v="caption">{num(Math.round(dist))} km</T></T>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
