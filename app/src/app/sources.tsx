// Quellen: nach Art gruppiert, mit Einordnung und Erreichbarkeit.
import React from "react";
import { View } from "react-native";
import { Card, Divider, openLink, Screen, T } from "../components/ui";
import { ago, fmtDate, TYPE_NOTE, TYPE_ORDER, TYPES } from "../lib/de";
import { useData } from "../lib/data";
import { isStale } from "../lib/feeds";
import { space, useTheme } from "../lib/theme";

export default function Sources() {
  const t = useTheme();
  const { data } = useData();
  const sources = data?.sources || [];
  const groups = TYPE_ORDER.map((k) => [k, sources.filter((s) => s.source_type === k)] as const).filter(([, l]) => l.length);
  return (
    <Screen topInset={false}>
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
              const err = !!s.last_error && (!s.last_ok_at || new Date(s.last_fetch_at || 0) > new Date(s.last_ok_at));
              const stale = !err && isStale(s);
              return (
                <View key={s.id}>
                  {i ? <Divider /> : null}
                  <View style={{ paddingVertical: 10, gap: 3 }}>
                    <T v="bodyStrong" color={s.homepage ? t.ink : undefined} onPress={s.homepage ? () => openLink(s.homepage) : undefined}>{s.name}</T>
                    {s.stance_note ? <T v="small">{s.stance_note}</T> : null}
                    <T v="caption" color={err ? t.warn : undefined}>
                      {err ? `Bei der letzten Abfrage nicht erreichbar (${ago(s.last_fetch_at || "")})` : stale ? `Abgefragt ${ago(s.last_ok_at!)}; neueste Meldung zu unseren Regionen: ${fmtDate(s.newest_item_at!)}`
                        : s.last_ok_at ? `Abgefragt ${ago(s.last_ok_at)}` : "Noch nicht abgefragt"}
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
