// Push-Benachrichtigungen: Erlaubnis holen, Gerät bei Semay anmelden, Antippen öffnet den passenden Bildschirm.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { sb } from "./supabase";

const KEY = "hl:push:v1";
export type PushPrefs = { token: string | null; alerts: boolean; report: boolean };
export const pushSupported = Platform.OS !== "web";

if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function getPrefs(): Promise<PushPrefs> {
  try { const v = await AsyncStorage.getItem(KEY); if (v) return JSON.parse(v); } catch { /* leer */ }
  return { token: null, alerts: false, report: false };
}
async function savePrefs(p: PushPrefs) { try { await AsyncStorage.setItem(KEY, JSON.stringify(p)); } catch { /* egal */ } }

/** Erlaubnis holen und Gerät anmelden. Gibt eine Fehlermeldung auf Deutsch zurück oder null. */
export async function enablePush(alerts: boolean, report: boolean): Promise<string | null> {
  if (!pushSupported) return "Benachrichtigungen gibt es in der App fürs Handy, nicht im Browser.";
  if (!Device.isDevice) return "Benachrichtigungen funktionieren nur auf einem echten Handy.";
  const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId || (Constants as any).easConfig?.projectId;
  if (!projectId) return "Benachrichtigungen sind erst in der Store-Fassung der App aktiv.";
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Hinweise", importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return "Benachrichtigungen sind für Semay ausgeschaltet. Du kannst sie in den Einstellungen des Handys erlauben.";
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const kinds = [alerts && "alerts", report && "report"].filter(Boolean) as string[];
  const { error } = await sb.rpc("app_push_register", { p_token: token, p_kinds: kinds });
  if (error) return "Benachrichtigungen ließen sich nicht einschalten. Bitte Verbindung prüfen und erneut versuchen.";
  await savePrefs({ token, alerts, report });
  return null;
}

export async function disablePush() {
  const p = await getPrefs();
  if (p.token) await sb.rpc("app_push_unregister", { p_token: p.token });
  await savePrefs({ token: p.token, alerts: false, report: false });
}

/** Nach An- oder Abmelden neu eintragen, damit der Server weiß, ob das Gerät private Hinweise bekommen darf */
export async function refreshPushOwner() {
  const p = await getPrefs();
  if (!p.token || !(p.alerts || p.report)) return;
  // Den Tagesbericht gibt es nur für freigeschaltete Konten; nach dem Abmelden nur noch Hinweise
  const { data: owner } = await sb.rpc("app_is_owner");
  const report = p.report && !!owner;
  if (!p.alerts && !report) { await sb.rpc("app_push_unregister", { p_token: p.token }); return; }
  await sb.rpc("app_push_register", { p_token: p.token, p_kinds: [p.alerts && "alerts", report && "report"].filter(Boolean) });
}
