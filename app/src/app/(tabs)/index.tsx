// Lage: ein kurzes Briefing. Was ist wichtig, welche Geschichten laufen, was zeigen die Messwerte, wohin weiter.
// Alles Weitere steht auf eigenen Seiten; hier nur das, was man in wenigen Sekunden erfassen kann.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { itemTime, StoryCard } from "../../components/items";
import { LageSkeleton } from "../../components/Skeleton";
import { SkyBand } from "../../components/SkyBand";
import { briefOf, periodIn, PERIODS } from "../../lib/brief";
import { Button, Empty, Group, Head, ListRow, Screen, T, TabTools, tap } from "../../components/ui";
import { fmtDay, fmtIsoDay, fmtShort, fmtTime, fmtWhen, num, plural, todayBerlin } from "../../lib/de";
import { useData } from "../../lib/data";
import { t as tr } from "../../lib/i18n";
import { feedState } from "../../lib/feeds";
import { dedupe, poolOf, storiesOf } from "../../lib/stories";
import { useTheme } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const ALERT: Record<string, { label: string; icon: Icon; to: string }> = {
  outage: { label: "Internetverbindung", icon: "wifi-outline", to: "/signal/internet" },
  maritime: { label: "Vorfall auf See", icon: "boat-outline", to: "/signal/sea" },
  quake: { label: "Erdbeben", icon: "pulse-outline", to: "/signal/quakes" },
  surge: { label: "Viele Meldungen", icon: "newspaper-outline", to: "/news?region=eritrea" },
};
const DAY = 24 * 3600e3;

export default function Lage() {
  const t = useTheme();
  const { data, loading, seenBefore, firstVisit, loadedAt, refresh } = useData();
  // Zeitraum der Zusammenfassung: 24 Stunden, 72 Stunden oder 7 Tage (auf dem Gerät gemerkt)
  const [hours, setHoursState] = useState(24);
  useEffect(() => { AsyncStorage.getItem("hl:lage:hours").then((v) => { const n = Number(v); if ((PERIODS as readonly number[]).includes(n)) setHoursState(n); }).catch(() => {}); }, []);
  const setHours = (h: number) => { setHoursState(h); AsyncStorage.setItem("hl:lage:hours", String(h)).catch(() => {}); };
  const WIN = hours * 3600e3;

  const d = useMemo(() => {
    if (!data) return null;
    const pool = dedupe(poolOf(data));
    const fresh = pool.filter((i) => new Date(i.fetched_at).getTime() > seenBefore).length;
    const changed = data.claims.filter((c) => c.events.some((e) => new Date(e.at).getTime() > seenBefore)).length;
    // Geschichten im Zeitraum: erst Eritrea (meistberichtet zuerst), dann was sonst die meisten Medien aufgreifen
    const recent = storiesOf(data).filter((s) => Date.now() - new Date(s.last).getTime() < WIN);
    const bySize = (a: typeof recent[0], b: typeof recent[0]) => b.sources - a.sources || (a.last < b.last ? 1 : -1);
    const mine = recent.filter((s) => s.items.some((i) => i.regions.includes("eritrea"))).sort(bySize);
    const rest = recent.filter((s) => !mine.includes(s)).sort(bySize);
    const top = [...mine.slice(0, 3), ...rest.slice(0, 2), ...mine.slice(3)].slice(0, 5);
    const items = recent.flatMap((s) => s.items.filter((i) => Date.now() - new Date(itemTime(i)).getTime() < WIN));
    const media = new Map<string, string>();
    for (const i of items) media.set(i.origin_domain || i.source_name, i.source_type);
    const types: Record<string, number> = {};
    for (const ty of media.values()) types[ty] = (types[ty] || 0) + 1;
    const newest = data.sat.flatMap((p) => p.images.map((i) => ({ p, i }))).sort((a, b) => (a.i.t < b.i.t ? 1 : -1))[0];
    const after = (x: string) => new Date(x).getTime() > seenBefore;
    const sea = data.maritime.filter((m) => after(m.t)).length;
    const quakes = data.quakes.filter((q) => after(q.t) && (q.mag ?? 0) >= 4.5).length;
    return { fresh, changed, sea, quakes, top, count: recent.length, media: media.size, types, newest };
  }, [data, seenBefore, WIN]);

  if (!data || !d) {
    return (
      <Screen title={tr("Lage")} refresh={false} right={<TabTools />}>
        {loading ? <LageSkeleton />
          : <><Empty icon="cloud-offline-outline" text={tr("Keine Verbindung zum Server. Bitte Internet prüfen und erneut versuchen.")} />
            <Button label={tr("Erneut versuchen")} icon="refresh" onPress={refresh} /></>}
      </Screen>
    );
  }

  // Messwerte: ohne aktuelle Daten „–“, nie eine erfundene Null
  const firms = feedState(data, "firms"), ukmto = feedState(data, "ukmto"), usgs = feedState(data, "usgs"), ioda = feedState(data, "ioda");
  const er = data.outages.filter((o) => o.country === "ER").length, et = data.outages.filter((o) => o.country === "ET").length;
  // Was schon unter „Auffällig“ steht, erscheint hier ohne Warnfarbe (Warnfarbe nur einmal je Bildschirm)
  const warned = new Set(data.alerts.map((a) => a.kind));
  const signals: { icon: Icon; label: string; hint: string; value: string; tone?: "alert" | "none"; to: string }[] = [];
  // Internet: kurze Rückgänge sind häufig und meist harmlos. Gewarnt wird nur über „Auffällig“ (dort mit Schwelle).
  signals.push({ icon: "wifi-outline", label: tr("Internet Eritrea"), hint: tr("48 Std."), value: !ioda.ok ? "–" : num(er), tone: !ioda.ok ? "none" : undefined, to: "/signal/internet" });
  signals.push({ icon: "wifi-outline", label: tr("Internet Äthiopien"), hint: tr("48 Std."), value: !ioda.ok ? "–" : num(et), tone: !ioda.ok ? "none" : undefined, to: "/signal/internet" });
  signals.push({ icon: "flame-outline", label: tr("Hitzepunkte"), hint: tr("24 Std."), value: data.firesError || !firms.ok ? "–" : `${data.firesCapped ? "≥ " : ""}${num(data.firesTotal)}`, tone: data.firesError || !firms.ok ? "none" : undefined, to: "/signal/fires" });
  signals.push({ icon: "boat-outline", label: tr("Vorfälle auf See"), hint: tr("30 Tage"), value: !ukmto.ok ? "–" : num(data.maritime.length),
    tone: !ukmto.ok ? "none" : data.maritime.some((m) => Date.now() - new Date(m.t).getTime() < 2 * DAY) && !warned.has("maritime") ? "alert" : undefined, to: "/signal/sea" });
  signals.push({ icon: "pulse-outline", label: tr("Erdbeben"), hint: tr("7 Tage"), value: !usgs.ok ? "–" : num(data.quakes.length), tone: !usgs.ok ? "none" : undefined, to: "/signal/quakes" });
  const broken = data.sources.filter((x) => !["firms", "ukmto", "usgs", "ioda"].includes(x.kind) && !!x.last_error && (!x.last_ok_at || new Date(x.last_fetch_at || 0) > new Date(x.last_ok_at))).length;

  const report = data.reports[0];
  const berlinHour = Number(new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "numeric", hour12: false }).format(new Date()));
  const since = firstVisit ? tr("in 24 Stunden") : tr("seit {when}", { when: fmtWhen(seenBefore) });
  const news: { text: string; to: string }[] = [];
  if (d.fresh) news.push({ text: tr("{count} {since}", { count: plural(d.fresh, "neue Meldung", "neue Meldungen"), since }), to: "/news?new=1" });
  if (d.changed) news.push({ text: tr("{count} geändert {since}", { count: d.changed === 1 ? tr("1 Behauptung") : tr("{n} Behauptungen", { n: num(d.changed) }), since }), to: "/claims" });
  if (d.sea) news.push({ text: tr("{count} auf See {since}", { count: plural(d.sea, "neuer Vorfall", "neue Vorfälle"), since }), to: "/signal/sea" });
  if (d.quakes) news.push({ text: tr("{count} {since}", { count: plural(d.quakes, "spürbares Erdbeben", "spürbare Erdbeben"), since }), to: "/signal/quakes" });

  // Auf einen Blick: wenige Sätze, Wichtigstes zuerst; dazu, was wir gerade nicht sehen
  const brief = briefOf(data, storiesOf(data), { hours, fresh: d.fresh, since });

  return (
    <Screen hero={<SkyBand data={data} day={fmtDay(data.now)} stand={fmtTime(loadedAt || data.now)} brief={brief} hours={hours} onHours={setHours} />}>
      {data.owner && broken ? (
        <Pressable onPress={() => { tap(); router.push("/sources"); }} accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36, opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="alert-circle-outline" size={15} color={t.muted} />
          <T v="caption" style={{ flex: 1 }}>{broken === 1 ? tr("1 Nachrichtenquelle gestört") : tr("{n} Nachrichtenquellen gestört", { n: broken })}</T>
          <Ionicons name="chevron-forward" size={14} color={t.faint} />
        </Pressable>
      ) : null}

      {/* Geschichten des Tages: zu Eritrea zuerst, dann nach Zahl der Medien. Keine redaktionelle Gewichtung. */}
      <Head title={hours === 24 ? tr("Die Themen heute") : tr("Die Themen {period}", { period: periodIn(hours) })} first action={tr("Alle Meldungen")} onAction={() => router.navigate(`/news?hours=${hours}`)} />
      {d.top.length ? d.top.map((s, i) => (
        <View key={s.key} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
          <StoryCard s={s} seenBefore={seenBefore} />
        </View>
      )) : <T v="small">{tr("{period} keine Meldungen aus unseren Quellen.", { period: periodIn(hours) })}</T>}

      {/* Informationslücken: was Semay gerade nicht sehen kann. Gehört zur Lage wie das, was wir sehen. */}
      {brief.gaps.length ? (
        <>
          <Head title={tr("Was wir nicht sehen")} />
          <View>
            {brief.gaps.map((g, i) => (
              <Pressable key={i} onPress={() => { tap(); router.push(g.to as any); }} accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: "row", gap: 10, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                <Ionicons name={g.icon} size={17} color={t.muted} style={{ marginTop: 2 }} />
                <T v="small" color={t.ink} style={{ flex: 1 }}>{g.text}</T>
                <Ionicons name="chevron-forward" size={14} color={t.faint} style={{ marginTop: 3 }} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* Weiter zu */}
      <Head title={tr("Weiter zu")} />
      <Group>
        {data.owner ? <ListRow first icon="document-text-outline" label={tr("Tagesbericht")}
          sub={report ? `${fmtIsoDay(report.report_date)}${report.report_date !== todayBerlin() && berlinHour >= 8 ? ` · ${tr("der heutige fehlt noch")}` : ""}` : tr("Der erste entsteht um 7:15 Uhr (deutsche Zeit)")}
          onPress={report ? () => router.push(`/report/${report.report_date}`) : undefined} /> : null}
        <ListRow first={!data.owner} icon="location-outline" label={tr("Orte")} sub={tr("Asmara, Assab, Adigrat und mehr")} onPress={() => router.push("/places")} />
        <ListRow icon="planet-outline" label={tr("Satellitenbilder")} sub={d.newest ? tr("{n} Orte · neuestes Bild vom {date}", { n: data.sat.length, date: fmtShort(d.newest.i.t) }) : tr("Vorher und nachher vergleichen")} onPress={() => router.push("/satellite")} />
      </Group>
    </Screen>
  );
}
