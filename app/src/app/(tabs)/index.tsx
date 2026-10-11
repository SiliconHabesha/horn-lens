// Lage: das Wichtigste auf einen Blick, Eritrea zuerst.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { dedupe, itemTime, StoryList, Voices } from "../../components/items";
import { boxOf, fit, MapSvg } from "../../components/MapCanvas";
import { LageSkeleton } from "../../components/Skeleton";
import { Banner, Button, Card, Empty, IconButton, openLink, Screen, SectionHead, StatusPill, T, tap } from "../../components/ui";
import { ago, fmtCapDay, fmtDay, fmtIsoDay, fmtWhen, num, plural } from "../../lib/de";
import { useData } from "../../lib/data";
import { BELES_URL, CLAUDE_PAGE, feedState, lastFailed, noData } from "../../lib/feeds";
import { storiesOf } from "../../lib/stories";
import { radius, space, useTheme } from "../../lib/theme";

const KIND: Record<string, [string, string]> = {
  outage: ["Internet", "Gemessen"], maritime: ["Auf See", "Amtliche Meldung"], quake: ["Erdbeben", "Gemessen"], surge: ["Meldungen", "Zählung"],
};

export default function Lage() {
  const t = useTheme();
  const { data, loading, error, seenBefore, firstVisit, loadedAt, refresh } = useData();

  const derived = useMemo(() => {
    if (!data) return null;
    const pool = data.owner ? data.items : data.items.filter((i) => i.regions.length === 1 && i.regions[0] === "red_sea");
    const day = pool.filter((i) => Date.now() - new Date(itemTime(i)).getTime() < 24 * 3600e3);
    const eritrea = dedupe(day.filter((i) => i.regions.includes("eritrea")));
    const fresh = dedupe(pool.filter((i) => new Date(i.fetched_at).getTime() > seenBefore));
    const changed = data.claims.filter((c) => c.events.some((e) => new Date(e.at).getTime() > seenBefore));
    const recentClaims = [...data.claims].sort((a, b) => (a.events[0]?.at < b.events[0]?.at ? 1 : -1)).slice(0, 3);
    const imgs = data.sat.flatMap((p) => p.images.map((i) => ({ p, i }))).sort((a, b) => (a.i.t < b.i.t ? 1 : -1));
    const redSea = dedupe(day.filter((i) => i.regions.includes("red_sea")));
    // Geschichten der letzten 24 Stunden: Eritrea zuerst, dann was die meisten Medien aufgreifen
    const recent = storiesOf(data).filter((s) => Date.now() - new Date(s.last).getTime() < 24 * 3600e3);
    const erStories = recent.filter((s) => s.items.some((i) => i.regions.includes("eritrea")));
    const shown = new Set(erStories.slice(0, 5).map((s) => s.key));
    const top = recent.filter((s) => s.sources >= 2 && !shown.has(s.key)).sort((a, b) => b.sources - a.sources || (a.last < b.last ? 1 : -1)).slice(0, 3);
    const redStories = recent.filter((s) => s.items.some((i) => i.regions.includes("red_sea")));
    const newShips = data.maritime.filter((m) => new Date(m.t).getTime() > seenBefore).length;
    const newQuakes = data.quakes.filter((q) => new Date(q.t).getTime() > seenBefore).length;
    return { day, eritrea, fresh, changed, recentClaims, newestImg: imgs[0], redSea, erStories, top, redStories, newShips, newQuakes };
  }, [data, seenBefore]);

  if (!data) {
    return (
      <Screen title="Lage" refresh={false}>
        {loading ? <LageSkeleton />
          : <><Empty icon="cloud-offline-outline" text={`Die Daten konnten nicht geladen werden${error ? ` (${error})` : ""}.`} />
            <Button label="Noch einmal laden" icon="refresh" onPress={refresh} /></>}
      </Screen>
    );
  }
  const d = derived!;
  const firms = feedState(data, "firms"), ukmto = feedState(data, "ukmto"), usgs = feedState(data, "usgs"), ioda = feedState(data, "ioda");
  const er = data.outages.filter((o) => o.country === "ER"), et = data.outages.filter((o) => o.country === "ET");
  const tiles: { big: string; label: string; tone?: "alert" | "none"; to: string }[] = [];
  if (data.owner) {
    tiles.push(!ioda.ok ? { big: "–", label: `Internet Eritrea: ${noData(ioda, "IODA")}`, tone: "none", to: "/map" }
      : { big: er.length ? plural(er.length, "Warnung", "Warnungen") : "Normal", label: `Internet Eritrea, 48 Std.${lastFailed(ioda)}`, tone: er.length ? "alert" : undefined, to: "/map" });
    tiles.push(!ioda.ok ? { big: "–", label: `Internet Äthiopien: ${noData(ioda, "IODA")}`, tone: "none", to: "/map" }
      : { big: et.length ? plural(et.length, "Warnung", "Warnungen") : "Normal", label: `Internet Äthiopien, 48 Std.${lastFailed(ioda)}`, tone: et.length ? "alert" : undefined, to: "/map" });
  }
  tiles.push(data.firesError || !firms.ok ? { big: "–", label: `Hitzepunkte: ${data.firesError ? "nicht geladen" : noData(firms, "NASA FIRMS")}`, tone: "none", to: "/map" }
    : { big: `${data.firesCapped ? "≥ " : ""}${num(data.firesTotal)}`, label: `${data.firesTotal === 1 ? "Hitzepunkt" : "Hitzepunkte"}, 24 Std.${firms.partial ? " Lücken bei Überflügen." : ""}`, to: "/map" });
  tiles.push(!ukmto.ok ? { big: "–", label: `Auf See: ${noData(ukmto, "UKMTO")}`, tone: "none", to: "/map" }
    : { big: num(data.maritime.length), label: `${data.maritime.length === 1 ? "Vorfall" : "Vorfälle"} auf See, 30 Tage`, tone: data.maritime.some((m) => Date.now() - new Date(m.t).getTime() < 2 * 864e5) ? "alert" : undefined, to: "/map" });
  if (!data.owner) tiles.push(!usgs.ok ? { big: "–", label: `Erdbeben: ${noData(usgs, "USGS")}`, tone: "none", to: "/map" }
    : { big: num(data.quakes.length), label: "Erdbeben ab Stärke 2,5, 7 Tage", to: "/map" });

  const latestReport = data.reports[0];

  return (
    <Screen title="Lage" sub={loadedAt ? `${fmtDay(data.now)} · aktualisiert ${ago(loadedAt)}` : fmtDay(data.now)}
      right={<IconButton icon="ellipsis-horizontal" label="Mehr" onPress={() => router.push("/more")} />}>
      {!data.owner ? (
        <Banner icon="information-circle-outline" text="Offene Ausgabe: Messwerte, Satellitenbilder und Schifffahrtsmeldungen vom Roten Meer. Behauptungen aus dem Konflikt verfolgt diese Ausgabe nicht." />
      ) : null}

      {/* Seit dem letzten Besuch */}
      <SinceCard seenBefore={seenBefore} first={firstVisit} counts={[
        ...(data.owner ? [[d.fresh.length, "neue Meldung", "neue Meldungen", "/news?new=1"], [d.changed.length, "Behauptung geändert", "Behauptungen geändert", "/claims"]] as const : []),
        [d.newShips, "Vorfall auf See", "Vorfälle auf See", "/map"], [d.newQuakes, "Erdbeben", "Erdbeben", "/map"],
      ]} />

      {/* Hinweise */}
      {data.alerts.length ? (
        <View style={{ gap: space.s, marginBottom: space.m }}>
          {data.alerts.map((a, i) => {
            const [k, kind] = KIND[a.kind] || ["Hinweis", ""];
            return (
              <Card key={i} onPress={a.url ? () => openLink(a.url) : undefined} style={{ borderLeftWidth: 4, borderLeftColor: t.warn }} accessibilityLabel={`${k}: ${a.title}`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <T v="label" color={t.warn}>{k} · {kind}</T>
                  <T v="caption">{fmtWhen(a.t)}</T>
                </View>
                <T v="bodyStrong">{a.title}</T>
                {a.note ? <T v="small" style={{ marginTop: 4 }}>{a.note}</T> : null}
                {a.source ? <T v="caption" style={{ marginTop: 6 }}>Quelle: {a.source}</T> : null}
              </Card>
            );
          })}
        </View>
      ) : null}

      {/* Messwerte */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
        {tiles.map((x, i) => (
          <Card key={i} onPress={() => router.push(x.to as any)} style={{ flexBasis: "47%", flexGrow: 1, padding: space.m, minHeight: 92 }} accessibilityLabel={`${x.big}. ${x.label}`}>
            <T v="h2" color={x.tone === "alert" ? t.warn : x.tone === "none" ? t.muted : t.ink}>{x.big}</T>
            <T v="caption" style={{ marginTop: 4 }}>{x.label}</T>
          </Card>
        ))}
      </View>

      {/* Kleine Karte */}
      <MiniMap />

      {/* Eritrea */}
      {data.owner ? (
        <>
          <SectionHead title="Eritrea" action="Alle" onAction={() => router.push("/news?region=eritrea")}
            sub={d.eritrea.length ? `${plural(d.eritrea.length, "Meldung", "Meldungen")} in ${plural(d.erStories.length, "Geschichte", "Geschichten")}, 24 Stunden. Meldungen sind keine geprüften Tatsachen.` : undefined} />
          {d.eritrea.length ? (
            <Card style={{ paddingVertical: space.s }}>
              <View style={{ paddingVertical: space.s }}><Voices items={d.eritrea} unit="Meldungen" /></View>
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.rule, marginVertical: 4 }} />
              <StoryList stories={d.erStories} seenBefore={seenBefore} limit={5} />
            </Card>
          ) : <Card><T v="small">Keine Meldungen zu Eritrea in den letzten 24 Stunden aus unseren Quellen. Das ist häufig: Aus dem Land dringen kaum unabhängige Nachrichten.</T></Card>}
        </>
      ) : (
        <>
          <SectionHead title="Rotes Meer" action="Alle" onAction={() => router.push("/news")} />
          {d.redSea.length ? <Card style={{ paddingVertical: space.s }}><StoryList stories={d.redStories} limit={5} /></Card>
            : <Card><T v="small">Keine Meldungen zum Roten Meer in den letzten 24 Stunden.</T></Card>}
        </>
      )}

      {/* Meistberichtet */}
      {data.owner && d.top.length ? (
        <>
          <SectionHead title="Meistberichtet" action="Alle" onAction={() => router.push("/news")} sub="Geschichten, die mehrere Medien in 24 Stunden aufgreifen" />
          <Card style={{ paddingVertical: space.s }}><StoryList stories={d.top} seenBefore={seenBefore} /></Card>
        </>
      ) : null}

      {/* Behauptungen */}
      {data.owner && d.recentClaims.length ? (
        <>
          <SectionHead title="Behauptungen" action="Alle" onAction={() => router.push("/claims")} sub="Zuletzt geändert" />
          <View style={{ gap: space.s }}>
            {d.recentClaims.map((c) => (
              <Card key={c.id} onPress={() => router.push(`/claim/${c.id}`)} accessibilityLabel={c.statement}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <StatusPill status={c.status} small />
                  <T v="caption">{c.events[0] ? fmtWhen(c.events[0].at) : ""}</T>
                </View>
                <T v="bodyStrong" style={{ marginTop: 6 }} numberOfLines={3}>{c.statement}</T>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* Tagesbericht und Satellit */}
      <View style={{ gap: space.s, marginTop: space.xl }}>
        {data.owner ? (
          <Card onPress={latestReport ? () => router.push(`/report/${latestReport.report_date}`) : undefined}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.m, backgroundColor: t.cardAlt, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="document-text-outline" size={20} color={t.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3">Tagesbericht</T>
                <T v="small">{latestReport ? fmtIsoDay(latestReport.report_date) : "Der erste Bericht entsteht um 7:15 Uhr."}</T>
              </View>
              {latestReport ? <Ionicons name="chevron-forward" size={18} color={t.faint} /> : null}
            </View>
          </Card>
        ) : null}
        {d.newestImg ? (
          <Card onPress={() => router.push(`/satellite?place=${d.newestImg.p.id}`)}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.m, backgroundColor: t.cardAlt, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="planet-outline" size={20} color={t.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3">Neuestes Satellitenbild</T>
                <T v="small">{d.newestImg.p.name}, {fmtCapDay(d.newestImg.i.t)}</T>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.faint} />
            </View>
          </Card>
        ) : null}
        {data.owner ? (
          <Card onPress={() => openLink(CLAUDE_PAGE)}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.m, backgroundColor: t.cardAlt, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="sparkles-outline" size={20} color={t.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="h3">Zusammenfassen mit Claude</T>
                <T v="small">Öffnet Horn Lens in Claude. Dort fasst Claude die Meldungen mit Belegen zusammen und übersetzt Schlagzeilen.</T>
              </View>
              <Ionicons name="open-outline" size={18} color={t.faint} />
            </View>
          </Card>
        ) : null}
      </View>

      <Pressable onPress={() => openLink(BELES_URL)} style={{ marginTop: space.xxl, alignItems: "center", gap: 4 }} accessibilityRole="link">
        <T v="caption">powered by <T v="caption" color={t.ink} style={{ fontWeight: "800", letterSpacing: 1 }}>BELES</T></T>
        <T v="caption" style={{ textAlign: "center" }}>Mit der Community darüber sprechen: BELES, die App für Eritreerinnen und Eritreer weltweit.</T>
      </Pressable>
    </Screen>
  );
}

/** Was seit dem letzten Öffnen dazugekommen ist. Jede Zahl führt zur passenden Ansicht. */
function SinceCard({ seenBefore, first, counts }: { seenBefore: number; first: boolean; counts: readonly (readonly [number, string, string, string])[] }) {
  const t = useTheme();
  const any = counts.some(([n]) => n > 0);
  return (
    <Card style={{ marginBottom: space.m, backgroundColor: t.cardAlt, borderWidth: 0 }}>
      <T v="label" color={t.muted}>{first ? "In den letzten 24 Stunden" : `Seit deinem letzten Besuch (${ago(seenBefore)})`}</T>
      {any ? (
        <View style={{ flexDirection: "row", gap: space.l, marginTop: 8, flexWrap: "wrap" }}>
          {counts.filter(([n], i) => n > 0 || i < 2).map(([n, one, many, to]) => (
            <Pressable key={to + one} onPress={() => { tap(); router.push(to as any); }} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? one : many}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, minWidth: 64 })}>
              <T v="h2" color={n ? t.ink : t.muted}>{num(n)}</T><T v="small">{n === 1 ? one : many}</T>
            </Pressable>
          ))}
        </View>
      ) : <T v="body" style={{ marginTop: 6 }}>Nichts Neues.</T>}
    </Card>
  );
}

// Kleine Karte als Überblick; Tippen öffnet die große Karte
const MINI = boxOf(18.6, 35.6, 11.4, 44.2);
function MiniMap() {
  const t = useTheme();
  const { data } = useData();
  const [w, setW] = useState(0);
  if (!data) return null;
  const h = Math.round(Math.min(w * 0.62, 260));
  const box = w ? fit(MINI, h / w) : MINI;
  const parts = [
    data.firesTotal ? `${data.firesCapped ? "≥ " : ""}${num(data.firesTotal)} Hitzepunkte (24 Std.)` : null,
    data.quakes.length ? plural(data.quakes.length, "Erdbeben", "Erdbeben") + " (7 Tage)" : null,
    data.maritime.length ? plural(data.maritime.length, "Vorfall", "Vorfälle") + " auf See (30 Tage)" : null,
  ].filter(Boolean);
  return (
    <Card onPress={() => router.push("/map")} style={{ marginTop: space.s, padding: 0, overflow: "hidden" }} accessibilityLabel={`Karte öffnen. ${parts.join(", ")}`}>
      <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} pointerEvents="none">
        {w ? <MapSvg data={data} layers={{ fire: true, quake: true, ship: true, sat: true }} box={box} w={w} h={h} mini /> : <View style={{ height: 200 }} />}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: space.m }}>
        <View style={{ flex: 1 }}>
          <T v="h3">Auf der Karte</T>
          <T v="caption">{parts.length ? parts.join(" · ") : "Keine Messwerte im Zeitraum."}</T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.faint} />
      </View>
    </Card>
  );
}
