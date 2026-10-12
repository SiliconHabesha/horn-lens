// Semay – Push-Benachrichtigungen
// Fragt die Datenbank, was neu zu melden ist (public.push_next), und verschickt es über den Expo-Push-Dienst.
// Zugang nur mit internem Schlüssel (Header x-ingest-key), daher verify_jwt=false. Läuft per Zeitplan nach den Abholern.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Deutsche Texte (wie in der App, lib/de.ts)
const COUNTRY: Record<string, string> = { Eritrea: "Eritrea", Ethiopia: "Äthiopien", Yemen: "Jemen", Djibouti: "Dschibuti", "Saudi Arabia": "Saudi-Arabien", Sudan: "Sudan", Somalia: "Somalia" };
const SEA: Record<string, string> = { "Southern Red Sea": "Südliches Rotes Meer", "Red Sea": "Rotes Meer", "Gulf of Aden": "Golf von Aden", "Bab el Mandeb": "Bab el-Mandeb" };
const INCIDENT: Record<string, string> = { Attack: "Angriff", "Suspicious Activity": "Verdächtige Aktivität", "Suspicious Approach": "Verdächtige Annäherung", Approach: "Annäherung",
  Incident: "Vorfall", Hijack: "Entführung", Boarding: "Enterung", Explosion: "Explosion", Advisory: "Hinweis", Warning: "Warnung", Piracy: "Piraterie", "Missile Attack": "Raketenangriff" };
const place = (p: string) => {
  let t = p.trim();
  if (SEA[t]) return SEA[t];
  t = t.replace(/^(\d+) km ([NSEW]{1,3}) of /, (_, n, d) => `${n} km ${d.replace(/E/g, "O")} von `).replace(/^(\d+)\s?NM ([NSEW]{1,3}) of /, (_, n, d) => `${n} sm ${d.replace(/E/g, "O")} von `);
  for (const [en, de] of Object.entries({ ...COUNTRY, ...SEA })) t = t.replace(new RegExp(`\\b${en}\\b`, "g"), de);
  return t;
};
const title = (s: string) => {
  let m;
  if ((m = s.match(/^Earthquake (?:of unknown magnitude|M([\d.]+))(?:, (.+))?$/))) return `Erdbeben ${m[1] ? `der Stärke ${m[1].replace(".", ",")}` : "unbekannter Stärke"}${m[2] ? `, ${place(m[2])}` : ""}`;
  if ((m = s.match(/^(.+?)(?:, (.+))? \(UKMTO #(\d+)\)$/))) return `${INCIDENT[m[1].trim()] || m[1]}${m[2] ? `, ${place(m[2])}` : ""}`;
  if ((m = s.match(/^Major internet drop in (\w+)$/))) return `Starker Interneteinbruch in ${COUNTRY[m[1]] || m[1]}`;
  if ((m = s.match(/^Internet connectivity dip in (\w+)$/))) return `Rückgang der Internetverbindung in ${COUNTRY[m[1]] || m[1]}`;
  if ((m = s.match(/^(\d+) reports on Eritrea from (\d+) outlets in 6 hours$/))) return `${m[1]} Meldungen zu Eritrea von ${m[2]} Medien in 6 Stunden`;
  return s;
};
// Texte je Sprache der App (de, en, ti). Titel der Hinweise: Deutsch über title(), Englisch im Original, Tigrinya über tiTitle()
type L = "de" | "en" | "ti";
const HEAD: Record<L, Record<string, string>> = {
  de: { maritime: "Auf See", quake: "Erdbeben", outage: "Internet", surge: "Viele Meldungen" },
  en: { maritime: "At sea", quake: "Earthquake", outage: "Internet", surge: "Many reports" },
  ti: { maritime: "ኣብ ባሕሪ", quake: "ምንቕጥቃጥ ምድሪ", outage: "ኢንተርነት", surge: "ብዙሓት ጸብጻባት" },
};
const BODY: Record<L, Record<string, string>> = {
  de: { maritime: "Von UKMTO gemeldet. UKMTO sagt nicht, wer verantwortlich war.", quake: "Von USGS gemessen.",
    outage: "Von IODA gemessen. Ein Rückgang beweist keine absichtliche Abschaltung.", surge: "Die Zählung sagt nicht, was geschehen ist. Tippen zeigt die Meldungen." },
  en: { maritime: "Reported by UKMTO. UKMTO does not say who was responsible.", quake: "Measured by USGS.",
    outage: "Measured by IODA. A drop is not proof of a deliberate shutdown.", surge: "The count does not say what happened. Tap to see the reports." },
  ti: { maritime: "ብUKMTO ዝተጸብጸበ። UKMTO መን ተሓታቲ ምዃኑ ኣይገልጽን።", quake: "ብUSGS ዝተዓቐነ።",
    outage: "ብIODA ዝተዓቐነ። ምንካይ ብፍላጥ ምዕጻው ምዃኑ ኣየረጋግጽን።", surge: "እቲ ቁጽሪ እንታይ ከም ዘጋጠመ ኣይገልጽን። ጸብጻባት ንምርኣይ ጠውቕ።" },
};
const TI_INC: Record<string, string> = { Attack: "መጥቃዕቲ", "Suspicious Activity": "ጥርጡር ንጥፈት", "Suspicious Approach": "ጥርጡር ምቕራብ", Incident: "ፍጻመ", Hijack: "ጠለፋ", Boarding: "ምድያብ", Explosion: "ነትጒ" };
const TI_C: Record<string, string> = { Eritrea: "ኤርትራ", Ethiopia: "ኢትዮጵያ", Yemen: "የመን", Djibouti: "ጅቡቲ", Sudan: "ሱዳን" };
const tiTitle = (s: string) => {
  let m;
  if ((m = s.match(/^Earthquake (?:of unknown magnitude|M([\d.]+))(?:, (.+))?$/))) return `ምንቕጥቃጥ ምድሪ${m[1] ? ` ${m[1]}` : ""}${m[2] ? `፣ ${m[2]}` : ""}`;
  if ((m = s.match(/^(.+?)(?:, (.+))? \(UKMTO #(\d+)\)$/))) return `${TI_INC[m[1].trim()] || m[1]}${m[2] ? `፣ ${m[2]}` : ""}`;
  if ((m = s.match(/^(?:Major internet drop|Internet connectivity dip) in (\w+)$/))) return `ኣብ ${TI_C[m[1]] || m[1]} ምንካይ ምትእስሳር ኢንተርነት`;
  return s;
};
const titleIn = (s: string, l: L) => (l === "de" ? title(s) : l === "ti" ? tiTitle(s) : s);
const lg = (x: unknown): L => (x === "en" || x === "ti" ? x : "de");
const PATH: Record<string, string> = { maritime: "/signal/sea", quake: "/signal/quakes", outage: "/signal/internet", surge: "/news?region=eritrea" };

type Msg = { to: string; title: string; body: string; sound: "default"; data: { path: string }; priority?: "high" };
async function send(msgs: Msg[]) {
  const dead: string[] = [];
  let sent = 0;
  for (let i = 0; i < msgs.length; i += 100) {
    const batch = msgs.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(batch),
    });
    const j = await res.json().catch(() => ({}));
    (j.data || []).forEach((t: any, k: number) => {
      if (t?.status === "ok") sent++;
      else if (t?.details?.error === "DeviceNotRegistered") dead.push(batch[k].to);
    });
  }
  if (dead.length) await supabase.rpc("push_drop", { p_tokens: dead });
  return { sent, dropped: dead.length };
}

Deno.serve(async (req) => {
  const { data: ok } = await supabase.rpc("check_ingest_key", { k: req.headers.get("x-ingest-key") ?? "" });
  if (!ok) return new Response("forbidden", { status: 403 });
  const { data, error } = await supabase.rpc("push_next");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const msgs: Msg[] = [];
  for (const a of data?.alerts || []) {
    for (const tk of a.tokens || []) {
      // Ältere Form (nur die Kennung) und neue Form (Kennung mit Sprache)
      const to = typeof tk === "string" ? tk : tk.to, l = lg(typeof tk === "string" ? "de" : tk.lang);
      msgs.push({ to, title: `${HEAD[l][a.kind] || "Semay"}: ${titleIn(a.title, l)}`, body: BODY[l][a.kind] || "", sound: "default", data: { path: PATH[a.kind] || "/" }, priority: "high" });
    }
  }
  if (data?.report) {
    const d = new Date(`${data.report.date}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    for (const tk of data.report.tokens || []) msgs.push({ to: typeof tk === "string" ? tk : tk.to, title: "Tagesbericht ist da", body: `Semay, ${d}: was in den letzten 24 Stunden gemeldet und gemessen wurde.`, sound: "default", data: { path: `/report/${data.report.date}` } });
  }
  const r = msgs.length ? await send(msgs) : { sent: 0, dropped: 0 };
  return Response.json({ ran_at: new Date().toISOString(), alerts: (data?.alerts || []).length, report: !!data?.report, ...r });
});
