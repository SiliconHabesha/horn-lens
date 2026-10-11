// Ein Messwert im Detail: Internet, Hitzepunkte, Erdbeben oder Vorfälle auf See. Jede Zeile mit Zeit, Ort und Quelle.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Banner, Button, Card, Empty, openLink, Screen, T, tap } from "../../components/ui";
import { fmtFull, num, plural } from "../../lib/de";
import { useData } from "../../lib/data";
import { feedState, lastFailed, noData } from "../../lib/feeds";
import { nearest } from "../../lib/places";
import { space, useTheme } from "../../lib/theme";

type Kind = "internet" | "fires" | "quakes" | "sea";
const META: Record<Kind, { title: string; icon: keyof typeof Ionicons.glyphMap; feed: string; who: string; about: string; url: string }> = {
  internet: { title: "Internet", icon: "wifi-outline", feed: "ioda", who: "IODA (Georgia Tech)",
    about: "IODA misst von außen, wie viele Geräte und Netze eines Landes erreichbar sind. Ein Rückgang zeigt, dass weniger erreichbar ist, nicht warum: Stromausfall, Störung oder Abschaltung sehen gleich aus.",
    url: "https://ioda.inetintel.cc.gatech.edu/" },
  fires: { title: "Hitzepunkte", icon: "flame-outline", feed: "firms", who: "NASA FIRMS",
    about: "Satelliten erkennen ungewöhnlich heiße Stellen. Das können Kämpfe sein, aber ebenso Feldbrände, Gasfackeln oder Vulkane. Ein Feuer wird oft von mehreren Satelliten erfasst.",
    url: "https://firms.modaps.eosdis.nasa.gov/map/" },
  quakes: { title: "Erdbeben", icon: "pulse-outline", feed: "usgs", who: "USGS",
    about: "Erdbeben ab Stärke 2,5 in den letzten 7 Tagen. Das Afar-Dreieck ist geologisch sehr aktiv; Beben dort sind häufig.",
    url: "https://earthquake.usgs.gov/earthquakes/map/" },
  sea: { title: "Vorfälle auf See", icon: "boat-outline", feed: "ukmto", who: "UKMTO",
    about: "UKMTO ist die Schifffahrtsstelle der britischen Marine. Sie bestätigt Vorfälle, nennt aber keine Verantwortlichen. Ortsangaben sind ungefähr.",
    url: "https://www.ukmto.org/recent-incidents" },
};
const COUNTRY: Record<string, string> = { ER: "Eritrea", ET: "Äthiopien", DJ: "Dschibuti", SD: "Sudan", YE: "Jemen", SO: "Somalia" };
const where = (lat: number, lon: number) => { const n = nearest(lat, lon); return n.d < 8 ? `bei ${n.p.name}` : `etwa ${num(Math.round(n.d))} km von ${n.p.name}`; };

function Row({ title, sub, onPress, icon, color }: { title: string; sub: string; onPress?: () => void; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress ? () => { tap(); onPress(); } : undefined} accessibilityRole={onPress ? "link" : "text"} accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => ({ flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 12, opacity: pressed && onPress ? 0.6 : 1 })}>
      <Ionicons name={icon} size={18} color={color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <T v="bodyStrong">{title}</T>
        <T v="caption" style={{ marginTop: 2 }}>{sub}</T>
      </View>
      {onPress ? <Ionicons name="open-outline" size={16} color={t.faint} style={{ marginTop: 3 }} /> : null}
    </Pressable>
  );
}

export default function Signal() {
  const t = useTheme();
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const known = ["internet", "fires", "quakes", "sea"].includes(String(raw));
  const kind = (known ? raw : "fires") as Kind;
  const m = META[kind];
  const { data } = useData();

  // Hitzepunkte nach nächstem Ort zusammenfassen: wo häufen sie sich?
  const fireAreas = useMemo(() => {
    if (!data || kind !== "fires") return [];
    const by = new Map<string, { name: string; id: string; n: number; maxFrp: number }>();
    for (const f of data.fires) {
      const n = nearest(f.lat, f.lon);
      const key = n.d <= 60 ? n.p.id : "_far";
      const cur = by.get(key) || { name: n.d <= 60 ? n.p.name : "Weiter als 60 km von bekannten Orten", id: key, n: 0, maxFrp: 0 };
      cur.n++; cur.maxFrp = Math.max(cur.maxFrp, f.frp || 0);
      by.set(key, cur);
    }
    return [...by.values()].sort((a, b) => b.n - a.n);
  }, [data, kind]);

  if (!known) return <Screen topInset={false} refresh={false}><Stack.Screen options={{ title: "Messwerte" }} /><Empty text="Diesen Messwert gibt es nicht." /></Screen>;
  if (!data) return <Screen topInset={false} refresh={false}><Stack.Screen options={{ title: m.title }} /><Empty text="Wird geladen …" /></Screen>;
  if (kind === "internet" && !data.owner) return <Screen topInset={false} refresh={false}><Stack.Screen options={{ title: m.title }} /><Empty text="Internet-Messwerte gibt es in der vollen Ausgabe." /></Screen>;
  const st = feedState(data, m.feed);
  const down = !st.ok || (kind === "fires" && !!data.firesError);
  // Ohne aktuelle Daten nie „alles ruhig“ anzeigen
  const none = (okText: string) => down
    ? <Row icon="cloud-offline-outline" color={t.muted} title={`Keine aktuellen Daten von ${m.who}`} sub={st.last ? `Letzte Antwort ${fmtFull(st.last)}` : "Noch keine Antwort"} />
    : <Row icon="checkmark-circle-outline" color={t.status.confirmed} title={okText} sub={`Gemessen von ${m.who}`} />;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: m.title }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={m.icon} size={16} color={t.muted} />
        <T v="caption">{st.last ? `Stand ${fmtFull(st.last)} · Quelle ${m.who}` : `Quelle ${m.who}`}</T>
      </View>
      <T v="small" style={{ marginTop: space.s }}>{m.about}</T>
      {!st.ok ? <View style={{ marginTop: space.m }}><Banner icon="cloud-offline-outline" tone="warn" text={noData(st, m.who)} /></View>
        : st.failing ? <View style={{ marginTop: space.m }}><Banner icon="alert-circle-outline" tone="warn" text={lastFailed(st).trim()} /></View> : null}

      {kind === "internet" ? (
        ["ER", "ET"].map((c) => {
          const list = data.outages.filter((o) => o.country === c);
          return (
            <View key={c}>
              <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>{COUNTRY[c]}</T>
              <Card style={{ paddingVertical: 4 }}>
                {list.length ? list.map((o, i) => (
                  <View key={i} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
                    <Row icon="warning-outline" color={t.warn} title={o.title} sub={`${fmtFull(o.t)} · ${m.who}`} onPress={o.url ? () => openLink(o.url) : undefined} />
                  </View>
                )) : none("Keine Auffälligkeit in 48 Stunden")}
              </Card>
            </View>
          );
        })
      ) : null}

      {kind === "fires" ? (
        <>
          <T v="h2" style={{ marginTop: space.xl }}>{data.firesCapped ? "≥ " : ""}{plural(data.firesTotal, "Hitzepunkt", "Hitzepunkte")} in 24 Stunden</T>
          {data.firesTotal > data.fires.length || data.firesCapped ? <T v="small" style={{ marginTop: 2 }}>Die Liste zeigt {num(data.fires.length)} davon, nach nächstem Ort sortiert.</T> : null}
          <Card style={{ paddingVertical: 4, marginTop: space.m }}>
            {fireAreas.map((a, i) => (
              <Pressable key={a.id} onPress={a.id !== "_far" ? () => { tap(); router.push(`/place/${a.id}`); } : undefined} accessibilityRole={a.id !== "_far" ? "button" : "text"}
                accessibilityLabel={`${a.name}: ${a.n} Hitzepunkte`}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                <View style={{ width: 44 }}><T v="h3" color={t.fire}>{num(a.n)}</T></View>
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong">{a.id === "_far" ? a.name : `Im Umkreis von ${a.name}`}</T>
                </View>
                {a.id !== "_far" ? <Ionicons name="chevron-forward" size={17} color={t.faint} /> : null}
              </Pressable>
            ))}
            {!fireAreas.length ? none("Keine Hitzepunkte in 24 Stunden") : null}
          </Card>
          <T v="caption" style={{ marginTop: space.s }}>Zugeordnet zum nächsten bekannten Ort im Umkreis von 60 km.</T>
        </>
      ) : null}

      {kind === "quakes" ? (
        <Card style={{ paddingVertical: 4, marginTop: space.xl }}>
          {data.quakes.length ? [...data.quakes].sort((a, b) => (a.t < b.t ? 1 : -1)).map((q, i) => (
            <View key={i} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
              <Row icon="pulse-outline" color={t.quake} title={q.mag != null ? `Stärke ${String(q.mag).replace(".", ",")}, ${where(q.lat, q.lon)}` : q.title}
                sub={`${fmtFull(q.t)} · ${m.who}`} onPress={q.url ? () => openLink(q.url) : undefined} />
            </View>
          )) : none("Keine Erdbeben ab Stärke 2,5 in 7 Tagen")}
        </Card>
      ) : null}

      {kind === "sea" ? (
        <Card style={{ paddingVertical: 4, marginTop: space.xl }}>
          {data.maritime.length ? data.maritime.map((x, i) => (
            <View key={i} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
              <Row icon="boat-outline" color={t.ship} title={x.title} sub={`${fmtFull(x.t)} · ${where(x.lat, x.lon)} · ${m.who}`} onPress={() => openLink(x.url || m.url)} />
            </View>
          )) : none("Keine Vorfälle in 30 Tagen")}
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: space.s, marginTop: space.xl, flexWrap: "wrap" }}>
        {kind !== "internet" ? <View style={{ flexGrow: 1 }}><Button label="Auf der Karte" icon="map-outline" onPress={() => router.navigate("/map")} /></View> : null}
        <View style={{ flexGrow: 1 }}><Button label={`Bei ${m.who.split(" ")[0]} ansehen`} icon="open-outline" kind="secondary" onPress={() => openLink(m.url)} /></View>
      </View>
    </Screen>
  );
}
