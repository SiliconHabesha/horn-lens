// Tagesbericht: was in den 24 Stunden bis 7 Uhr gemeldet und gemessen wurde.
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { dedupe, ItemList } from "../../components/items";
import { Card, Chip, ChipRow, Empty, openLink, Screen, StatusPill, T, tap } from "../../components/ui";
import { de, fmtFull, fmtIsoDay, fmtTime, num, REGION_ORDER, REGIONS } from "../../lib/de";
import { loadReport, useData } from "../../lib/data";
import { CLAUDE_PAGE } from "../../lib/feeds";
import { space, useTheme } from "../../lib/theme";
import type { Report } from "../../lib/types";

export default function ReportScreen() {
  const t = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { data } = useData();
  const [rep, setRep] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let live = true; setBusy(true); setErr(null);
    loadReport(String(date)).then((r) => { if (live) { setRep(r); setBusy(false); } })
      .catch((e) => { if (live) { setErr(de(String(e?.message || e))); setBusy(false); } });
    return () => { live = false; };
  }, [date]);
  const reps = data?.reports || [];
  const p = rep?.payload || {};
  const sg = p.signals || {};
  const regions = Object.fromEntries((p.regions || []).map((r) => [r.region, dedupe(r.items || [])]));
  return (
    <Screen refresh={false} topInset={false}>
      <Stack.Screen options={{ title: rep ? fmtIsoDay(rep.report_date, { weekday: "short", day: "numeric", month: "short" }) : "Tagesbericht" }} />
      <ChipRow>
        {reps.slice(0, 14).map((r) => <Chip key={r.report_date} label={fmtIsoDay(r.report_date, { weekday: "short", day: "numeric", month: "short" })}
          active={r.report_date === date} onPress={() => router.setParams({ date: r.report_date })} />)}
      </ChipRow>
      {busy ? <View style={{ paddingVertical: 60 }}><ActivityIndicator color={t.muted} /></View>
        : err ? <Empty icon="alert-circle-outline" text={`Der Tagesbericht konnte nicht geladen werden (${err}).`} />
        : !rep ? <Empty text="Für dieses Datum gibt es keinen Tagesbericht." /> : (
        <>
          <T v="title" style={{ marginTop: space.l }}>Tagesbericht, {fmtIsoDay(rep.report_date)}</T>
          <T v="small" style={{ marginTop: 4 }}>Erstellt um {fmtTime(rep.generated_at)} Uhr aus den 24 Stunden davor, dazu spät eingetroffene Meldungen.</T>

          {rep.summary?.sentences?.length ? (
            <Card style={{ marginTop: space.l, gap: 8 }}>
              <T v="h3">Zusammenfassung</T>
              {rep.summary.sentences.map((s: any, i: number) => (
                <T key={i} v="body">{s.text}{" "}
                  {(s.cites || []).map((c: any, j: number) => (
                    <T key={j} v="caption" color={t.accent} onPress={() => openLink(c.url)} accessibilityRole="link">[{c.n} · {c.outlet}] </T>
                  ))}
                </T>
              ))}
              <T v="caption">Von Claude aus den Schlagzeilen dieses Berichts geschrieben. Kann Fehler enthalten; bitte die Meldungen selbst öffnen.</T>
            </Card>
          ) : (
            <Card style={{ marginTop: space.l }} onPress={() => openLink(CLAUDE_PAGE)}>
              <T v="h3">Noch keine Zusammenfassung</T>
              <T v="small" style={{ marginTop: 4 }}>In Claude kannst du diesen Bericht zusammenfassen lassen und speichern. Dann erscheint die Zusammenfassung auch hier. Tippen öffnet Claude.</T>
            </Card>
          )}

          <T v="h2" style={{ marginTop: space.xl }}>Damals gemessen</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s, marginTop: space.s }}>
            {[[sg.fires_24h, sg.fires_24h === 1 ? "Hitzepunkt, 24 Std." : "Hitzepunkte, 24 Std."], [sg.outages_48h, sg.outages_48h === 1 ? "Internet-Warnung, 48 Std." : "Internet-Warnungen, 48 Std."],
              [sg.maritime_30d, sg.maritime_30d === 1 ? "Vorfall auf See, 30 Tage" : "Vorfälle auf See, 30 Tage"], [sg.quakes_7d, "Erdbeben ab Stärke 2,5, 7 Tage"]]
              .map(([n, l], i) => (
                <Card key={i} style={{ flexBasis: "47%", flexGrow: 1, padding: space.m }}>
                  <T v="h2">{num(Number(n ?? 0))}</T><T v="caption">{l as string}</T>
                </Card>
              ))}
          </View>

          <T v="h2" style={{ marginTop: space.xl }}>Geänderte Behauptungen</T>
          {(p.changes || []).length ? (p.changes || []).map((c: any, i: number) => (
            <Card key={i} style={{ marginTop: space.s }}>
              <StatusPill status={c.status} small />
              <T v="bodyStrong" style={{ marginTop: 6 }}>{c.statement}</T>
              <T v="small" style={{ marginTop: 4 }}>{fmtFull(c.at)}. {c.note}</T>
              {c.source_url ? <Pressable onPress={() => { tap(); openLink(c.source_url); }}><T v="caption" color={t.accent}>{c.source_title || "Quelle"} ↗</T></Pressable> : null}
            </Card>
          )) : <T v="small" style={{ marginTop: space.s }}>In diesem Zeitraum hat keine Behauptung ihren Status geändert.</T>}

          {(p.alerts || []).length ? (
            <>
              <T v="h2" style={{ marginTop: space.xl }}>Damalige Hinweise</T>
              {(p.alerts || []).map((a, i) => (
                <Card key={i} style={{ marginTop: space.s }}>
                  <T v="bodyStrong">{a.title}</T>
                  <T v="small">{fmtFull(a.t)}. {a.note || ""}</T>
                </Card>
              ))}
            </>
          ) : null}

          {REGION_ORDER.filter((r) => (regions[r] || []).length).map((r) => (
            <View key={r}>
              <T v="h2" style={{ marginTop: space.xl }}>{REGIONS[r]}</T>
              <Card style={{ marginTop: space.s, paddingVertical: space.s }}><ItemList items={regions[r]} limit={30} /></Card>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
