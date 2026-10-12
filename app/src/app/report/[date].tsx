// Tagesbericht: was in den 24 Stunden bis 7 Uhr gemeldet und gemessen wurde. Blättern, teilen, auch ohne Netz (letzte sieben).
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, Share, StyleSheet, View } from "react-native";
import { dedupe, ItemRow } from "../../components/items";
import { toast } from "../../components/Toast";
import { Banner, Card, Empty, Group, Head, ListRow, openLink, Screen, StatusPill, T, tap } from "../../components/ui";
import { de, fmtFull, fmtIsoDay, num, REGION_ORDER, REGIONS, STATUS, STATUS_ORDER } from "../../lib/de";
import { loadReport, useData } from "../../lib/data";
import { t as tr } from "../../lib/i18n";
import { Skeleton } from "../../components/Skeleton";
import { CLAUDE_PAGE } from "../../lib/feeds";
import { radius, space, useTheme } from "../../lib/theme";
import type { Item, Report } from "../../lib/types";

const KIND_ICON: Record<string, string> = { outage: "wifi-outline", maritime: "boat-outline", quake: "pulse-outline", surge: "newspaper-outline" };
const KIND: Record<string, string> = { outage: "Internetverbindung", maritime: "Vorfall auf See", quake: "Erdbeben", surge: "Viele Meldungen" };

// Klartext zum Teilen: Zusammenfassung mit Quellen, Messwerte, wichtigste Schlagzeilen
function digest(rep: Report, regions: Record<string, Item[]>) {
  const p = rep.payload || {}, sg: any = p.signals || {};
  const lines = [tr("Semay – Tagesbericht {day}", { day: fmtIsoDay(rep.report_date) }), ""];
  for (const s of rep.summary?.sentences || []) lines.push(`${s.text}${(s.cites || []).length ? ` (${(s.cites || []).map((c: any) => c.outlet).join(", ")})` : ""}`);
  if ((rep.summary?.sentences || []).length) lines.push("");
  const m = [["Hitzepunkte (24 Std.)", sg.fires_24h], ["Auffälligkeiten Internet (48 Std.)", sg.outages_48h], ["Vorfälle auf See (30 Tage)", sg.maritime_30d], ["Erdbeben (7 Tage)", sg.quakes_7d]]
    .filter(([, n]) => n != null).map(([l, n]) => `${tr(l as string)}: ${num(Number(n))}`);
  if (m.length) lines.push(tr("Gemessen: {list}", { list: m.join(" · ") }), "");
  for (const r of REGION_ORDER) {
    const list = regions[r] || [];
    if (!list.length) continue;
    lines.push(`${REGIONS[r]}:`);
    for (const it of list.slice(0, 3)) lines.push(`– ${it.title} (${it.origin_domain || it.source_name}) ${it.url}`);
    lines.push("");
  }
  lines.push(tr("Meldungen sind keine geprüften Tatsachen."));
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
  const [tries, setTries] = useState(0);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(String(date)) && !isNaN(new Date(`${date}T12:00:00Z`).getTime());
  useEffect(() => {
    if (!valid) { setBusy(false); return; }
    let live = true; setBusy(true); setErr(null); setOpen({});
    loadReport(String(date)).then((r) => { if (live) { setRep(r as any); setBusy(false); } })
      .catch((e) => { if (live) { setErr(de(String(e?.message || e))); setBusy(false); } });
    return () => { live = false; };
  }, [date, valid, tries]);
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
      if (Platform.OS === "web") { await navigator.clipboard.writeText(text); toast(tr("Bericht als Text kopiert"), "copy-outline"); }
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

  if (!valid) return <Screen refresh={false} topInset={false}><Stack.Screen options={{ title: tr("Tagesbericht") }} /><Empty text={tr("Diesen Tagesbericht gibt es nicht. Alle Berichte stehen in der Lage unter „Tagesbericht“.")} /></Screen>;
  return (
    <Screen refresh={false} topInset={false}>
      <Stack.Screen options={{ title: tr("Tagesbericht"), headerRight: () => rep ? (
        <Pressable onPress={share} accessibilityRole="button" accessibilityLabel={tr("Bericht teilen")} hitSlop={10} style={{ paddingHorizontal: 6 }}>
          <Ionicons name={Platform.OS === "ios" ? "share-outline" : "share-social-outline"} size={22} color={t.ink} />
        </Pressable>) : null }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
        {step(older, "chevron-back", tr("Früherer Bericht"))}
        <View style={{ flex: 1, alignItems: "center" }}>
          <T v="h3">{fmtIsoDay(String(date))}</T>
          {idx === 0 ? <T v="caption">{tr("neuester Bericht")}</T> : null}
        </View>
        {step(newer, "chevron-forward", tr("Späterer Bericht"))}
      </View>

      {busy ? <View style={{ marginTop: space.l }}><Skeleton rows={6} /></View>
        : err ? (
          <View style={{ marginTop: space.l }}>
            <Banner icon="alert-circle-outline" tone="warn" text={tr("Der Tagesbericht konnte nicht geladen werden. Bitte Verbindung prüfen.")} action={tr("Erneut versuchen")} onAction={() => setTries(tries + 1)} />
          </View>
        )
        : !rep ? <Empty text={tr("Für dieses Datum gibt es keinen Tagesbericht.")} /> : (
        <>
          {rep._offline ? <View style={{ marginTop: space.m }}><Banner icon="cloud-offline-outline" tone="warn" text={tr("Ohne Verbindung: gespeicherte Fassung dieses Berichts.")} /></View> : null}

          {rep.summary?.sentences?.length ? (
            <Card style={{ marginTop: space.l, gap: 8 }}>
              <T v="h3">{tr("Zusammenfassung")}</T>
              {rep.summary.sentences.map((s: any, i: number) => (
                <T key={i} v="body">{s.text}{" "}
                  {(s.cites || []).map((c: any, j: number) => (
                    <T key={j} v="caption" color={t.accent} onPress={() => openLink(c.url)} accessibilityRole="link">[{c.n} · {c.outlet}] </T>
                  ))}
                </T>
              ))}
              <T v="caption">{tr("Automatisch erstellt, kann Fehler enthalten.")}</T>
            </Card>
          ) : (
            <Group style={{ marginTop: space.l }}><ListRow first icon="sparkles-outline" label={tr("Zusammenfassung in Claude erstellen")} external onPress={() => openLink(CLAUDE_PAGE)} /></Group>
          )}

          <Head title={tr("Messwerte")} />
          <Group>
            {[["flame-outline", "Hitzepunkte", "24 Std.", sg.fires_24h], ["wifi-outline", "Auffälligkeiten Internet", "48 Std.", sg.outages_48h],
              ["boat-outline", "Vorfälle auf See", "30 Tage", sg.maritime_30d], ["pulse-outline", "Erdbeben", "7 Tage", sg.quakes_7d]].map(([icon, label, hint, n], i) => (
              <ListRow key={label as string} first={i === 0} icon={icon as any} label={tr(label as string)} hint={tr(hint as string)} value={n == null ? "–" : num(Number(n))} tone={n == null ? "none" : undefined} />
            ))}
          </Group>
          {down.length ? <T v="caption" style={{ marginTop: space.s }}>{tr("Damals nicht erreichbar: {list}. Fehlende Meldungen aus diesen Quellen sind kein Zeichen für Ruhe.", { list: down.length > 8 ? tr("{list} und {n} weitere", { list: down.slice(0, 8).join(", "), n: down.length - 8 }) : down.slice(0, 8).join(", ") })}</T> : null}

          <Head title={tr("Geänderte Behauptungen")} />
          {(p.changes || []).length ? (p.changes || []).map((c: any, i: number) => {
            const known = c.claim_id && data?.claims.some((x) => x.id === c.claim_id);
            return (
              <Pressable key={i} onPress={known ? () => { tap(); router.push(`/claim/${c.claim_id}`); } : undefined} accessibilityRole={known ? "button" : "text"} accessibilityLabel={c.statement}
                style={({ pressed }) => ({ paddingVertical: 12, gap: 4, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: t.rule, opacity: pressed && known ? 0.6 : 1 })}>
                <StatusPill status={c.status} small />
                <T v="body" color={t.ink}>{c.statement}</T>
                <T v="caption">{fmtFull(c.at)}{c.source_title ? ` · ${c.source_title}` : ""}</T>
              </Pressable>
            );
          }) : <T v="small">{tr("Keine Behauptung hat ihre Stufe geändert.")}</T>}

          {claimSnap.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: space.m, alignItems: "center" }}>
              <T v="caption">{tr("Stand aller Behauptungen damals:")}</T>
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
              <Head title={tr("Damalige Hinweise")} />
              <Group>
                {(p.alerts || []).map((a, i) => <ListRow key={i} first={i === 0} icon={(KIND_ICON[a.kind] || "alert-circle-outline") as any} label={a.title} sub={`${tr(KIND[a.kind] || "Hinweis")} · ${fmtFull(a.t)}`}
                  external={!!a.url} onPress={a.url ? () => openLink(a.url) : undefined} />)}
              </Group>
            </>
          ) : null}

          {REGION_ORDER.filter((r) => (regions[r] || []).length).map((r) => {
            const list = regions[r];
            const all = open[r] || list.length <= 8;
            return (
              <View key={r}>
                <Head title={REGIONS[r]} count={list.length} />
                {(all ? list : list.slice(0, 6)).map((it, i) => (
                  <View key={it.id} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.rule } : undefined}><ItemRow it={it} /></View>
                ))}
                {!all ? (
                  <Pressable onPress={() => { tap(); setOpen({ ...open, [r]: true }); }} accessibilityRole="button" hitSlop={6}
                    style={({ pressed }) => ({ marginTop: 4, paddingVertical: 10, paddingHorizontal: 14, alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: t.card,
                      borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, opacity: pressed ? 0.6 : 1 })}>
                    <T v="smallStrong">{tr("Alle {n} anzeigen", { n: list.length })}</T>
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
