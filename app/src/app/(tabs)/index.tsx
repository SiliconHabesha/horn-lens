// Lage: ein kurzes Briefing. Was ist wichtig, welche Geschichten laufen, was zeigen die Messwerte, wohin weiter.
// Alles Weitere steht auf eigenen Seiten; hier nur das, was man in wenigen Sekunden erfassen kann.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { itemTime, StoryCard } from "../../components/items";
import { LageSkeleton } from "../../components/Skeleton";
import { Banner, Button, Empty, Group, Head, IconButton, ListRow, Screen, T, tap } from "../../components/ui";
import { fmtDay, fmtIsoDay, fmtTime, fmtWhen, num, plural, todayBerlin } from "../../lib/de";
import { useData } from "../../lib/data";
import { feedState } from "../../lib/feeds";
import { dedupe, poolOf, storiesOf } from "../../lib/stories";
import { useTheme } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const ALERT: Record<string, { label: string; icon: Icon; to: string }> = {
  outage: { label: "Internet-Einbruch", icon: "wifi-outline", to: "/signal/internet" },
  maritime: { label: "Vorfall auf See", icon: "boat-outline", to: "/signal/sea" },
  quake: { label: "Erdbeben", icon: "pulse-outline", to: "/signal/quakes" },
  surge: { label: "Viele Meldungen", icon: "newspaper-outline", to: "/news?region=eritrea" },
};
const DAY = 24 * 3600e3;

export default function Lage() {
  const t = useTheme();
  const { data, loading, seenBefore, firstVisit, loadedAt, refresh } = useData();

  const d = useMemo(() => {
    if (!data) return null;
    const pool = dedupe(poolOf(data));
    const fresh = pool.filter((i) => new Date(i.fetched_at).getTime() > seenBefore).length;
    const changed = data.claims.filter((c) => c.events.some((e) => new Date(e.at).getTime() > seenBefore)).length;
    // Geschichten der letzten 24 Stunden: erst Eritrea (meistberichtet zuerst), dann was sonst die meisten Medien aufgreifen
    const recent = storiesOf(data).filter((s) => Date.now() - new Date(s.last).getTime() < DAY);
    const bySize = (a: typeof recent[0], b: typeof recent[0]) => b.sources - a.sources || (a.last < b.last ? 1 : -1);
    const focus = data.owner ? "eritrea" : "red_sea";
    const mine = recent.filter((s) => s.items.some((i) => i.regions.includes(focus))).sort(bySize);
    const rest = recent.filter((s) => !mine.includes(s)).sort(bySize);
    const top = [...mine.slice(0, 3), ...rest.slice(0, 2), ...mine.slice(3)].slice(0, 5);
    const items = recent.flatMap((s) => s.items.filter((i) => Date.now() - new Date(itemTime(i)).getTime() < DAY));
    const media = new Map<string, string>();
    for (const i of items) media.set(i.origin_domain || i.source_name, i.source_type);
    const types: Record<string, number> = {};
    for (const ty of media.values()) types[ty] = (types[ty] || 0) + 1;
    const newest = data.sat.flatMap((p) => p.images.map((i) => ({ p, i }))).sort((a, b) => (a.i.t < b.i.t ? 1 : -1))[0];
    return { fresh, changed, top, count: recent.length, media: media.size, types, newest };
  }, [data, seenBefore]);

  if (!data || !d) {
    return (
      <Screen title="Lage" refresh={false}>
        {loading ? <LageSkeleton />
          : <><Empty icon="cloud-offline-outline" text="Keine Verbindung zum Server. Bitte Internet prüfen und erneut versuchen." />
            <Button label="Erneut versuchen" icon="refresh" onPress={refresh} /></>}
      </Screen>
    );
  }

  // Messwerte: ohne aktuelle Daten „–“, nie eine erfundene Null
  const firms = feedState(data, "firms"), ukmto = feedState(data, "ukmto"), usgs = feedState(data, "usgs"), ioda = feedState(data, "ioda");
  const er = data.outages.filter((o) => o.country === "ER").length, et = data.outages.filter((o) => o.country === "ET").length;
  // Was schon unter „Wichtig jetzt“ steht, erscheint hier ohne Warnfarbe (Warnfarbe nur einmal je Bildschirm)
  const warned = new Set(data.alerts.map((a) => a.kind));
  const warnedIn = (country: RegExp) => data.alerts.some((a) => a.kind === "outage" && country.test(a.title));
  const signals: { icon: Icon; label: string; hint: string; value: string; tone?: "alert" | "none"; to: string }[] = [];
  if (data.owner) {
    signals.push({ icon: "wifi-outline", label: "Internet Eritrea", hint: "48 Std.", value: !ioda.ok ? "–" : er ? plural(er, "Einbruch", "Einbrüche") : "normal", tone: !ioda.ok ? "none" : er && !warnedIn(/Eritrea/) ? "alert" : undefined, to: "/signal/internet" });
    signals.push({ icon: "wifi-outline", label: "Internet Äthiopien", hint: "48 Std.", value: !ioda.ok ? "–" : et ? plural(et, "Einbruch", "Einbrüche") : "normal", tone: !ioda.ok ? "none" : et && !warnedIn(/Äthiopien|Ethiopia/) ? "alert" : undefined, to: "/signal/internet" });
  }
  signals.push({ icon: "flame-outline", label: "Hitzepunkte", hint: "24 Std.", value: data.firesError || !firms.ok ? "–" : `${data.firesCapped ? "≥ " : ""}${num(data.firesTotal)}`, tone: data.firesError || !firms.ok ? "none" : undefined, to: "/signal/fires" });
  signals.push({ icon: "boat-outline", label: "Vorfälle auf See", hint: "30 Tage", value: !ukmto.ok ? "–" : num(data.maritime.length),
    tone: !ukmto.ok ? "none" : data.maritime.some((m) => Date.now() - new Date(m.t).getTime() < 2 * DAY) && !warned.has("maritime") ? "alert" : undefined, to: "/signal/sea" });
  signals.push({ icon: "pulse-outline", label: "Erdbeben", hint: "7 Tage", value: !usgs.ok ? "–" : num(data.quakes.length), tone: !usgs.ok ? "none" : undefined, to: "/signal/quakes" });
  const broken = data.sources.filter((x) => !["firms", "ukmto", "usgs", "ioda"].includes(x.kind) && !!x.last_error && (!x.last_ok_at || new Date(x.last_fetch_at || 0) > new Date(x.last_ok_at))).length;

  const report = data.reports[0];
  const berlinHour = Number(new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "numeric", hour12: false }).format(new Date()));
  const since = firstVisit ? "in 24 Stunden" : `seit ${fmtWhen(seenBefore)}`;
  const news: { text: string; to: string }[] = [];
  if (d.fresh) news.push({ text: `${plural(d.fresh, "neue Meldung", "neue Meldungen")} ${since}`, to: "/news?new=1" });
  if (data.owner && d.changed) news.push({ text: `${plural(d.changed, "Behauptung", "Behauptungen")} geändert ${since}`, to: "/claims" });

  return (
    <Screen title="Lage" sub={`${fmtDay(data.now)} · Stand ${fmtTime(loadedAt || data.now)} Uhr`}
      right={<View style={{ flexDirection: "row", gap: 8 }}>
        <IconButton icon="search" label="Suchen" onPress={() => router.push("/search")} />
        <IconButton icon="ellipsis-horizontal" label="Mehr" onPress={() => router.push("/more")} />
      </View>}>

      {!data.owner ? <Banner icon="information-circle-outline" text="Offene Ausgabe: Rotes Meer, Messwerte und Satellitenbilder. Voller Zugang nach Freischaltung." /> : null}

      {/* Was ist neu seit dem letzten Öffnen; gestörte Quellen */}
      {news.length || (data.owner && broken) ? (
        <View style={{ gap: 6 }}>
          {news.map((n) => (
            <Pressable key={n.to} onPress={() => { tap(); router.navigate(`${n.to}${n.to.includes("?") ? "&" : "?"}k=${Date.now()}` as any); }} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 14, alignItems: "center" }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} /></View>
              <T v="smallStrong" color={t.accent} style={{ flex: 1 }}>{n.text}</T>
              <Ionicons name="chevron-forward" size={15} color={t.accent} />
            </Pressable>
          ))}
          {data.owner && broken ? (
            <Pressable onPress={() => { tap(); router.push("/sources"); }} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 14, alignItems: "center" }}><Ionicons name="alert-circle-outline" size={14} color={t.muted} /></View>
              <T v="caption" style={{ flex: 1 }}>{broken === 1 ? "1 Nachrichtenquelle gestört" : `${broken} Nachrichtenquellen gestört`}</T>
              <Ionicons name="chevron-forward" size={14} color={t.faint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Wichtig jetzt: eine Zeile je Hinweis */}
      {data.alerts.length ? (
        <>
          <Head title="Wichtig jetzt" />
          <Group style={{ borderLeftWidth: 4, borderLeftColor: t.warn }}>
            {data.alerts.map((a, i) => {
              const k = ALERT[a.kind];
              const src = a.source && !a.title.includes(a.source) ? ` · ${a.source}` : "";
              return <ListRow key={i} first={i === 0} icon={k?.icon || "alert-circle-outline"} tone="alert" label={a.title} sub={`${k?.label || "Hinweis"} · ${fmtWhen(a.t)}${src}`}
                onPress={k ? () => router.navigate(`${k.to}${k.to.includes("?") ? "&" : "?"}k=${Date.now()}` as any) : undefined} />;
            })}
          </Group>
        </>
      ) : null}

      {/* Die wichtigsten Geschichten */}
      <Head title={data.owner ? "Wichtigste Geschichten" : "Rotes Meer"} action="Alle Meldungen" onAction={() => router.navigate("/news")} />
      {d.top.length ? d.top.map((s, i) => (
        <View key={s.key} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}>
          <StoryCard s={s} seenBefore={seenBefore} />
        </View>
      )) : <T v="small">In den letzten 24 Stunden keine Meldungen aus unseren Quellen.</T>}

      {/* Messwerte: eine Zeile je Wert, Zahl rechts */}
      <Head title="Messwerte" action="Karte" onAction={() => router.navigate("/map")} />
      <Group>
        {signals.map((x, i) => <ListRow key={x.label} first={i === 0} icon={x.icon} label={x.label} hint={x.hint} value={x.value} tone={x.tone} onPress={() => router.push(x.to as any)} />)}
      </Group>

      {/* Weiter zu */}
      <Head title="Weiter zu" />
      <Group>
        {data.owner ? <ListRow first icon="document-text-outline" label="Tagesbericht"
          sub={report ? `${fmtIsoDay(report.report_date)}${report.report_date !== todayBerlin() && berlinHour >= 8 ? " · der heutige fehlt noch" : ""}` : "Der erste entsteht um 7:15 Uhr (deutsche Zeit)"}
          onPress={report ? () => router.push(`/report/${report.report_date}`) : undefined} /> : null}
        <ListRow first={!data.owner} icon="location-outline" label="Orte" sub="Asmara, Assab, Adigrat und mehr" onPress={() => router.push("/places")} />
      </Group>
    </Screen>
  );
}
