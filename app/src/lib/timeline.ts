// Zeitfenster für die Karte: die letzten Kalendertage in deutscher Zeit (zum Abspielen Tag für Tag).
// Tests: tests/unit/lib.test.mjs
import { fmtDay } from "./de";

// Tagesgrenzen in deutscher Zeit (für das Abspielen Tag für Tag)
export const berlinOffset = (d: Date) => {
  try { const p = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "shortOffset" }).formatToParts(d).find((x) => x.type === "timeZoneName")?.value || "";
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(p); return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 60; } catch { return 60; }
};
/** Die letzten 7 Kalendertage (deutsche Zeit) als Zeitfenster, ältester zuerst */
export function lastDays(now: number, n = 7): { start: number; end: number; label: string }[] {
  const out: { start: number; end: number; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * 864e5);
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    // Mitternacht in Berlin: Abstand zu UTC zur Mitternacht selbst bestimmen (am Tag der Zeitumstellung ändert er sich um 3 Uhr)
    const utc0 = Date.parse(`${ymd}T00:00:00Z`);
    let start = utc0 - berlinOffset(d) * 60e3;
    start = utc0 - berlinOffset(new Date(start)) * 60e3;
    out.push({ start, end: Math.min(start + 864e5 - 1, now), label: fmtDay(d) });
  }
  return out;
}
