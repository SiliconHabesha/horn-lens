// „Auf einen Blick“: die Lage in wenigen Sätzen, nach festen Regeln aus den Daten gebildet.
// Keine KI und keine Wertung: jeder Satz nennt eine Zahl oder eine Meldung und ihre Herkunft. Was keine Quelle liefert, fehlt.
import Ionicons from "@expo/vector-icons/Ionicons";
import { fmtShort, fmtWhen, headline, num, plural } from "./de";
import { feedState } from "./feeds";
import { nearest, RADIUS } from "./places";
import type { Story } from "./stories";
import type { Data } from "./types";

export type BriefLine = { icon: keyof typeof Ionicons.glyphMap; head: string; text: string; src: string; to: string; alert?: boolean };

const DAY = 864e5;
const ago = (t: string) => Date.now() - new Date(t).getTime();
const ALERT: Record<string, { head: string; icon: BriefLine["icon"]; to: string }> = {
  maritime: { head: "Auf See", icon: "boat-outline", to: "/signal/sea" },
  outage: { head: "Internet", icon: "wifi-outline", to: "/signal/internet" },
  quake: { head: "Erdbeben", icon: "pulse-outline", to: "/signal/quakes" },
  surge: { head: "Viele Meldungen", icon: "newspaper-outline", to: "/news?region=eritrea" },
};

export function briefOf(data: Data, stories: Story[], fresh: number, since: string): BriefLine[] {
  const out: BriefLine[] = [];
  const alerted = new Set<string>();

  // 1. Auffälliges zuerst (automatische Hinweise mit fester Schwelle)
  for (const a of data.alerts) {
    const k = ALERT[a.kind];
    alerted.add(a.kind);
    out.push({ icon: k?.icon || "alert-circle-outline", head: k?.head || "Hinweis", text: a.title, alert: true,
      src: `${fmtWhen(a.t)}${a.source && !a.title.includes(a.source) ? ` · ${a.source}` : ""}`, to: k?.to || "/" });
  }

  // 2. Worüber am meisten berichtet wird (Eritrea, Äthiopien, Tigray), und wie viel
  const day = stories.filter((s) => ago(s.last) < DAY);
  const conflict = day.filter((s) => s.items.some((i) => i.regions.some((r) => r !== "red_sea" && r !== "horn")));
  const top = [...conflict].sort((a, b) => b.sources - a.sources || (a.last < b.last ? 1 : -1))[0];
  if (top && top.sources > 1) {
    out.push({ icon: "megaphone-outline", head: "Meistberichtet", text: headline(top.lead),
      src: `${plural(top.sources, "Medium", "Medien")} · ${plural(Object.keys(top.types).length, "Quellenart", "Quellenarten")} · zuletzt ${fmtWhen(top.last)}`, to: `/item/${top.lead.id}` });
  }
  const n = conflict.reduce((m, s) => m + s.items.filter((i) => ago(i.published_at || i.fetched_at) < DAY).length, 0);
  out.push({ icon: "newspaper-outline", head: "Meldungen", text: n ? `${plural(n, "Meldung", "Meldungen")} in 24 Stunden zu Eritrea, Äthiopien und Tigray${fresh ? `, ${num(fresh)} davon neu ${since}` : ""}.` : "In 24 Stunden keine Meldung zu Eritrea, Äthiopien und Tigray in unseren Quellen.",
    src: "Schlagzeilen aus allen Quellen", to: fresh ? "/news?new=1" : "/news" });

  // 3. Rotes Meer (wenn nicht schon oben)
  const ukmto = feedState(data, "ukmto");
  if (!alerted.has("maritime") && ukmto.ok) {
    const last = data.maritime[0];
    out.push(last && ago(last.t) < 7 * DAY
      ? { icon: "boat-outline", head: "Rotes Meer", text: `Letzter gemeldeter Vorfall ${fmtWhen(last.t)}: ${last.title}`, src: "UKMTO", to: "/signal/sea" }
      : { icon: "boat-outline", head: "Rotes Meer", text: "In den letzten 7 Tagen kein Vorfall gemeldet.", src: "UKMTO", to: "/signal/sea" });
  }

  // 4. Internet in Eritrea (wenn nicht schon oben)
  const ioda = feedState(data, "ioda");
  if (!alerted.has("outage") && ioda.ok) {
    const er = data.outages.filter((o) => o.country === "ER").length;
    out.push({ icon: "wifi-outline", head: "Internet Eritrea", text: er ? `${plural(er, "leichter Rückgang", "leichte Rückgänge")} in 48 Stunden gemessen.` : "In 48 Stunden kein Rückgang gemessen.",
      src: "IODA", to: "/signal/internet" });
  }

  // 5. Hitzepunkte, mit dem Ort, an dem die meisten liegen
  const firms = feedState(data, "firms");
  if (firms.ok && !data.firesError && data.firesTotal) {
    const by = new Map<string, number>();
    for (const f of data.fires) { const p = nearest(f.lat, f.lon); if (p.d <= RADIUS.fire) by.set(p.p.name, (by.get(p.p.name) || 0) + 1); }
    const best = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({ icon: "flame-outline", head: "Hitzepunkte", text: `${data.firesCapped ? "Mindestens " : ""}${num(data.firesTotal)} in 24 Stunden${best ? `, die meisten bei ${best[0]}` : ""}. Hitze, nicht unbedingt Kämpfe.`,
      src: "NASA FIRMS", to: "/signal/fires" });
  }

  // 6. Spürbare Erdbeben (ab Stärke 4,5, 7 Tage), wenn nicht schon oben
  const usgs = feedState(data, "usgs");
  const q = data.quakes.find((x) => (x.mag ?? 0) >= 4.5);
  if (!alerted.has("quake") && usgs.ok && q) out.push({ icon: "pulse-outline", head: "Erdbeben", text: `Stärke ${num(q.mag ?? 0)}, ${q.title.replace(/^Erdbeben (der Stärke [\d,.]+|unbekannter Stärke),\s*/, "")} (${fmtShort(q.t)}).`, src: "USGS", to: "/signal/quakes" });

  return out;
}
