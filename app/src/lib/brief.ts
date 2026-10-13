// „Auf einen Blick“: die Lage in wenigen Sätzen, nach festen Regeln aus den Daten gebildet, für 24 Stunden, 72 Stunden oder 7 Tage.
// Keine KI und keine Wertung: jeder Satz nennt eine Zahl oder eine Meldung und ihre Herkunft. Was keine Quelle liefert, fehlt.
// Dazu die Informationslücken (was wir gerade nicht sehen) und ob überhaupt eine verlässliche Zusammenfassung möglich ist.
// Tests: tests/unit/lib.test.mjs
import Ionicons from "@expo/vector-icons/Ionicons";
import { CORE_REGIONS, fmtShort, fmtWhen, headline, num, plural, REGIONS, TYPES } from "./de";
import { feedState, NOT_SET_UP } from "./feeds";
import { assess } from "./assess";
import { t as tr } from "./i18n";
import { nearest, RADIUS } from "./places";
import { VOICE_TYPES, type Story } from "./stories";
import type { Data, Item } from "./types";

export type BriefLine = { icon: keyof typeof Ionicons.glyphMap; head: string; text: string; src: string; to: string; alert?: boolean };
export type Gap = { icon: keyof typeof Ionicons.glyphMap; text: string; to: string };
export type Brief = { lines: BriefLine[]; gaps: Gap[]; reliable: boolean; reason: string | null; reports: number; multi: Story[] };

export const PERIODS = [24, 72, 168] as const;
export type Period = (typeof PERIODS)[number];
/** „24 Stunden“, „72 Stunden“, „7 Tagen“ (Dativ, für Sätze wie „in 7 Tagen“) */
export const periodIn = (h: number) => (h === 168 ? tr("in 7 Tagen") : h === 72 ? tr("in 72 Stunden") : tr("in 24 Stunden"));
export const periodLabel = (h: number) => (h === 168 ? tr("7 Tage") : h === 72 ? tr("72 Std.") : tr("24 Std."));

const HOUR = 3600e3;
const time = (i: Item) => new Date(i.published_at || i.fetched_at).getTime();
// Zahl mit Wort als eigene Vorlage (nicht plural()), weil „Meldungen“, „Medien“ und „Quellenart“ auch als Überschrift übersetzt werden
const media = (n: number) => (n === 1 ? tr("1 Medium") : tr("{n} Medien", { n: num(n) }));
const typesN = (n: number) => (n === 1 ? tr("1 Quellenart") : tr("{n} Quellenarten", { n: num(n) }));
const reports = (n: number) => (n === 1 ? tr("1 Meldung") : tr("{n} Meldungen", { n: num(n) }));
// Als Funktion, damit die Überschriften beim Zeichnen in der gewählten Sprache entstehen
const ALERT = (): Record<string, { head: string; icon: BriefLine["icon"]; to: string }> => ({
  maritime: { head: tr("Auf See"), icon: "boat-outline", to: "/signal/sea" },
  outage: { head: tr("Internet"), icon: "wifi-outline", to: "/signal/internet" },
  quake: { head: tr("Erdbeben"), icon: "pulse-outline", to: "/signal/quakes" },
  surge: { head: tr("Viele Meldungen"), icon: "newspaper-outline", to: "/news?region=eritrea" },
});
const MEASURED = ["firms", "ukmto", "usgs", "ioda", "sentinel2"];
/** Nachrichtenquelle, deren letzter Abruf gescheitert ist */
export const failing = (s: Data["sources"][0]) => !!s.last_error && (!s.last_ok_at || new Date(s.last_fetch_at || 0) > new Date(s.last_ok_at));
/** Geschichte, über die Medien verschiedener Art berichten (z. B. ein internationales und ein äthiopisches Medium) */
export const multiSided = (s: Story) => s.sources >= 2 && Object.keys(s.types).filter((k) => k !== "aggregator").length >= 2;

export function briefOf(data: Data, stories: Story[], o: { hours: number; fresh: number; since: string; now?: number }): Brief {
  const now = o.now ?? Date.now();
  const win = o.hours * HOUR;
  const inWin = (t: string | number) => now - new Date(t).getTime() < win;
  const out: BriefLine[] = [];
  const alerted = new Set<string>();
  const alerts = ALERT();
  const P = periodIn(o.hours);

  // 1. Auffälliges zuerst (automatische Hinweise mit fester Schwelle; gelten immer für „jetzt“)
  for (const a of data.alerts) {
    const k = alerts[a.kind];
    alerted.add(a.kind);
    out.push({ icon: k?.icon || "alert-circle-outline", head: k?.head || tr("Hinweis"), text: a.title, alert: true,
      src: `${fmtWhen(a.t)}${a.source && !a.title.includes(a.source) ? ` · ${a.source}` : ""}`, to: k?.to || "/" });
  }

  // 2. Worüber am meisten berichtet wird (Eritrea, Äthiopien mit seinen Regionen), und wie viel
  const recent = stories.filter((s) => inWin(s.last));
  const core = recent.filter((s) => s.items.some((i) => i.regions.some((r) => CORE_REGIONS.includes(r))));
  const top = [...core].sort((a, b) => b.sources - a.sources || (a.last < b.last ? 1 : -1))[0];
  if (top && top.sources > 1) {
    out.push({ icon: "megaphone-outline", head: tr("Meistberichtet"), text: headline(top.lead),
      src: tr("{media} · {types} · zuletzt {when}", { media: media(top.sources), types: typesN(Object.keys(top.types).length), when: fmtWhen(top.last) }), to: `/item/${top.lead.id}` });
  }
  const coreItems = core.flatMap((s) => s.items.filter((i) => inWin(time(i))));
  const n = coreItems.length;
  out.push({ icon: "newspaper-outline", head: tr("Meldungen"), text: n ? (o.fresh && o.hours === 24 ? tr("{count} in 24 Stunden zu Eritrea, Äthiopien und Tigray, {fresh} davon neu {since}.", { count: reports(n), fresh: num(o.fresh), since: o.since })
      : tr("{count} {period} zu Eritrea, Äthiopien und Tigray.", { count: reports(n), period: P }))
      : tr("{period} keine Meldung zu Eritrea, Äthiopien und Tigray in unseren Quellen.", { period: P }),
    src: tr("Schlagzeilen aus allen Quellen"), to: o.fresh && o.hours === 24 ? "/news?new=1" : `/news?hours=${o.hours}` });

  // 3. Von mehreren Seiten berichtet: Medien verschiedener Art greifen dieselbe Geschichte auf
  const multi = core.filter(multiSided).sort((a, b) => b.sources - a.sources || (a.last < b.last ? 1 : -1));
  if (multi.length > (top && multiSided(top) ? 1 : 0)) {
    const other = multi.find((s) => s !== top) || multi[0];
    out.push({ icon: "git-merge-outline", head: tr("Von mehreren Seiten berichtet"), text: multi.length === 1 ? headline(other.lead)
      : tr("{n} Geschichten, etwa: {title}", { n: num(multi.length), title: headline(other.lead) }),
      src: tr("Medien verschiedener Art; das heißt nicht, dass es stimmt"), to: `/item/${other.lead.id}` });
  }

  // 4. Was kursiert: wie viele Geschichten nur eine Quelle, nur eine Seite haben oder bestritten werden (automatisch, ohne Urteil)
  const kinds = core.map((st) => assess(st.items).kind);
  const nK = (k: string) => kinds.filter((x) => x === k).length;
  const parts = [nK("contested") ? tr("{n} bestritten", { n: num(nK("contested")) }) : null,
    nK("single") ? tr("{n} nur aus einer Quelle", { n: num(nK("single")) }) : null,
    nK("oneSide") ? tr("{n} nur von einer Seite", { n: num(nK("oneSide")) }) : null].filter(Boolean);
  if (parts.length) out.push({ icon: "chatbubbles-outline", head: tr("Was kursiert"),
    text: tr("Von {count} {period}: {parts}.", { count: core.length === 1 ? tr("1 Geschichte") : tr("{n} Geschichten", { n: num(core.length) }), period: P, parts: parts.join(", ") }),
    src: tr("Automatisch eingeordnet; Semay prüft nichts selbst"), to: "/claims" });

  // 5. Rotes Meer (wenn nicht schon oben)
  const ukmto = feedState(data, "ukmto");
  if (!alerted.has("maritime") && ukmto.ok) {
    const last = data.maritime[0];
    const span = Math.max(o.hours, 168);
    out.push(last && now - new Date(last.t).getTime() < span * HOUR
      ? { icon: "boat-outline", head: tr("Rotes Meer"), text: tr("Letzter gemeldeter Vorfall {when}: {title}", { when: fmtWhen(last.t), title: last.title }), src: "UKMTO", to: "/signal/sea" }
      : { icon: "boat-outline", head: tr("Rotes Meer"), text: tr("In den letzten 7 Tagen kein Vorfall gemeldet."), src: "UKMTO", to: "/signal/sea" });
  }

  // 6. Internet in Eritrea (wenn nicht schon oben)
  const ioda = feedState(data, "ioda");
  if (!alerted.has("outage") && ioda.ok) {
    const er = data.outages.filter((x) => x.country === "ER").length;
    out.push({ icon: "wifi-outline", head: tr("Internet Eritrea"), text: er ? tr("{count} in 48 Stunden gemessen.", { count: plural(er, "leichter Rückgang", "leichte Rückgänge") }) : tr("In 48 Stunden kein Rückgang gemessen."),
      src: "IODA", to: "/signal/internet" });
  }

  // 7. Hitzepunkte, mit dem Ort, an dem die meisten liegen (Messung nur für 24 Stunden vorhanden)
  const firms = feedState(data, "firms");
  if (firms.ok && !data.firesError && data.firesTotal) {
    const by = new Map<string, number>();
    for (const f of data.fires) { const p = nearest(f.lat, f.lon); if (p.d <= RADIUS.fire) by.set(p.p.name, (by.get(p.p.name) || 0) + 1); }
    const best = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
    const total = data.firesCapped ? tr("Mindestens {n}", { n: num(data.firesTotal) }) : num(data.firesTotal);
    out.push({ icon: "flame-outline", head: tr("Hitzepunkte"), text: best ? tr("{n} in 24 Stunden, die meisten bei {place}. Hitze, nicht unbedingt Kämpfe.", { n: total, place: best[0] }) : tr("{n} in 24 Stunden. Hitze, nicht unbedingt Kämpfe.", { n: total }),
      src: "NASA FIRMS", to: "/signal/fires" });
  }

  // 8. Spürbare Erdbeben (ab Stärke 4,5, 7 Tage), wenn nicht schon oben
  const usgs = feedState(data, "usgs");
  const q = data.quakes.find((x) => (x.mag ?? 0) >= 4.5);
  if (!alerted.has("quake") && usgs.ok && q) out.push({ icon: "pulse-outline", head: tr("Erdbeben"), text: tr("Stärke {mag}, {place} ({date}).", { mag: num(q.mag ?? 0), place: q.title.replace(/^(Erdbeben (der Stärke [\d,.]+|unbekannter Stärke)|Earthquake (M[\d.]+|of unknown magnitude)|ምንቕጥቃጥ ምድሪ( [\d.]+)?)[,፣]\s*/, ""), date: fmtShort(q.t) }), src: "USGS", to: "/signal/quakes" });

  // ---- Informationslücken: was wir gerade nicht sehen können
  const gaps: Gap[] = [];
  const news = data.sources.filter((s) => !MEASURED.includes(s.kind));
  const broken = news.filter(failing);
  if (broken.length) gaps.push({ icon: "cloud-offline-outline", to: "/sources",
    text: broken.length === 1 ? tr("1 Nachrichtenquelle ist gestört: {names}.", { names: broken[0].name })
      : tr("{n} Nachrichtenquellen sind gestört, darunter {names}.", { n: num(broken.length), names: broken.slice(0, 3).map((s) => s.name).join(", ") }) });
  const silent = VOICE_TYPES.filter((k) => !news.some((s) => s.source_type === k && !failing(s)));
  if (silent.length) gaps.push({ icon: "volume-mute-outline", to: "/sources",
    text: tr("Ohne erreichbare Quelle: {list}. Wir können nicht zeigen, was diese Seite sagt.", { list: silent.map((k) => TYPES[k]).join(", ") }) });
  const regionItems = (r: string) => data.items.some((i) => i.regions.includes(r) && inWin(time(i)));
  const quiet = ["eritrea", "tigray", "afar", "amhara", "oromia", "somalia", "sudan", "djibouti"].filter((r) => !regionItems(r));
  if (quiet.length) gaps.push({ icon: "help-circle-outline", to: "/news",
    text: tr("{period} keine Meldung zu: {list}. Das heißt nicht, dass dort nichts geschah.", { period: P, list: quiet.map((r) => REGIONS[r]).join(", ") }) });
  const down = [["firms", "NASA FIRMS"], ["ukmto", "UKMTO"], ["usgs", "USGS"], ["ioda", "IODA"]].filter(([id]) => data.sources.some((s) => s.id === id) && !feedState(data, id).ok);
  if (down.length) gaps.push({ icon: "pulse-outline", to: "/sources", text: tr("Messwerte fehlen gerade von: {list}.", { list: down.map((x) => x[1]).join(", ") }) });
  const off = (data.sourcesOff || []).length + NOT_SET_UP.length;
  if (off) gaps.push({ icon: "remove-circle-outline", to: "/sources",
    text: tr("{n} Quellen sind abgeschaltet oder noch nicht eingerichtet, darunter GDELT, ReliefWeb und ACLED.", { n: num(off) }) });

  // ---- Verlässlich zusammenfassbar? Zu wenige Meldungen oder zu viele gestörte Quellen: dann sagen wir es
  let reason: string | null = null;
  if (n < 3) reason = tr("{period} gab es nur {count} zu Eritrea, Äthiopien und Tigray.", { period: P, count: reports(n) });
  else if (news.length && broken.length / news.length > 0.4) reason = tr("{n} von {total} Nachrichtenquellen sind gestört.", { n: num(broken.length), total: num(news.length) });
  return { lines: out, gaps, reliable: !reason, reason, reports: n, multi };
}
