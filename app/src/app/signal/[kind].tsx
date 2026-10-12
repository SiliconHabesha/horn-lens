// Ein Messwert im Detail: Internet, Hitzepunkte, Erdbeben oder Vorfälle auf See. Kurz erklärt, dann die Einträge.
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { View } from "react-native";
import { Button, Empty, Group, Head, ListRow, openLink, Screen, T } from "../../components/ui";
import { fmtFull, num } from "../../lib/de";
import { useData } from "../../lib/data";
import { feedState } from "../../lib/feeds";
import { km, nearest, nearText, PLACES, RADIUS, seaMeta } from "../../lib/places";
import { lang, t } from "../../lib/i18n";
import { space } from "../../lib/theme";
import { Skeleton } from "../../components/Skeleton";

type Kind = "internet" | "fires" | "quakes" | "sea";
const META: Record<Kind, { title: string; feed: string; who: string; about: string; url: string }> = {
  internet: { title: "Internetverbindung", feed: "ioda", who: "IODA", about: "Zeigt, wenn weniger Netze erreichbar sind, nicht warum. Kurze Rückgänge in Eritrea können unbemerkt bleiben.", url: "https://ioda.inetintel.cc.gatech.edu/" },
  fires: { title: "Hitzepunkte", feed: "firms", who: "NASA FIRMS", about: "Ein Hitzepunkt zeigt Hitze, nicht die Ursache: oft Feldbrände oder Gasfackeln, manchmal Kämpfe.", url: "https://firms.modaps.eosdis.nasa.gov/map/" },
  quakes: { title: "Erdbeben", feed: "usgs", who: "USGS", about: "Ab Stärke 2,5 in 7 Tagen. Das Afar-Dreieck bebt häufig.", url: "https://earthquake.usgs.gov/earthquakes/map/" },
  sea: { title: "Vorfälle auf See", feed: "ukmto", who: "UKMTO", about: "Britische Schifffahrtsstelle; nennt keine Verantwortlichen, Orte sind ungefähr.", url: "https://www.ukmto.org/recent-incidents" },
};
const COUNTRY: Record<string, string> = { ER: "Eritrea", ET: "Äthiopien" };
// Fachbegriffe aus der Messung kürzen: „(PING-SLASH24 12 % unter dem Üblichen)“ → „(−12 %)“
const plain = (s: string) => s.replace(/\s*\((?:PING-SLASH24|BGP|ACTIVE PROBING|MERIT-NT)[^)]*?(\d+)\s*%[^)]*\)/i, " (−$1 %)");
const where = (lat: number, lon: number) => nearText(nearest(lat, lon));

export default function Signal() {
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const known = ["internet", "fires", "quakes", "sea"].includes(String(raw));
  const kind = (known ? raw : "fires") as Kind;
  const m = META[kind];
  const { data } = useData();

  // Hitzepunkte je Ort, gezählt wie auf den Ortsseiten (alle Punkte im Umkreis); ein Punkt kann zu zwei Orten zählen
  const areas = useMemo(() => {
    if (!data || kind !== "fires") return [];
    const list = PLACES.map((p) => ({ id: p.id, name: p.name, n: data.fires.filter((f) => km(p.lat, p.lon, f.lat, f.lon) <= RADIUS.fire).length })).filter((x) => x.n);
    const far = data.fires.filter((f) => nearest(f.lat, f.lon).d > RADIUS.fire).length;
    list.sort((a, b) => b.n - a.n);
    return far ? [...list, { id: "_far", name: t("Weiter als {km} km von bekannten Orten", { km: RADIUS.fire }), n: far }] : list;
  }, [data, kind]);

  if (!known) return <Screen topInset={false} refresh={false}><Stack.Screen options={{ title: t("Messwerte") }} /><Empty text={t("Diese Seite gibt es nicht. Alle Messwerte stehen in der Lage.")} /></Screen>;
  if (!data) return <Screen topInset={false} refresh={false}><Stack.Screen options={{ title: t(m.title) }} /><Skeleton rows={5} /></Screen>;
  const st = feedState(data, m.feed);
  const down = !st.ok || (kind === "fires" && !!data.firesError);
  // Ohne aktuelle Daten nie „alles ruhig“ anzeigen
  const sample = data.firesCapped || data.firesTotal > data.fires.length;
  const none = (okText: string) => <T v="small">{down ? t("Keine aktuellen Daten von {source}.", { source: m.who }) : okText}</T>;

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: t(m.title) }} />
      <T v="caption">{st.last ? t("Stand {time} · {source}", { time: fmtFull(st.last), source: m.who }) : m.who}{down ? ` · ${t("derzeit keine aktuellen Daten")}` : ""}</T>
      <T v="body" style={{ marginTop: space.s }}>{t(m.about)}</T>

      {kind === "internet" ? ["ER", "ET"].map((c) => {
        const list = data.outages.filter((o) => o.country === c);
        return (
          <View key={c}>
            <Head title={t(COUNTRY[c])} />
            {list.length ? (
              <Group>{list.map((o, i) => <ListRow key={i} first={i === 0} icon="warning-outline" tone="alert" label={plain(o.title)} sub={fmtFull(o.t)} external={!!o.url} onPress={o.url ? () => openLink(o.url) : undefined} />)}</Group>
            ) : none(t("Keine Auffälligkeit in 48 Stunden."))}
          </View>
        );
      }) : null}

      {kind === "fires" ? (
        <>
          <Head title={sample ? (data.firesCapped ? t("{shown} von mindestens {total} Hitzepunkten, nach Ort", { shown: num(data.fires.length), total: num(data.firesTotal) }) : t("{shown} von {total} Hitzepunkten, nach Ort", { shown: num(data.fires.length), total: num(data.firesTotal) })) : t("{total} in 24 Stunden, nach Ort", { total: num(data.firesTotal) })} />
          <T v="caption" style={{ marginBottom: space.s }}>{sample ? `${t("Semay lädt nur eine Auswahl, die Zahlen sind deshalb Mindestwerte; alle Punkte zeigt NASA FIRMS.")} ` : ""}{t("Ein Punkt kann zu zwei nahen Orten zählen.")}</T>
          {areas.length ? (
            <Group>{areas.map((a, i) => <ListRow key={a.id} first={i === 0} label={a.id === "_far" ? a.name : t("Umkreis {place}", { place: a.name })} hint={a.id === "_far" ? undefined : t("bis {km} km", { km: RADIUS.fire })} value={num(a.n)}
              onPress={a.id !== "_far" ? () => router.push(`/place/${a.id}`) : undefined} align />)}</Group>
          ) : none(t("Keine Hitzepunkte in 24 Stunden."))}
        </>
      ) : null}

      {kind === "quakes" ? (
        <>
          <Head title={t("Letzte 7 Tage")} />
          {data.quakes.length ? (
            <Group>{[...data.quakes].sort((a, b) => (a.t < b.t ? 1 : -1)).map((q, i) => (
              <ListRow key={i} first={i === 0} label={q.mag != null ? t("Stärke {mag}, {where}", { mag: Number(q.mag).toLocaleString(lang() === "de" ? "de-DE" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), where: where(q.lat, q.lon) }) : q.title} sub={fmtFull(q.t)}
                external={!!q.url} onPress={q.url ? () => openLink(q.url) : undefined} />
            ))}</Group>
          ) : none(t("Keine Erdbeben ab Stärke 2,5."))}
        </>
      ) : null}

      {kind === "sea" ? (
        <>
          <Head title={t("Letzte 30 Tage")} />
          {data.maritime.length ? <Group>{[...data.maritime].sort((a, b) => (a.t < b.t ? 1 : -1)).map((x, i) => <ListRow key={i} first={i === 0} icon="boat-outline" label={x.title} sub={seaMeta(x)} external onPress={() => openLink(x.url || m.url)} />)}</Group>
            : none(t("Keine Vorfälle."))}
        </>
      ) : null}

      <View style={{ flexDirection: "row", gap: space.s, marginTop: space.xl, flexWrap: "wrap" }}>
        {kind !== "internet" ? <View style={{ flexGrow: 1 }}><Button label={t("Auf der Karte")} icon="map-outline" onPress={() => router.navigate("/map")} /></View> : null}
        <View style={{ flexGrow: 1 }}><Button label={t("Bei {source} ansehen", { source: m.who })} icon="open-outline" kind="secondary" onPress={() => openLink(m.url)} /></View>
      </View>
    </Screen>
  );
}
