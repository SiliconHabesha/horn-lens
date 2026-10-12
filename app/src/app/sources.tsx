// Quellen: nach Art gruppiert, mit Einordnung und Erreichbarkeit.
import React from "react";
import { View } from "react-native";
import { Card, Divider, openLink, Screen, T } from "../components/ui";
import { ago, fmtDate, plural, TYPE_NOTE, TYPE_ORDER, TYPES } from "../lib/de";
import { useData } from "../lib/data";
import { Skeleton } from "../components/Skeleton";
import { feedState, isStale } from "../lib/feeds";
import { VOICE_TYPES } from "../lib/stories";
import { space, useTheme } from "../lib/theme";

export default function Sources() {
  const t = useTheme();
  const { data } = useData();
  const sources = data?.sources || [];
  const isErr = (s: typeof sources[0]) => ["firms", "ukmto", "usgs", "ioda"].includes(s.kind) ? !feedState(data, s.id).ok
    : !!s.last_error && (!s.last_ok_at || new Date(s.last_fetch_at || 0) > new Date(s.last_ok_at));
  const rank = (s: typeof sources[0]) => (isErr(s) ? 0 : isStale(s) ? 1 : 2);
  const groups = TYPE_ORDER.map((k) => [k, sources.filter((s) => s.source_type === k).sort((a, b) => rank(a) - rank(b))] as const).filter(([, l]) => l.length);
  const bad = sources.filter(isErr).length, stale = sources.filter((s) => !isErr(s) && isStale(s)).length;
  if (!data) return <Screen topInset={false} refresh={false}><Skeleton rows={6} /></Screen>;
  return (
    <Screen topInset={false}>
      <Card style={{ marginBottom: space.l, gap: 4 }}>
        <T v="h3">{sources.length - bad} von {sources.length} Quellen erreichbar</T>
        <T v="small">{bad ? `${bad} gestört` : "Keine gestört"}{stale ? ` · ${stale} seit über 14 Tagen ohne neue Meldung zu unseren Regionen` : ""}. Gestörte Quellen stehen in jeder Gruppe oben.</T>
      </Card>
      {/* Abdeckung: welche Seite ist mit wie vielen erreichbaren Quellen vertreten, wo fehlt eine */}
      <T v="h3" style={{ marginBottom: space.s }}>Welche Seiten wir hören</T>
      <Card style={{ marginBottom: space.l, paddingVertical: 4 }}>
        {VOICE_TYPES.map((k, i) => {
          const all = sources.filter((x) => x.source_type === k), ok = all.filter((x) => !isErr(x)).length;
          return (
            <View key={k}>
              {i ? <Divider /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.type[k] }} />
                <T v="small" color={t.ink} style={{ flex: 1 }}>{TYPES[k]}</T>
                <T v="caption" color={!ok ? t.warn : undefined}>{!all.length ? "keine Quelle" : !ok ? "keine erreichbar" : ok === all.length ? plural(ok, "Quelle", "Quellen") : `${ok} von ${all.length} erreichbar`}</T>
              </View>
            </View>
          );
        })}
      </Card>
      {VOICE_TYPES.some((k) => !sources.some((x) => x.source_type === k && !isErr(x))) ? (
        <T v="small" style={{ marginTop: -space.s, marginBottom: space.l }}>Wo eine Seite fehlt, kann Horn Lens sie nicht zeigen. Fehlt sie in einer Geschichte, heißt das nicht, dass sie schweigt. Wir suchen nach frei abrufbaren Quellen und umgehen keine Sperren.</T>
      ) : null}
      <T v="small" style={{ marginBottom: space.m }}>Jede Quelle ist nach Art eingeordnet, damit du Meldungen gewichten kannst. Die Farbe steht in allen Listen für diese Art.</T>
      {groups.map(([k, list]) => (
        <View key={k} style={{ marginBottom: space.l }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.type[k] }} />
            <T v="label" color={t.type[k]}>{TYPES[k]}</T>
          </View>
          <T v="caption" style={{ marginBottom: space.s }}>{TYPE_NOTE[k]}</T>
          <Card style={{ paddingVertical: 4 }}>
            {list.map((s, i) => {
              const err = isErr(s);
              const stale = !err && isStale(s);
              return (
                <View key={s.id}>
                  {i ? <Divider /> : null}
                  <View style={{ paddingVertical: 10, gap: 3 }}>
                    <T v="bodyStrong" color={s.homepage ? t.ink : undefined} onPress={s.homepage ? () => openLink(s.homepage) : undefined}
                      accessibilityRole={s.homepage ? "link" : undefined} accessibilityHint={s.homepage ? "Öffnet die Website der Quelle" : undefined}>{s.name}{s.homepage ? " ↗" : ""}</T>
                    {s.stance_note ? <T v="small">{s.stance_note}</T> : null}
                    <T v="caption" color={err ? t.warn : undefined}>
                      {err ? (s.last_ok_at ? `Gestört; zuletzt erreichbar ${ago(s.last_ok_at)}` : "Gestört; bisher nie erreichbar") : stale ? `Abgefragt ${ago(s.last_ok_at!)}; neueste Meldung zu unseren Regionen: ${fmtDate(s.newest_item_at!)}`
                        : s.last_ok_at ? `Abgefragt ${ago(s.last_ok_at)}${s.last_item_count != null && !["firms", "ukmto", "usgs", "ioda"].includes(s.kind) ? `, zuletzt ${plural(s.last_item_count, "Eintrag", "Einträge")}` : ""}` : "Noch nicht abgefragt"}
                    </T>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
