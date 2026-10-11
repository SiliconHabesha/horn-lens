// Tagesbericht: was in den 24 Stunden bis 7 Uhr gemeldet und gemessen wurde. Blättern, teilen, auch ohne Netz (letzte sieben).
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, View } from "react-native";
import { dedupe, ItemRow } from "../../components/items";
import { toast } from "../../components/Toast";
import { Banner, Card, Empty, openLink, Screen, StatusPill, T, tap } from "../../components/ui";
import { de, fmtFull, fmtIsoDay, fmtTime, num, REGION_ORDER, REGIONS, STATUS, STATUS_ORDER } from "../../lib/de";
import { loadReport, useData } from "../../lib/data";
import { CLAUDE_PAGE } from "../../lib/feeds";
import { radius, space, useTheme } from "../../lib/theme";
import type { Item, Report } from "../../lib/types";

const KIND: Record<string, string> = { outage: "Internet", maritime: "Auf See", quake: "Erdbeben", surge: "Meldungen" };

// Klartext zum Teilen: Zusammenfassung mit Quellen, Messwerte, wichtigste Schlagzeilen
function digest(rep: Report, regions: Record<string, Item[]>) {
  const p = rep.payload || {}, sg: any = p.signals || {};
  const lines = [`Horn Lens – Tagesbericht ${fmtIsoDay(rep.report_date)}`, ""];
  for (const s of rep.summary?.sentences || []) lines.push(`${s.text}${(s.cites || []).length ? ` (${(s.cites || []).map((c: any) => c.outlet).join(", ")})` : ""}`);
  if ((rep.summary?.sentences || []).length) lines.push("");
  const m = [["Hitzepunkte (24 Std.)", sg.fires_24h], ["Internet-Warnungen (48 Std.)", sg.outages_48h], ["Vorfälle auf See (30 Tage)", sg.maritime_30d], ["Erdbeben (7 Tage)", sg.quakes_7d]]
    .filter(([, n]) => n != null).map(([l, n]) => `${l}: ${num(Number(n))}`);
  if (m.length) lines.push(`Gemessen: ${m.join(" · ")}`, "");
  for (const r of REGION_ORDER) {
    const list = regions[r] || [];
    if (!list.length) continue;
    lines.push(`${REGIONS[r]}:`);
    for (const it of list.slice(0, 3)) lines.push(`– ${it.title} (${it.origin_domain || it.source_name}) ${it.url}`);
    lines.push("");
  }
  lines.push("Meldungen sind keine geprüften Tatsachen.");
  return lines.join("\n");
}

export default function ReportScreen() {
  const t = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { data } = useData();
  const [rep, setRep] = useState<(Report & { _offline?: boolean }) | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let live = true; setBusy(true); setErr(null); setOpen({});
    loadReport(String(date)).then((r) => { if (live) { setRep(r as any); setBusy(false); } })
      .catch((e) => { if (live) { setErr(de(String(e?.message || e))); setBusy(false); } });
    return () => { live = false; };
  }, [date]);
  const reps = data?.reports || [];
  const idx = reps.findIndex((r) => r.report_date === date);
  const older = idx >= 0 ? reps[idx + 1] : undefined, newer = idx > 0 ? reps[idx - 1] : undefined;
  const p = rep?.payload || {};
  const sg: any = p.signals || {};
  const regions: Record<string, Item[]> = Object.fromEntries((p.regions || []).map((r) => [r.region, dedupe(r.items || [])]));
  // Quellen, die zum Berichtszeitpunkt nicht erreichbar waren (24 Std. ohne Erfolg)
  const down: string[] = rep ? ((p as any).sources || []).filter((s: any) => !s.last_ok_at || new Date(rep.generated_at).getTime() - new Date(s.last_ok_at).getTime() > 24 * 3600e3)
    .map((s: any) => de(s.name)) : [];
  const claimSnap: any[] = (p as any).claims || [];
  const share = async () => {
    if (!rep) return;
    tap();
    const text = digest(rep, regions);
    try {
      if (Platform.OS === "web") { await navigator.clipboard.writeText(text); toast("Bericht als Text kopiert", "copy-outline"); }
      else await Share.share({ message: text });
    } catch { /* abgebrochen */ }
  };
  const step = (r?: { report_date: string }, icon: keyof typeof Ionicons.glyphMap = "chevron-back", label = "") => (
    <Pressable disabled={!r} onPress={() => { tap(); if (r) router.setParams({ date: r.report_date }); }} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !r }} hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: t.card,
        borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: !r ? 0.35 : pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={20} color={t.ink} />
    </Pressable>
  );
  const sig = (n: any, one: string, many: string) => ({ big: n == null ? "–" : num(Number(n)), label: n == null ? `${many}: nicht erfasst` : Number(n) === 1 ? one : many });

  return (
    <Screen refresh={false} topInset={false}>
      <Stack.Screen options={{ title: "Tagesbericht", headerRight: () => rep ? (
        <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="Bericht teilen" hitSlop={10} style={{ paddingHorizontal: 6 }}>
          <Ionicons name={Platform.OS === "ios" ? "share-outline" : "share-social-outline"} size={22} color={t.ink} />
        </Pressable>) : null }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
        {step(older, "chevron-back", "Früherer Bericht")}
        <View style={{ flex: 1, alignItems: "center" }}>
          <T v="h3">{fmtIsoDay(String(date))}</T>
          {idx === 0 ? <T v="caption">neuester Bericht</T> : null}
        </View>
        {step(newer, "chevron-forward", "Späterer Bericht")}
      </View>

      {busy ? <View style={{ paddingVertical: 60 }}><ActivityIndicator color={t.muted} /></View>
        : err ? <Empty icon="alert-circle-outline" text={`Der Tagesbericht konnte nicht geladen werden (${err}).`} />
        : !rep ? <Empty text="Für dieses Datum gibt es keinen Tagesbericht." /> : (
        <>
          {rep._offline ? <View style={{ marginTop: space.m }}><Banner icon="cloud-offline-outline" tone="warn" text="Ohne Verbindung: gespeicherte Fassung dieses Berichts." /></View> : null}
          <T v="small" style={{ marginTop: space.m }}>Erstellt um {fmtTime(rep.generated_at)} Uhr aus den 24 Stunden davor, dazu spät eingetroffene Meldungen.</T>

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
            {[sig(sg.fires_24h, "Hitzepunkt, 24 Std.", "Hitzepunkte, 24 Std."), sig(sg.outages_48h, "Internet-Warnung, 48 Std.", "Internet-Warnungen, 48 Std."),
              sig(sg.maritime_30d, "Vorfall auf See, 30 Tage", "Vorfälle auf See, 30 Tage"), sig(sg.quakes_7d, "Erdbeben ab Stärke 2,5, 7 Tage", "Erdbeben ab Stärke 2,5, 7 Tage")]
              .map((x, i) => (
                <Card key={i} style={{ flexBasis: "45%", flexGrow: 1, padding: space.m }}>
                  <T v="h2" tabular color={x.big === "–" ? t.muted : t.ink}>{x.big}</T><T v="caption">{x.label}</T>
                </Card>
              ))}
          </View>
          {down.length ? <T v="caption" style={{ marginTop: space.s }}>Damals nicht erreichbar: {down.slice(0, 8).join(", ")}{down.length > 8 ? ` und ${down.length - 8} weitere` : ""}. Fehlende Meldungen aus diesen Quellen sind kein Zeichen für Ruhe.</T> : null}

          <T v="h2" style={{ marginTop: space.xl }}>Geänderte Behauptungen</T>
          {(p.changes || []).length ? (p.changes || []).map((c: any, i: number) => {
            const known = c.claim_id && data?.claims.some((x) => x.id === c.claim_id);
            return (
              <Card key={i} style={{ marginTop: space.s }} onPress={known ? () => router.push(`/claim/${c.claim_id}`) : undefined} accessibilityLabel={c.statement}>
                <StatusPill status={c.status} small />
                <T v="bodyStrong" style={{ marginTop: 6 }}>{c.statement}</T>
                <T v="small" style={{ marginTop: 4 }}>{fmtFull(c.at)}. {c.note}</T>
                {c.source_url ? <Pressable onPress={() => { tap(); openLink(c.source_url); }} hitSlop={6}><T v="caption" color={t.accent} style={{ marginTop: 4 }}>{c.source_title || "Quelle"} ↗</T></Pressable> : null}
              </Card>
            );
          }) : <T v="small" style={{ marginTop: space.s }}>In diesem Zeitraum hat keine Behauptung ihre Stufe geändert.</T>}

          {claimSnap.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: space.m, alignItems: "center" }}>
              <T v="caption">Stand aller Behauptungen damals:</T>
              {STATUS_ORDER.filter((k) => claimSnap.some((c) => c.status === k)).map((k) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.status[k] }} />
                  <T v="caption" color={t.ink}>{claimSnap.filter((c) => c.status === k).length} {STATUS[k][0]}</T>
                </View>
              ))}
            </View>
          ) : null}

          {(p.alerts || []).length ? (
            <>
              <T v="h2" style={{ marginTop: space.xl }}>Damalige Hinweise</T>
              {(p.alerts || []).map((a, i) => (
                <Card key={i} style={{ marginTop: space.s, borderLeftWidth: 4, borderLeftColor: t.warn }} onPress={a.url ? () => openLink(a.url) : undefined} accessibilityLabel={a.title}>
                  <T v="label" color={t.warn}>{KIND[a.kind] || "Hinweis"} · {fmtFull(a.t)}</T>
                  <T v="bodyStrong" style={{ marginTop: 2 }}>{a.title}</T>
                  {a.note ? <T v="small" style={{ marginTop: 2 }}>{a.note}</T> : null}
                </Card>
              ))}
            </>
          ) : null}

          {REGION_ORDER.filter((r) => (regions[r] || []).length).map((r) => {
            const list = regions[r];
            const all = open[r] || list.length <= 8;
            return (
              <View key={r}>
                <T v="h2" style={{ marginTop: space.xl }}>{REGIONS[r]} <T v="caption">{list.length}</T></T>
                {(all ? list : list.slice(0, 6)).map((it, i) => (
                  <View key={it.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}><ItemRow it={it} /></View>
                ))}
                {!all ? (
                  <Pressable onPress={() => { tap(); setOpen({ ...open, [r]: true }); }} accessibilityRole="button" hitSlop={6}
                    style={({ pressed }) => ({ marginTop: 4, paddingVertical: 10, paddingHorizontal: 14, alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: t.card,
                      borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                    <T v="smallStrong">Alle {list.length} anzeigen</T>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}
