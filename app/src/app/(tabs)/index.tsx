// Lage: das Wichtigste auf einen Blick, Eritrea zuerst.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { dedupe, itemTime, StoryList, Voices } from "../../components/items";
import { boxOf, fit, MapSvg } from "../../components/MapCanvas";
import { LageSkeleton } from "../../components/Skeleton";
import { Banner, Button, Card, Empty, IconButton, openLink, Screen, SectionHead, StatusPill, T, tap } from "../../components/ui";
import { ago, fmtCapDay, fmtDay, fmtIsoDay, fmtTime, fmtWhen, num, plural, todayBerlin } from "../../lib/de";
import { useData } from "../../lib/data";
import { BELES_URL, CLAUDE_PAGE, feedState, lastFailed } from "../../lib/feeds";
import { PLACES, mentions } from "../../lib/places";
import { poolOf, storiesOf } from "../../lib/stories";
import { radius, space, useTheme } from "../../lib/theme";

const KIND: Record<string, [string, string]> = {
  outage: ["Internet", "Gemessen"], maritime: ["Auf See", "Amtliche Meldung"], quake: ["Erdbeben", "Gemessen"], surge: ["Meldungen", "Zählung"],
};

export default function Lage() {
  const t = useTheme();
  const { data, loading, error, seenBefore, firstVisit, loadedAt, refresh } = useData();
  // Breite Fenster: Messwerte umbrechen statt seitlich zu scrollen
  const wide = useWindowDimensions().width >= 700;

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
  type Tile = { icon: keyof typeof Ionicons.glyphMap; big: string; label: string; tone?: "alert" | "none"; to: string };
  const tiles: Tile[] = [];
  if (data.owner) {
    for (const [name, list] of [["Eritrea", er], ["Äthiopien", et]] as const) {
      tiles.push(!ioda.ok ? { icon: "wifi-outline", big: "–", label: `Internet ${name}: keine aktuellen Daten`, tone: "none", to: "/signal/internet" }
        : { icon: "wifi-outline", big: list.length ? plural(list.length, "Warnung", "Warnungen") : "Normal", label: `Internet ${name}, 48 Std.${lastFailed(ioda) ? " Letzte Abfrage gescheitert." : ""}`,
          tone: list.length ? "alert" : undefined, to: "/signal/internet" });
    }
  }
  tiles.push(data.firesError || !firms.ok ? { icon: "flame-outline", big: "–", label: `Hitzepunkte: ${data.firesError ? "nicht geladen" : "keine aktuellen Daten"}`, tone: "none", to: "/signal/fires" }
    : { icon: "flame-outline", big: `${data.firesCapped ? "≥ " : ""}${num(data.firesTotal)}`, label: `${data.firesTotal === 1 ? "Hitzepunkt" : "Hitzepunkte"}, 24 Std.${firms.partial ? " Mit Lücken." : ""}`, to: "/signal/fires" });
  tiles.push(!ukmto.ok ? { icon: "boat-outline", big: "–", label: "Auf See: keine aktuellen Daten", tone: "none", to: "/signal/sea" }
    : { icon: "boat-outline", big: num(data.maritime.length), label: `${data.maritime.length === 1 ? "Vorfall" : "Vorfälle"} auf See, 30 Tage`, tone: data.maritime.some((m) => Date.now() - new Date(m.t).getTime() < 2 * 864e5) ? "alert" : undefined, to: "/signal/sea" });
  tiles.push(!usgs.ok ? { icon: "pulse-outline", big: "–", label: "Erdbeben: keine aktuellen Daten", tone: "none", to: "/signal/quakes" }
    : { icon: "pulse-outline", big: num(data.quakes.length), label: "Erdbeben ab 2,5, 7 Tage", to: "/signal/quakes" });

  const latestReport = data.reports[0];
  const broken = data.sources.filter((x) => !["firms", "ukmto", "usgs", "ioda"].includes(x.kind) && !!x.last_error && (!x.last_ok_at || new Date(x.last_fetch_at || 0) > new Date(x.last_ok_at))).map((x) => x.name);

  return (
    <Screen title="Lage" sub={loadedAt ? `${fmtDay(data.now)} · Stand ${fmtTime(loadedAt)} Uhr` : fmtDay(data.now)}
      right={<View style={{ flexDirection: "row", gap: 8 }}>
        <IconButton icon="search" label="Suchen" onPress={() => router.push("/search")} />
        <IconButton icon="ellipsis-horizontal" label="Mehr" onPress={() => router.push("/more")} />
      </View>}>
      {!data.owner ? (
        <Banner icon="information-circle-outline" text="Offene Ausgabe: Messwerte, Satellitenbilder und Schifffahrtsmeldungen vom Roten Meer. Behauptungen aus dem Konflikt verfolgt diese Ausgabe nicht." />
      ) : null}

      {/* Seit dem letzten Besuch */}
      <SinceCard seenBefore={seenBefore} first={firstVisit} counts={[
        ...(data.owner ? [[d.fresh.length, "neue Meldung", "neue Meldungen", "/news?new=1"], [d.changed.length, "Behauptung geändert", "Behauptungen geändert", "/claims"]] as const : []),
        [d.newShips, "Vorfall auf See", "Vorfälle auf See", "/signal/sea"], [d.newQuakes, "Erdbeben", "Erdbeben", "/signal/quakes"],
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

      {/* Gestörte Quellen: fehlende Meldungen sind dann kein Zeichen für Ruhe */}
      {data.owner && broken.length ? (
        <Pressable onPress={() => { tap(); router.push("/sources"); }} accessibilityRole="button" hitSlop={6}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: space.m, opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="alert-circle-outline" size={16} color={t.warn} />
          <T v="small" color={t.warn} style={{ flex: 1 }}>{broken.length === 1 ? `1 Quelle gestört: ${broken[0]}` : `${broken.length} Quellen gestört, z. B. ${broken.slice(0, 2).join(", ")}`}</T>
          <Ionicons name="chevron-forward" size={15} color={t.warn} />
        </Pressable>
      ) : null}

      {/* Messwerte als Raster, Auffälliges zuerst: antippen öffnet die Einzelheiten */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }} accessibilityLabel="Messwerte">
        {[...tiles].sort((a, b) => (a.tone === "alert" ? 0 : a.tone === "none" ? 2 : 1) - (b.tone === "alert" ? 0 : b.tone === "none" ? 2 : 1)).map((x, i) => {
          const c = x.tone === "alert" ? t.warn : x.tone === "none" ? t.muted : t.ink;
          return (
            <Card key={i} onPress={() => router.push(x.to as any)} style={{ flexGrow: 1, flexBasis: wide ? 130 : "45%", padding: space.m, gap: 4 }} accessibilityLabel={`${x.big}. ${x.label}. Einzelheiten öffnen`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name={x.icon} size={16} color={c} />
                <T v="h3" color={c} numberOfLines={1} style={{ flexShrink: 1 }}>{x.big}</T>
              </View>
              <T v="caption">{x.label}</T>
            </Card>
          );
        })}
      </View>

      {/* Eritrea */}
      {data.owner ? (
        <>
          <SectionHead title="Eritrea" action="Alle" onAction={() => router.push("/news?region=eritrea")}
            sub={d.eritrea.length ? `${plural(d.eritrea.length, "Meldung", "Meldungen")} in ${plural(d.erStories.length, "Geschichte", "Geschichten")}, 24 Stunden. Meldungen sind keine geprüften Tatsachen.` : undefined} />
          {d.eritrea.length ? (
            <View>
              <Voices items={d.eritrea} unit="Meldungen" />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.rule, marginTop: space.m }} />
              <StoryList stories={d.erStories} seenBefore={seenBefore} limit={5} />
            </View>
          ) : <Card><T v="small">Keine Meldungen zu Eritrea in den letzten 24 Stunden aus unseren Quellen. Das ist häufig: Aus dem Land dringen kaum unabhängige Nachrichten.</T></Card>}
        </>
      ) : (
        <>
          <SectionHead title="Rotes Meer" action="Alle" onAction={() => router.push("/news")} />
          {d.redSea.length ? <StoryList stories={d.redStories} limit={5} />
            : <Card><T v="small">Keine Meldungen zum Roten Meer in den letzten 24 Stunden.</T></Card>}
        </>
      )}

      {/* Meistberichtet */}
      {data.owner && d.top.length ? (
        <>
          <SectionHead title="Meistberichtet" action="Alle" onAction={() => router.push("/news")} sub="Geschichten, die mehrere Medien in 24 Stunden aufgreifen" />
          <StoryList stories={d.top} seenBefore={seenBefore} />
        </>
      ) : null}

      {/* Kleine Karte und Orte, die gerade genannt werden */}
      <SectionHead title="Karte und Orte" action="Karte" onAction={() => router.navigate("/map")} />
      <MiniMap />
      <HotPlaces />

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
                <T v="small">{latestReport ? `${fmtIsoDay(latestReport.report_date)}${latestReport.report_date !== todayBerlin() && Number(new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "numeric", hour12: false }).format(new Date())) >= 8 ? " · der heutige fehlt noch" : ""}` : "Der erste Bericht entsteht um 7:15 Uhr."}</T>
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
/** Kopf der Lage: wie viel heute berichtet wird und von welchen Seiten (das Kernbild von Horn Lens), darunter was seit dem letzten Besuch neu ist */
function SinceCard({ seenBefore, first, counts }: { seenBefore: number; first: boolean; counts: readonly (readonly [number, string, string, string])[] }) {
  const t = useTheme();
  const { data } = useData();
  const today = useMemo(() => {
    if (!data) return null;
    const st = storiesOf(data).filter((x) => Date.now() - new Date(x.last).getTime() < 24 * 3600e3);
    const items = st.flatMap((x) => x.items.filter((i) => Date.now() - new Date(itemTime(i)).getTime() < 24 * 3600e3));
    const media = new Map<string, string>();
    for (const i of items) media.set(i.origin_domain || i.source_name, i.source_type);
    const types: Record<string, number> = {};
    for (const ty of media.values()) types[ty] = (types[ty] || 0) + 1;
    return { stories: st.length, items: items.length, media: media.size, types, multi: st.filter((x) => x.sources > 1).length };
  }, [data]);
  const shown = counts.filter(([n]) => n > 0);
  return (
    <View style={{ marginBottom: space.l }}>
      {today && today.items ? (
        <Pressable onPress={() => { tap(); router.navigate("/news"); }} accessibilityRole="button"
          accessibilityLabel={`Heute ${today.stories} Geschichten aus ${today.items} Meldungen von ${today.media} Medien. Öffnet die Meldungen.`}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, gap: 10 })}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <T v="display" tabular style={{ fontSize: 48, lineHeight: 50, letterSpacing: -2 }}>{num(today.stories)}</T>
            <View style={{ flex: 1 }}>
              <T v="h3">{today.stories === 1 ? "Geschichte heute" : "Geschichten heute"}</T>
              <T v="small">aus {plural(today.items, "Meldung", "Meldungen")} von {plural(today.media, "Medium", "Medien")}{today.multi ? `, ${today.multi} mehrfach berichtet` : ""}</T>
            </View>
          </View>
          <Voices counts={today.types} unit="Medien" />
        </Pressable>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: space.m }}>
        <T v="caption">{first ? "Letzte 24 Stunden:" : `Seit deinem letzten Besuch (${ago(seenBefore)}):`}</T>
        {shown.length ? shown.map(([n, one, many, to]) => (
          <Pressable key={to + one} onPress={() => { tap(); router.push(to as any); }} accessibilityRole="button" accessibilityLabel={`${n} ${n === 1 ? one : many}`} hitSlop={6}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 32, borderRadius: 999,
              backgroundColor: t.accent, opacity: pressed ? 0.7 : 1 })}>
            <T v="smallStrong" color={t.accentInk} tabular>{num(n)}</T>
            <T v="small" color={t.accentInk}>{n === 1 ? one : many}</T>
          </Pressable>
        )) : <T v="smallStrong">nichts Neues</T>}
      </View>
    </View>
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
    <Card onPress={() => router.navigate("/map")} style={{ padding: 0, overflow: "hidden" }} accessibilityLabel={`Karte öffnen. ${parts.join(", ")}`}>
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

// Orte, die Schlagzeilen der letzten 24 Stunden nennen, meistgenannte zuerst
function HotPlaces() {
  const t = useTheme();
  const { data } = useData();
  const list = useMemo(() => {
    if (!data) return [];
    const day = dedupe(poolOf(data).filter((i) => Date.now() - new Date(itemTime(i)).getTime() < 24 * 3600e3));
    return PLACES.map((p) => ({ p, n: day.filter((i) => mentions(p, i.title)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 8);
  }, [data]);
  return (
    <View style={{ marginTop: space.m }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <T v="smallStrong" color={t.muted}>{list.length ? "Genannte Orte, 24 Std." : "Orte"}</T>
        <Pressable onPress={() => { tap(); router.push("/places"); }} hitSlop={10} accessibilityRole="button"><T v="smallStrong" color={t.accent}>Alle Orte</T></Pressable>
      </View>
      {list.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.s }}>
          {list.map(({ p, n }) => (
            <Pressable key={p.id} onPress={() => { tap(); router.push(`/place/${p.id}`); }} accessibilityRole="button" accessibilityLabel={`${p.name}, in ${n} Schlagzeilen genannt`}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, backgroundColor: t.card,
                borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="location-outline" size={14} color={t.ink} />
              <T v="smallStrong">{p.name}</T>
              <T v="caption">{n}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
