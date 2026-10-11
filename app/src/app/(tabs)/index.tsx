// Lage: das Wichtigste auf einen Blick, Eritrea zuerst.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { dedupe, ItemList, itemTime, Voices } from "../../components/items";
import { Banner, Button, Card, Empty, IconButton, openLink, Screen, SectionHead, StatusPill, T, tap } from "../../components/ui";
import { ago, fmtCapDay, fmtDay, fmtIsoDay, fmtWhen, num, plural } from "../../lib/de";
import { useData } from "../../lib/data";
import { BELES_URL, CLAUDE_PAGE, feedState, lastFailed, noData } from "../../lib/feeds";
import { radius, space, useTheme } from "../../lib/theme";

const KIND: Record<string, [string, string]> = {
  outage: ["Internet", "Gemessen"], maritime: ["Auf See", "Amtliche Meldung"], quake: ["Erdbeben", "Gemessen"], surge: ["Meldungen", "Zählung"],
};

export default function Lage() {
  const t = useTheme();
  const { data, loading, error, seenBefore, loadedAt, refresh } = useData();

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
    return { day, eritrea, fresh, changed, recentClaims, newestImg: imgs[0], redSea };
  }, [data, seenBefore]);

  if (!data) {
    return (
      <Screen title="Lage" refresh={false}>
        {loading ? <View style={{ paddingVertical: 60 }}><ActivityIndicator color={t.muted} /></View>
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
      {data.owner ? (
        <Card style={{ marginBottom: space.m, backgroundColor: t.cardAlt, borderWidth: 0 }}>
          <T v="label" color={t.muted}>Seit deinem letzten Besuch ({ago(seenBefore)})</T>
          {d.fresh.length || d.changed.length ? (
            <View style={{ flexDirection: "row", gap: space.l, marginTop: 8, flexWrap: "wrap" }}>
              <Pressable onPress={() => { tap(); router.push("/news?new=1"); }} accessibilityRole="button">
                <T v="h2">{num(d.fresh.length)}</T><T v="small">{d.fresh.length === 1 ? "neue Meldung" : "neue Meldungen"}</T>
              </Pressable>
              <Pressable onPress={() => { tap(); router.push("/claims"); }} accessibilityRole="button">
                <T v="h2">{num(d.changed.length)}</T><T v="small">{d.changed.length === 1 ? "Behauptung geändert" : "Behauptungen geändert"}</T>
              </Pressable>
            </View>
          ) : <T v="body" style={{ marginTop: 6 }}>Nichts Neues.</T>}
        </Card>
      ) : null}

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

      {/* Eritrea */}
      {data.owner ? (
        <>
          <SectionHead title="Eritrea" action="Alle" onAction={() => router.push("/news?region=eritrea")}
            sub={d.eritrea.length ? `${plural(d.eritrea.length, "Meldung", "Meldungen")} in 24 Stunden. Meldungen sind keine geprüften Tatsachen.` : undefined} />
          {d.eritrea.length ? (
            <Card style={{ paddingVertical: space.s }}>
              <View style={{ paddingVertical: space.s }}><Voices items={d.eritrea} /></View>
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.rule, marginVertical: 4 }} />
              <ItemList items={d.eritrea} seenBefore={seenBefore} limit={5} />
            </Card>
          ) : <Card><T v="small">Keine Meldungen zu Eritrea in den letzten 24 Stunden aus unseren Quellen. Das ist häufig: Aus dem Land dringen kaum unabhängige Nachrichten.</T></Card>}
        </>
      ) : (
        <>
          <SectionHead title="Rotes Meer" action="Alle" onAction={() => router.push("/news")} />
          {d.redSea.length ? <Card style={{ paddingVertical: space.s }}><ItemList items={d.redSea} limit={5} /></Card>
            : <Card><T v="small">Keine Meldungen zum Roten Meer in den letzten 24 Stunden.</T></Card>}
        </>
      )}

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
