// Anmelden mit Google und Apple (und E-Mail). Konten verwaltet Supabase; voller Zugang hängt an der freigeschalteten E-Mail-Adresse.
import * as AppleAuthentication from "expo-apple-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { WEB_URL } from "./feeds";
import { sb, SUPABASE_KEY, SUPABASE_URL } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type Provider = "google" | "apple";
const NAME: Record<Provider, string> = { google: "Google", apple: "Apple" };

/** Ist der Anbieter in Supabase eingeschaltet? (öffentliche Einstellungen, ohne Anmeldung lesbar) */
export async function providerEnabled(p: Provider): Promise<boolean | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    const j = await r.json();
    return !!j?.external?.[p];
  } catch { return null; }
}

/** Natives „Mit Apple anmelden“ gibt es nur auf dem iPhone/iPad */
export async function appleNativeAvailable() {
  if (Platform.OS !== "ios") return false;
  try { return await AppleAuthentication.isAvailableAsync(); } catch { return false; }
}

const notReady = (p: Provider) => `Die Anmeldung mit ${NAME[p]} ist noch nicht eingerichtet. Bitte vorerst mit E-Mail anmelden.`;

/** Gibt eine Fehlermeldung auf Deutsch zurück, oder null bei Erfolg (bzw. wenn die Seite gleich zu Google/Apple wechselt) */
export async function signInWith(p: Provider): Promise<string | null> {
  const enabled = await providerEnabled(p);
  if (enabled === false) return notReady(p);

  // iPhone: Apple direkt über Face ID, ohne Browser
  if (p === "apple" && (await appleNativeAvailable())) {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!cred.identityToken) return "Apple hat keine Anmeldedaten geliefert. Bitte noch einmal versuchen.";
      const { error } = await sb.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken });
      return error ? say(error.message, p) : null;
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return null;
      return say(String(e?.message || e), p);
    }
  }

  // Web: Seite wechselt zu Google/Apple und kommt mit der Anmeldung zurück
  if (Platform.OS === "web") {
    const { error } = await sb.auth.signInWithOAuth({ provider: p, options: { redirectTo: typeof window !== "undefined" ? window.location.origin : WEB_URL } });
    return error ? say(error.message, p) : null;
  }

  // Handy: Anmeldung im eingebauten Browser, danach zurück in die App (hornlens://auth-callback)
  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await sb.auth.signInWithOAuth({ provider: p, options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data?.url) return say(error?.message || "keine Adresse", p);
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== "success") return null; // abgebrochen
  return finishFromUrl(res.url);
}

/** Anmeldedaten aus der Rücksprung-Adresse übernehmen (Token im #-Teil oder ein Code) */
export async function finishFromUrl(url: string): Promise<string | null> {
  const frag = url.includes("#") ? url.split("#")[1] : "";
  const query = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  const h = new URLSearchParams(frag), q = new URLSearchParams(query);
  const err = h.get("error_description") || q.get("error_description");
  if (err) return say(err, "google");
  const access_token = h.get("access_token"), refresh_token = h.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await sb.auth.setSession({ access_token, refresh_token });
    return error ? say(error.message, "google") : null;
  }
  const code = q.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    return error ? say(error.message, "google") : null;
  }
  return null;
}

function say(m: string, p: Provider) {
  if (/provider is not enabled|unsupported provider/i.test(m)) return notReady(p);
  if (/network|fetch/i.test(m)) return "Keine Verbindung. Bitte Internet prüfen.";
  return `Die Anmeldung mit ${NAME[p]} hat nicht geklappt. Bitte gleich noch einmal versuchen.`;
}

/** Konto endgültig löschen (verlangen Apple und Google). Gibt eine Fehlermeldung oder null zurück. */
export async function deleteAccount(): Promise<string | null> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "Nicht angemeldet.";
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY } });
    if (!r.ok) return `Das Konto konnte nicht gelöscht werden (Fehler ${r.status}).`;
  } catch { return "Keine Verbindung. Bitte Internet prüfen."; }
  await sb.auth.signOut();
  return null;
}
