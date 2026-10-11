// Ein Messwert im Detail: Internet, Hitzepunkte, Erdbeben oder Vorfälle auf See. Kurz erklärt, dann die Einträge.
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";
import { Button, Empty, Group, Head, ListRow, openLink, PlainRow, Screen, T } from "../../components/ui";
import { fmtFull, num } from "../../lib/de";
import { useData } from "../../lib/data";
import { feedState } from "../../lib/feeds";
import { nearest, seaMeta } from "../../lib/places";
import { space } from "../../lib/theme";

type Kind = "internet" | "fires" | "quakes" | "sea";
const META: Record<Kind, { title: string; feed: string; who: string; about: string; url: string }> = {
  internet: { title: "Internet", feed: "ioda", who: "IODA", about: "Zeigt, wenn weniger Netze erreichbar sind, nicht warum.", url: "https://ioda.inetintel.cc.gatech.edu/" },
  fires: { title: "Hitzepunkte", feed: "firms", who: "NASA FIRMS", about: "Heiße Stellen aus dem All: Kämpfe, aber auch Feldbrände oder Gasfackeln.", url: "https://firms.modaps.eosdis.nasa.gov/map/" },
  quakes: { title: "Erdbeben", feed: "usgs", who: "USGS", about: "Ab Stärke 2,5 in 7 Tagen. Das Afar-Dreieck bebt häufig.", url: "https://earthquake.usgs.gov/earthquakes/map/" },
  sea: { title: "Vorfälle auf See", feed: "ukmto", who: "UKMTO", about: "Britische Schifffahrtsstelle; nennt keine Verantwortlichen, Orte sind ungefähr.", url: "https://www.ukmto.org/recent-incidents" },
};
const COUNTRY: Record<string, string> = { ER: "Eritrea", ET: "Äthiopien" };
// Fachbegriffe aus der Messung kürzen: „(PING-SLASH24 12 % unter dem Üblichen)“ → „(−12 %)“
const plain = (s: string) => s.replace(/\s*\((?:PING-SLASH24|BGP|ACTIVE PROBING|MERIT-NT)[^)]*?(\d+)\s*%[^)]*\)/i, " (−$1 %)");
const where = (lat: number, lon: number) => { const n = nearest(lat, lon); return n.d < 8 ? `bei ${n.p.name}` : `etwa ${num(Math.round(n.d))} km von ${n.p.name}`; };

export default function Signal() {
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const known = ["internet", "fires", "quakes", "sea"].includes(String(raw));
  const kind = (known ? raw : "fires") as Kind;
  const m = META[kind];
  const { data } = useData();

  // Hitzepunkte nach nächstem Ort: wo häufen sie sich?
  const areas = useMemo(() => {
    if (!data || kind !== "fires") return [];
    const by = new Map<string, { name: string; id: string; n: number }>();
    for (const f of data.fires) {
      const n = nearest(f.lat, f.lon);
      const key = n.d <= 60 ? n.p.id : "_far";
      const cur = by.get(key) || { name: n.d <= 60 ? n.p.name : "Abseits bekannter Orte", id: key, n: 0 };
      cur.n++;
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
  const none = (okText: string) => <T v="small">{down ? `Keine aktuellen Daten von ${m.who}.` : okText}</T>;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: m.title }} />
      <T v="caption">{st.last ? `Stand ${fmtFull(st.last)} · ${m.who}` : m.who}{down ? " · derzeit keine aktuellen Daten" : ""}</T>
      <T v="body" style={{ marginTop: space.s }}>{m.about}</T>

      {kind === "internet" ? ["ER", "ET"].map((c) => {
        const list = data.outages.filter((o) => o.country === c);
        return (
          <View key={c}>
            <Head title={COUNTRY[c]} />
            {list.length ? (
              <Group>{list.map((o, i) => <ListRow key={i} first={i === 0} icon="warning-outline" tone="alert" label={plain(o.title)} sub={fmtFull(o.t)} external={!!o.url} onPress={o.url ? () => openLink(o.url) : undefined} />)}</Group>
            ) : none("Keine Auffälligkeit in 48 Stunden.")}
          </View>
        );
      }) : null}

      {kind === "fires" ? (
        <>
          <Head title={`${data.firesCapped ? "≥ " : ""}${num(data.firesTotal)} in 24 Stunden`} />
          {areas.length ? (
            <Group>{areas.map((a, i) => <ListRow key={a.id} first={i === 0} label={a.id === "_far" ? a.name : `Bei ${a.name}`} value={num(a.n)}
              onPress={a.id !== "_far" ? () => router.push(`/place/${a.id}`) : undefined} />)}</Group>
          ) : none("Keine Hitzepunkte in 24 Stunden.")}
        </>
      ) : null}

      {kind === "quakes" ? (
        <>
          <Head title="Letzte 7 Tage" />
          {data.quakes.length ? (
            <Group>{[...data.quakes].sort((a, b) => (a.t < b.t ? 1 : -1)).map((q, i) => (
              <ListRow key={i} first={i === 0} label={q.mag != null ? `Stärke ${String(q.mag).replace(".", ",")}, ${where(q.lat, q.lon)}` : q.title} sub={fmtFull(q.t)}
                external={!!q.url} onPress={q.url ? () => openLink(q.url) : undefined} />
            ))}</Group>
          ) : none("Keine Erdbeben ab Stärke 2,5.")}
        </>
      ) : null}

      {kind === "sea" ? (
        <>
          <Head title="Letzte 30 Tage" />
          {data.maritime.length ? data.maritime.map((x, i) => <PlainRow key={i} first={i === 0} title={x.title} meta={seaMeta(x)} external onPress={() => openLink(x.url || m.url)} />)
            : none("Keine Vorfälle.")}
        </>
      ) : null}

      <View style={{ flexDirection: "row", gap: space.s, marginTop: space.xl, flexWrap: "wrap" }}>
        {kind !== "internet" ? <View style={{ flexGrow: 1 }}><Button label="Auf der Karte" icon="map-outline" onPress={() => router.navigate("/map")} /></View> : null}
        <View style={{ flexGrow: 1 }}><Button label={`Bei ${m.who} ansehen`} icon="open-outline" kind="secondary" onPress={() => openLink(m.url)} /></View>
      </View>
    </Screen>
  );
}
