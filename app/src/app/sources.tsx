// Quellen: Zustand aller Quellen auf einen Blick, das Quellenregister (wer, welche Art, Sprache, Schwerpunkt, Grenzen)
// und das Abruf-Protokoll der letzten 24 Stunden. Dazu abgeschaltete und noch nicht eingerichtete Quellen mit Grund.
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Card, Chip, Divider, openLink, Screen, T, tap } from "../components/ui";
import { ago, fmtFull, num, REGIONS, TYPE_NOTE, TYPE_ORDER, TYPES } from "../lib/de";
import { t as tr } from "../lib/i18n";
import { useData } from "../lib/data";
import { Skeleton } from "../components/Skeleton";
import { NOT_SET_UP, sourceState, STATE_LABEL, STATE_NOTE, type SourceStateKey } from "../lib/feeds";
import { VOICE_TYPES } from "../lib/stories";
import { sideLabel, sideOf } from "../lib/assess";
import { space, useTheme } from "../lib/theme";
import type { Source } from "../lib/types";

const ORIGIN: Record<string, string> = { primary: "Eigene Berichte", secondary: "Fasst Berichte anderer zusammen", index: "Automatische Nachrichtensuche", measurement: "Messung" };
const LANG: Record<string, string> = { en: "Englisch", ti: "Tigrinya", am: "Amharisch", ar: "Arabisch", mixed: "Mehrsprachig", fr: "Französisch" };
const STATE_ORDER: SourceStateKey[] = ["failed", "access", "stale", "never", "empty", "current"];

export default function Sources() {
  const t = useTheme();
  const { data } = useData();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<SourceStateKey | null>(null);
  const sources = data?.sources || [];
  const stateOf = useMemo(() => new Map(sources.map((s) => [s.id, sourceState(s)])), [sources]);
  const counts = useMemo(() => { const c: Partial<Record<SourceStateKey, number>> = {}; for (const k of stateOf.values()) c[k] = (c[k] || 0) + 1; return c; }, [stateOf]);
  const tone = (k: SourceStateKey) => (k === "failed" || k === "access" ? t.warn : k === "stale" || k === "never" ? t.status.unverified : k === "empty" ? t.muted : t.status.supported);
  const rank = (s: Source) => STATE_ORDER.indexOf(stateOf.get(s.id) || "current");
  const shown = sources.filter((s) => !filter || stateOf.get(s.id) === filter);
  const groups = TYPE_ORDER.map((k) => [k, shown.filter((s) => s.source_type === k).sort((a, b) => rank(a) - rank(b))] as const).filter(([, l]) => l.length);
  const runs = sources.reduce((m, s) => ({ n: m.n + (s.runs?.n || 0), failed: m.failed + (s.runs?.failed || 0), new: m.new + (s.runs?.new || 0), dupes: m.dupes + (s.runs?.dupes || 0) }), { n: 0, failed: 0, new: 0, dupes: 0 });
  const ok = (counts.current || 0) + (counts.empty || 0);
  if (!data) return <Screen topInset={false} refresh={false}><Skeleton rows={6} /></Screen>;
  return (
    <Screen topInset={false}>
      <Card style={{ marginBottom: space.m, gap: 4 }}>
        <T v="h3">{tr("{ok} von {total} Quellen aktuell", { ok, total: sources.length })}</T>
        <T v="small">{runs.n ? tr("In 24 Stunden {runs} Abrufe, davon {failed} gescheitert. {fresh} neue Meldungen gespeichert, {dupes} schon vorhandene übersprungen.", { runs: num(runs.n), failed: num(runs.failed), fresh: num(runs.new), dupes: num(runs.dupes) })
          : tr("Das Abruf-Protokoll hat noch keine Einträge aus den letzten 24 Stunden.")}</T>
      </Card>
      {/* Zustände als Filter */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: space.l }}>
        <Chip label={tr("Alle")} count={sources.length} active={!filter} onPress={() => setFilter(null)} />
        {STATE_ORDER.filter((k) => counts[k]).map((k) => <Chip key={k} label={tr(STATE_LABEL[k])} count={counts[k]} color={tone(k)} active={filter === k} onPress={() => setFilter(filter === k ? null : k)} />)}
      </View>
      {filter ? <T v="small" style={{ marginTop: -space.s, marginBottom: space.l }}>{tr(STATE_NOTE[filter])}</T> : null}

      {/* Abdeckung: welche Seite ist mit wie vielen erreichbaren Quellen vertreten, wo fehlt eine */}
      {!filter ? (
        <>
          <T v="h3" style={{ marginBottom: space.s }}>{tr("Welche Seiten wir hören")}</T>
          <Card style={{ marginBottom: space.l, paddingVertical: 4 }}>
            {VOICE_TYPES.map((k, i) => {
              const all = sources.filter((x) => x.source_type === k), n = all.filter((x) => ["current", "empty", "stale"].includes(stateOf.get(x.id) || "")).length;
              return (
                <View key={k}>
                  {i ? <Divider /> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 }}>
                    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.type[k] }} />
                    <T v="small" color={t.ink} style={{ flex: 1 }}>{TYPES[k]}</T>
                    <T v="caption" color={!n ? t.warn : undefined}>{!all.length ? tr("keine Quelle") : !n ? tr("keine erreichbar") : n === all.length ? (n === 1 ? tr("1 Quelle") : tr("{n} Quellen", { n })) : tr("{ok} von {total} erreichbar", { ok: n, total: all.length })}</T>
                  </View>
                </View>
              );
            })}
          </Card>
          <T v="small" style={{ marginBottom: space.l }}>{tr("Wo eine Seite fehlt, kann Semay sie nicht zeigen. Fehlt sie in einer Geschichte, heißt das nicht, dass sie schweigt. Wir suchen nach frei abrufbaren Quellen und umgehen keine Sperren.")}</T>
        </>
      ) : null}

      <T v="small" style={{ marginBottom: space.m }}>{tr("Jede Quelle ist nach Art eingeordnet, damit du Meldungen gewichten kannst. Antippen zeigt das Register: Herausgeber, Sprache, Schwerpunkt, bekannte Grenzen und den letzten Abruf.")}</T>
      {groups.map(([k, list]) => (
        <View key={k} style={{ marginBottom: space.l }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.type[k] }} />
            <T v="label" color={t.type[k]}>{TYPES[k]}</T>
          </View>
          <T v="caption" style={{ marginBottom: space.s }}>{TYPE_NOTE[k]}</T>
          <Card style={{ paddingVertical: 4 }}>
            {list.map((s, i) => {
              const st = stateOf.get(s.id) || "current";
              const isOpen = open === s.id;
              return (
                <View key={s.id}>
                  {i ? <Divider /> : null}
                  <Pressable onPress={() => { tap(); setOpen(isOpen ? null : s.id); }} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={`${s.name}. ${tr(STATE_LABEL[st])}`} style={({ pressed }) => ({ paddingVertical: 10, gap: 3, opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <T v="bodyStrong" color={t.ink} style={{ flex: 1 }}>{s.name}</T>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone(st) }} />
                      <T v="caption" color={tone(st)}>{tr(STATE_LABEL[st])}</T>
                      <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={14} color={t.faint} />
                    </View>
                    <T v="caption">{s.last_ok_at ? tr("Letzter Erfolg {ago}", { ago: ago(s.last_ok_at) }) : tr("Bisher nie erfolgreich")}
                      {st === "failed" || st === "access" ? ` · ${tr("Fehler: {error}", { error: s.last_error || "?" })}` : ""}</T>
                  </Pressable>
                  {isOpen ? <Register s={s} /> : null}
                </View>
              );
            })}
          </Card>
        </View>
      ))}

      {/* Abgeschaltet und nicht eingerichtet: damit „nichts gefunden“ nicht mit „nicht gefragt“ verwechselt wird */}
      <T v="h3" style={{ marginTop: space.m, marginBottom: space.s }}>{tr("Abgeschaltet oder noch nicht eingerichtet")}</T>
      <Card style={{ paddingVertical: 4, marginBottom: space.l }}>
        {[...(data.sourcesOff || []).map((s) => ({ key: s.id, name: s.name, state: "off" as SourceStateKey, note: s.stance_note || "", url: s.homepage })),
          ...NOT_SET_UP.map((s) => ({ key: s.id, name: s.name, state: "notset" as SourceStateKey, note: tr(s.note), url: s.url }))].map((s, i) => (
          <View key={s.key}>
            {i ? <Divider /> : null}
            <View style={{ paddingVertical: 10, gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <T v="bodyStrong" color={t.ink} style={{ flex: 1 }} onPress={s.url ? () => openLink(s.url!) : undefined}>{s.name}{s.url ? " ↗" : ""}</T>
                <T v="caption">{tr(STATE_LABEL[s.state])}</T>
              </View>
              {s.note ? <T v="small">{s.note}</T> : null}
            </View>
          </View>
        ))}
      </Card>
      <T v="caption">{tr("Zustände: {list}", { list: (["current", "empty", "stale", "failed", "access", "never", "off", "notset"] as SourceStateKey[]).map((k) => `${tr(STATE_LABEL[k])}: ${tr(STATE_NOTE[k])}`).join(" ") })}</T>
    </Screen>
  );
}

/** Quellenregister: alles, was Semay über eine Quelle weiß, und ihr letzter Abruf */
function Register({ s }: { s: Source }) {
  const t = useTheme();
  const r = s.last_run;
  const row = (label: string, value: React.ReactNode) => (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <T v="caption" style={{ width: 118 }}>{label}</T>
      <T v="small" color={t.ink} style={{ flex: 1 }}>{value}</T>
    </View>
  );
  return (
    <View style={{ gap: 6, paddingBottom: space.m }}>
      {s.stance_note ? <T v="small">{s.stance_note}</T> : null}
      {s.publisher ? row(tr("Herausgeber"), s.publisher) : null}
      {s.kind === "rss" ? row(tr("Seite im Konflikt"), sideLabel(sideOf(s.source_type))) : null}
      {s.origin ? row(tr("Art der Berichte"), tr(ORIGIN[s.origin] || s.origin)) : null}
      {s.language ? row(tr("Sprache"), tr(LANG[s.language] || s.language)) : null}
      {row(tr("Schwerpunkt"), s.focus?.length ? s.focus.map((f) => REGIONS[f] || f).join(", ") : tr("ganze Region, gefiltert nach Stichwörtern"))}
      {s.limitations ? row(tr("Bekannte Grenzen"), s.limitations) : null}
      {row(tr("Korrekturen"), tr("Werden von Semay nicht gesondert erfasst; maßgeblich ist die Seite der Quelle."))}
      {r ? row(tr("Letzter Abruf"), `${r.start ? `${fmtFull(r.start)} – ` : ""}${fmtFull(r.end)} · ${r.ok ? tr("erfolgreich") : tr("gescheitert")}`
        + (r.found != null ? ` · ${tr("{found} im Feed, {kept} zu unseren Regionen, {fresh} neu, {dupes} schon vorhanden", { found: num(r.found), kept: num(r.kept ?? 0), fresh: num(r.new ?? 0), dupes: num(r.dupes ?? 0) })}`
          : r.kept != null ? ` · ${tr("{n} Einträge", { n: num(r.kept) })}` : "")
        + (r.error ? ` · ${r.error}` : "")) : null}
      {s.runs?.n ? row(tr("24 Stunden"), tr("{n} Abrufe, {failed} gescheitert", { n: num(s.runs.n), failed: num(s.runs.failed) })) : null}
      {s.homepage ? <T v="smallStrong" color={t.accent} onPress={() => openLink(s.homepage!)} accessibilityRole="link">{tr("Website der Quelle")} ↗</T> : null}
    </View>
  );
}
