// Einstellungen für Benachrichtigungen (im Bildschirm "Mehr")
import React, { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { useData } from "../lib/data";
import { disablePush, enablePush, getPrefs, pushSupported } from "../lib/push";
import { space, useTheme } from "../lib/theme";
import { Banner, Card, Divider, T, tap } from "./ui";

export function PushSettings() {
  const t = useTheme();
  const { data } = useData();
  const [alerts, setAlerts] = useState(false);
  const [report, setReport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { getPrefs().then((p) => { setAlerts(p.alerts); setReport(p.report); }); }, []);
  const apply = async (a: boolean, r: boolean) => {
    tap(); setBusy(true); setMsg(null);
    if (!a && !r) { await disablePush(); setAlerts(false); setReport(false); }
    else {
      const err = await enablePush(a, r);
      if (err) setMsg(err); else { setAlerts(a); setReport(r); }
    }
    setBusy(false);
  };
  return (
    <>
      <Card style={{ paddingVertical: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Hinweise</T>
            <T v="caption">{data?.owner ? "Vorfälle auf See, starke Erdbeben, Internet-Einbrüche, viele Meldungen zu Eritrea" : "Vorfälle auf See und starke Erdbeben"}</T>
          </View>
          <Switch value={alerts} disabled={busy || !pushSupported} onValueChange={(v) => apply(v, report)} accessibilityLabel="Hinweise als Benachrichtigung" />
        </View>
        {data?.owner ? (
          <>
            <Divider />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">Tagesbericht</T>
                <T v="caption">Jeden Morgen gegen 7:15 Uhr</T>
              </View>
              <Switch value={report} disabled={busy || !pushSupported} onValueChange={(v) => apply(alerts, v)} accessibilityLabel="Tagesbericht als Benachrichtigung" />
            </View>
          </>
        ) : null}
      </Card>
      {!pushSupported ? <T v="caption" style={{ marginTop: space.s }}>Benachrichtigungen gibt es in der App fürs Handy.</T> : null}
      {msg ? <View style={{ marginTop: space.s }}><Banner icon="notifications-off-outline" tone="warn" text={msg} /></View> : null}
    </>
  );
}
