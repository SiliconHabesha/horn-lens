// Anmeldung nur für die Redaktion, mit E-Mail und Passwort. Lesen geht ohne Konto.
// Hier: Rücksprung aus E-Mail-Links (Passwort zurücksetzen) und Konto löschen.
import { sb, SUPABASE_KEY, SUPABASE_URL } from "./supabase";
import { t } from "./i18n";

const say = (m: string) => (/network|fetch|abort/i.test(m) ? t("Keine Verbindung. Bitte Internet prüfen.") : t("Die Anmeldung hat nicht geklappt. Bitte erneut versuchen."));

/** Anmeldedaten aus der Rücksprung-Adresse übernehmen (Token im #-Teil oder ein Code) */
export async function finishFromUrl(url: string): Promise<string | null> {
  const frag = url.includes("#") ? url.split("#")[1] : "";
  const query = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  const h = new URLSearchParams(frag), q = new URLSearchParams(query);
  const err = h.get("error_description") || q.get("error_description");
  if (err) return say(err);
  const access_token = h.get("access_token"), refresh_token = h.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await sb.auth.setSession({ access_token, refresh_token });
    return error ? say(error.message) : null;
  }
  const code = q.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    return error ? say(error.message) : null;
  }
  return null;
}

/** Konto endgültig löschen. Gibt eine Fehlermeldung oder null zurück. */
export async function deleteAccount(): Promise<string | null> {
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return t("Nicht angemeldet.");
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY } });
    if (!r.ok) return t("Das Konto konnte nicht gelöscht werden (Fehler {status}).", { status: r.status });
  } catch { return t("Keine Verbindung. Bitte Internet prüfen."); }
  await sb.auth.signOut();
  return null;
}
