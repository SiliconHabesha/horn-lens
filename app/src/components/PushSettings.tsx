// Einstellungen für Benachrichtigungen (im Bildschirm "Mehr")
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { AppState, Linking, Pressable, View } from "react-native";
import { useData } from "../lib/data";
import { disablePush, enablePush, getPrefs, pushSupported } from "../lib/push";
import { space, useTheme } from "../lib/theme";
import { Banner, Card, Divider, T, tap, Toggle } from "./ui";

export function PushSettings() {
  const t = useTheme();
  const { data } = useData();
  const [alerts, setAlerts] = useState(false);
  const [report, setReport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    getPrefs().then((p) => { setAlerts(p.alerts); setReport(p.report && !!data?.owner); });
    // Im Handy ausgeschaltet? Dann nicht „an“ anzeigen, sondern zu den Einstellungen führen
    const check = () => { if (pushSupported) Notifications.getPermissionsAsync().then((s) => setDenied(s.status === "denied")).catch(() => {}); };
    check();
    // Zurück aus den Handy-Einstellungen: neu prüfen
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
    return () => sub.remove();
  }, [data?.owner]);
  const apply = async (a: boolean, r: boolean) => {
    tap(); setBusy(true); setMsg(null);
    try {
      if (!a && !r) { await disablePush(); setAlerts(false); setReport(false); }
      else {
        const err = await enablePush(a, r && !!data?.owner);
        if (err) setMsg(err); else { setAlerts(a); setReport(r && !!data?.owner); setDenied(false); }
      }
    } catch {
      setMsg("Das hat nicht geklappt. Bitte Verbindung prüfen und erneut versuchen.");
    } finally { setBusy(false); }
  };
  const test = async () => {
    tap();
    try {
      await Notifications.scheduleNotificationAsync({ content: { title: "Semay", body: "So sieht eine Benachrichtigung aus.", data: { path: "/" } }, trigger: null });
    } catch { setMsg("Die Probe-Benachrichtigung konnte nicht angezeigt werden."); }
  };
  return (
    <>
      <Card style={{ paddingVertical: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Hinweise</T>
            <T v="caption">Vorfälle auf See, starke Erdbeben, starke Rückgänge der Internetverbindung, ungewöhnlich viele Meldungen zu Eritrea</T>
          </View>
          <Toggle value={alerts && !denied} disabled={busy || !pushSupported} onValueChange={(v) => apply(v, report)} accessibilityLabel="Hinweise als Benachrichtigung" />
        </View>
        {data?.owner ? (
          <>
            <Divider />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">Tagesbericht</T>
                <T v="caption">Jeden Morgen gegen 7:15 Uhr (deutsche Zeit)</T>
              </View>
              <Toggle value={report && !denied} disabled={busy || !pushSupported} onValueChange={(v) => apply(alerts, v)} accessibilityLabel="Tagesbericht als Benachrichtigung" />
            </View>
          </>
        ) : null}
      </Card>

      {denied ? <View style={{ marginTop: space.s }}><Banner icon="notifications-off-outline" tone="warn" text="Benachrichtigungen sind in den Einstellungen des Handys für Semay ausgeschaltet." action="Einstellungen" onAction={() => Linking.openSettings().catch(() => {})} /></View> : null}
      {msg ? <View style={{ marginTop: space.s }}><Banner icon="notifications-off-outline" tone="warn" text={msg} /></View> : null}
      {pushSupported && (alerts || report) && !denied ? (
        <Pressable onPress={test} accessibilityRole="button" hitSlop={6} style={{ alignSelf: "flex-start", paddingVertical: 10 }}>
          <T v="smallStrong" color={t.accent}>Probe-Benachrichtigung senden</T>
        </Pressable>
      ) : null}
    </>
  );
}
