// Einheitentests für die reine Logik der App (ohne Bildschirm): Prüfstufen, Ereignisarten, Lage-Zusammenfassung,
// Quellen-Zustände, Zeitfenster und Zeitzonen, Satelliten-Angaben, erwähnte Orte auf der Karte, Übersetzungen.
// Aufruf: cd tests/unit && npm install && npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { normStatus, STATUS, STATUS_ORDER, fmtTime, REGION_ORDER, REGIONS } from "../../app/src/lib/de";
import { eventTypes, eventCounts } from "../../app/src/lib/events";
import { briefOf, multiSided } from "../../app/src/lib/brief";
import { assess, sideOf } from "../../app/src/lib/assess";
import { sourceState, NOT_SET_UP } from "../../app/src/lib/feeds";
import { lastDays } from "../../app/src/lib/timeline";
import { processedOf, copernicusUrl, stacUrl } from "../../app/src/lib/sat";
import { newsAreas, inRange, placesIn } from "../../app/src/lib/places";
import { cluster, dedupe } from "../../app/src/lib/stories";
import { setLangNow, t, missing } from "../../app/src/lib/i18n";
import type { Data, Item } from "../../app/src/lib/types";

const H = 3600e3;
const NOW = Date.parse("2026-10-12T12:00:00Z");
const iso = (h: number) => new Date(NOW - h * H).toISOString();
let n = 0;
const item = (title: string, regions: string[], h: number, o: Partial<Item> = {}): Item => ({
  id: ++n, title, url: `https://example.org/${n}`, language: "en", regions, origin_domain: null, published_at: iso(h), fetched_at: iso(h),
  source_id: o.source_id || "dw", source_name: o.source_name || "DW", source_type: o.source_type || "international", ...o,
});
const src = (id: string, o: Record<string, unknown> = {}) => ({ id, name: id, kind: "rss", source_type: "international", homepage: null, stance_note: null,
  last_ok_at: iso(0.5), last_fetch_at: iso(0.5), last_error: null, last_item_count: 3, ...o }) as any;
const data = (items: Item[], extra: Partial<Data> = {}): Data => ({
  now: iso(0), owner: false, sources: [src("dw"), src("firms", { kind: "firms", source_type: "measurement" })], sourcesOff: [], reports: [], items,
  fires: [], firesTotal: 0, firesCapped: false, quakes: [], maritime: [], outages: [], alerts: [], claims: [], sat: [], ...extra,
});

test("Prüfstufen: alte Schlüssel werden auf die neuen abgebildet", () => {
  assert.equal(normStatus("confirmed"), "supported");
  assert.equal(normStatus("likely"), "partly");
  assert.equal(normStatus("unconfirmed"), "unverified");
  assert.equal(normStatus("disputed"), "conflicting");
  assert.equal(normStatus("false"), "refuted");
  assert.equal(normStatus("checking"), "checking");
  assert.equal(normStatus(null), "unverified");
  assert.deepEqual(STATUS_ORDER, ["unverified", "checking", "partly", "supported", "conflicting", "refuted", "unverifiable"]);
  for (const k of STATUS_ORDER) assert.ok(STATUS[k][0] && STATUS[k][1], k);
});

test("Ereignisarten: Stichwörter, Vorrang und höchstens zwei", () => {
  assert.deepEqual(eventTypes({ title: "Ethiopian troops clash with Fano militia near Gondar", language: "en" }), ["clashes", "military"]);
  assert.deepEqual(eventTypes({ title: "Tanker attacked in the Red Sea", language: "en" }), ["clashes", "maritime"]);
  assert.deepEqual(eventTypes({ title: "UN envoy holds talks in Asmara", language: "en" }), ["diplomacy"]);
  assert.deepEqual(eventTypes({ title: "Internet shutdown hits Tigray", language: "en" }), ["infrastructure"]);
  assert.deepEqual(eventTypes({ title: "Refugees arrive in eastern Sudan", language: "en" }), ["humanitarian"]);
  assert.deepEqual(eventTypes({ title: "Ministry dismisses fake video as propaganda", language: "en" }), ["disinformation"]);
  assert.deepEqual(eventTypes({ title: "Football: Asmara club wins cup", language: "en" }), []);
  // Nicht englisch: die englische Übersetzung zählt, sonst die deutsche
  assert.deepEqual(eventTypes({ title: "ዜና", language: "ti", title_en: "Border crossing reopened" }), ["border"]);
  assert.deepEqual(eventTypes({ title: "ዜና", language: "ti", title_de: "Gespräche über die Grenze" }), ["border", "diplomacy"]);
  assert.deepEqual(eventTypes({ title: "ዜና", language: "ti" }), []);
  for (const t2 of ["Army attacks rebels, ships damaged, aid blocked at border talks"]) assert.ok(eventTypes({ title: t2, language: "en" }).length <= 2);
  const c = eventCounts([{ title: "Troops deploy", language: "en" }, { title: "Weather", language: "en" }]);
  assert.equal(c.military, 1); assert.equal(c.other, 1);
});

test("Lage: zu wenige Meldungen → keine verlässliche Zusammenfassung", () => {
  const d = data([item("Eritrea talks", ["eritrea"], 1)]);
  const b = briefOf(d, cluster(dedupe(d.items)), { hours: 24, fresh: 0, since: "", now: NOW });
  assert.equal(b.reliable, false);
  assert.match(String(b.reason), /1 Meldung/);
});

test("Lage: genug Meldungen, Zeitraum 24 Std. und 7 Tage", () => {
  const its = [item("Eritrea and Ethiopia exchange accusations over Assab", ["eritrea", "ethiopia"], 1),
    item("Tigray leaders meet in Mekelle", ["tigray"], 2), item("Fano fighters in Amhara", ["amhara", "ethiopia"], 3),
    item("Old report from Afar", ["afar"], 100)];
  const d = data(its);
  const s = cluster(dedupe(d.items));
  const b24 = briefOf(d, s, { hours: 24, fresh: 0, since: "", now: NOW });
  assert.equal(b24.reliable, true);
  assert.equal(b24.reports, 3);
  const b7 = briefOf(d, s, { hours: 168, fresh: 0, since: "", now: NOW });
  assert.equal(b7.reports, 4);
  assert.ok(b7.lines.some((l) => /in 7 Tagen/.test(l.text)));
  // Lücken: Somalia, Sudan, Dschibuti ohne Meldung
  assert.ok(b24.gaps.some((g) => /Somalia/.test(g.text) && /Sudan/.test(g.text)));
  // Nicht eingerichtete Quellen werden als Lücke genannt
  assert.ok(b24.gaps.some((g) => /ReliefWeb/.test(g.text)));
  assert.equal(NOT_SET_UP.length, 2);
});

test("Lage: gestörte Quellen sind eine Lücke; viele gestörte → nicht verlässlich", () => {
  const its = [1, 2, 3, 4].map((h) => item(`Eritrea item ${h}`, ["eritrea"], h));
  const bad = { last_error: "HTTP 500", last_ok_at: iso(30), last_fetch_at: iso(0.5) };
  const d = data(its, { sources: [src("a", bad), src("b", bad), src("c")] });
  const b = briefOf(d, cluster(dedupe(d.items)), { hours: 24, fresh: 0, since: "", now: NOW });
  assert.ok(b.gaps.some((g) => /gestört/.test(g.text)));
  assert.equal(b.reliable, false);
  assert.match(String(b.reason), /2 von 3/);
});

test("Einordnung: eine Quelle, eine Seite, bestritten, von außen, verschiedene Seiten", () => {
  const er = (t2: string, src2: string) => item(t2, ["eritrea"], 1, { source_id: src2, source_name: src2, source_type: "government_er" });
  assert.equal(assess([item("Troops seen near Adigrat", ["tigray"], 1)]).kind, "single");
  assert.equal(assess([er("Asmara statement", "shabait"), er("Asmara statement again", "eritreaprofile")]).kind, "oneSide");
  assert.equal(assess([item("Report A", ["eritrea"], 1, { source_name: "DW" }), item("Report B", ["eritrea"], 2, { source_name: "AJ" })]).kind, "outside");
  assert.equal(assess([er("Statement", "shabait"), item("Report", ["eritrea"], 2, { source_name: "DW" })]).kind, "multi");
  // Widerspruch hat Vorrang, auch bei vielen Quellen
  assert.equal(assess([er("Eritrea denies troop presence", "shabait"), item("Troops reported", ["eritrea"], 2, { source_name: "DW" })]).kind, "contested");
  assert.equal(assess([item("Ministerium bestreitet Bericht", ["eritrea"], 1, { language: "de" })]).kind, "contested");
  // Exil und Regierung sind verschiedene Seiten
  assert.equal(assess([er("A", "shabait"), item("B", ["eritrea"], 1, { source_name: "Awate", source_type: "exile" })]).kind, "multi");
  assert.equal(sideOf("progov_et"), "et_gov");
  assert.equal(sideOf("somali_media"), "outside");
  // Nie ein Wahrheitsurteil in den Texten
  for (const a of [assess([item("x", ["eritrea"], 1)])]) assert.doesNotMatch(a.text, /\b(stimmt|wahr|bestätigt)\b(?! es nicht)/);
});

test("Lage: Was kursiert wird gezählt", () => {
  const its = [item("Eritrea denies border clash", ["eritrea"], 1), item("Tigray leaders meet in Mekelle", ["tigray"], 2), item("Fano fighters in Amhara", ["amhara", "ethiopia"], 3)];
  const d = data(its);
  const b = briefOf(d, cluster(dedupe(d.items)), { hours: 24, fresh: 0, since: "", now: NOW });
  const line = b.lines.find((l) => l.head === "Was kursiert")!;
  assert.ok(line, "Zeile fehlt");
  assert.match(line.text, /1 bestritten/);
  assert.match(line.text, /2 nur aus einer Quelle/);
});

test("Geschichten von mehreren Seiten: verschiedene Quellenarten nötig", () => {
  const its = [item("Eritrea Ethiopia Assab port dispute escalates sharply", ["eritrea"], 1, { source_id: "a", source_name: "A", source_type: "international" }),
    item("Assab port dispute between Eritrea Ethiopia escalates", ["eritrea"], 2, { source_id: "b", source_name: "B", source_type: "progov_et" })];
  const s = cluster(dedupe(its));
  assert.equal(s.length, 1);
  assert.equal(multiSided(s[0]), true);
  const same = cluster(dedupe([its[0], { ...its[1], source_type: "international" }]));
  assert.equal(multiSided(same[0]), false);
});

test("Quellen-Zustände", () => {
  const now = NOW;
  assert.equal(sourceState({ kind: "rss", last_ok_at: null, last_fetch_at: null, last_error: null }, now), "never");
  assert.equal(sourceState({ kind: "rss", last_ok_at: null, last_fetch_at: iso(1), last_error: "HTTP 403" }, now), "access");
  assert.equal(sourceState({ kind: "rss", last_ok_at: iso(30), last_fetch_at: iso(1), last_error: "HTTP 500" }, now), "failed");
  assert.equal(sourceState({ kind: "rss", last_ok_at: iso(5), last_fetch_at: iso(5), last_error: null }, now), "stale");
  assert.equal(sourceState({ kind: "rss", last_ok_at: iso(1), last_fetch_at: iso(1), last_error: null, newest_item_at: iso(24 * 20) }, now), "stale");
  assert.equal(sourceState({ kind: "rss", last_ok_at: iso(1), last_fetch_at: iso(1), last_error: null, runs: { n: 20, kept: 0 } }, now), "empty");
  assert.equal(sourceState({ kind: "firms", last_ok_at: iso(1), last_fetch_at: iso(1), last_error: null, runs: { n: 20, kept: 0 } }, now), "current");
  // Ein alter Fehler zählt nicht, wenn danach wieder ein Abruf gelang
  assert.equal(sourceState({ kind: "rss", last_ok_at: iso(0.5), last_fetch_at: iso(0.5), last_error: "HTTP 500" }, now), "current");
});

test("Zeitfenster: Kalendertage in deutscher Zeit, auch über die Zeitumstellung", () => {
  const days = lastDays(Date.parse("2026-10-26T12:00:00Z"));
  assert.equal(days.length, 7);
  for (let i = 1; i < days.length; i++) assert.ok(days[i].start > days[i - 1].start);
  // 25. Oktober 2026: Sommerzeit endet. Der Tag beginnt um 22:00 UTC am 24., der 26. um 23:00 UTC am 25.
  assert.equal(new Date(days[5].start).toISOString(), "2026-10-24T22:00:00.000Z");
  assert.equal(new Date(days[6].start).toISOString(), "2026-10-25T23:00:00.000Z");
  assert.equal(days[6].end, Date.parse("2026-10-26T12:00:00Z"));
  // Frühjahr: 29. März 2026 beginnt die Sommerzeit
  const spring = lastDays(Date.parse("2026-03-30T12:00:00Z"));
  assert.equal(new Date(spring[5].start).toISOString(), "2026-03-28T23:00:00.000Z");
  assert.equal(new Date(spring[6].start).toISOString(), "2026-03-29T22:00:00.000Z");
  assert.ok(inRange("2026-10-25T12:00:00Z", [days[5].start, days[5].end]));
  assert.ok(!inRange("2026-10-25T23:30:00Z", [days[5].start, days[5].end]));
});

test("Zeitzonen: Anzeige in Berliner Zeit (Sommer und Winter)", () => {
  setLangNow("de");
  assert.equal(fmtTime("2026-10-12T10:00:00Z"), "12:00");
  assert.equal(fmtTime("2026-12-12T10:00:00Z"), "11:00");
});

test("Satellit: Verarbeitungszeit aus dem Produktnamen, Links", () => {
  assert.equal(processedOf("S2A_MSIL2A_20261011T074021_R092_T37PEQ_20261011T111907"), "2026-10-11T11:19:07Z");
  assert.equal(processedOf("S2C_TEST_A"), null);
  assert.equal(processedOf(""), null);
  const u = copernicusUrl(15.3333, 38.9333, "2026-10-11T07:40:21.024Z");
  assert.match(u, /lat=15\.3333&lng=38\.9333/);
  assert.match(u, /fromTime=2026-10-11T00%3A00/);
  assert.match(stacUrl("S2A_X"), /sentinel-2-l2a\/items\/S2A_X$/);
});

test("Karte: erwähnte Orte als Flächen, nur im Zeitfenster, Meldungen ohne Ort zählen extra", () => {
  const its = [item("Shelling reported near Mogadishu", ["somalia"], 2), item("Talks in Asmara", ["eritrea"], 3),
    item("Asmara airport closed", ["eritrea"], 100), item("Ethiopia budget debate", ["ethiopia"], 1)];
  const d = data(its);
  const day: [number, number] = [NOW - 24 * H, NOW];
  const r = newsAreas(d, day);
  const ids = r.areas.map((a) => a.p.id).sort();
  assert.deepEqual(ids, ["asmara", "mogadishu"]);
  assert.equal(r.areas.find((a) => a.p.id === "asmara")!.items.length, 1);
  assert.equal(r.unplaced, 1);
  assert.equal(newsAreas(d).areas.find((a) => a.p.id === "asmara")!.items.length, 2);
  // Mehrdeutige Namen nur mit Zusammenhang
  assert.deepEqual(placesIn("Adama Smith wins award").map((p) => p.id), []);
  assert.deepEqual(placesIn("Protest in Adama, Oromia").map((p) => p.id), ["adama"]);
});

test("Regionen: alle mit Namen", () => {
  for (const r of REGION_ORDER) assert.ok(REGIONS[r], r);
  assert.ok(REGION_ORDER.includes("somalia") && REGION_ORDER.includes("sudan") && REGION_ORDER.includes("djibouti"));
});

test("Übersetzungen: neue Stufen und Zustände vorhanden", () => {
  const keys = ["Ungeprüft", "In Prüfung", "Teilweise gestützt", "Durch unabhängige Quellen gestützt", "Widersprüchliche Beweislage", "Widerlegt",
    "Nicht verifizierbar", "Zugang verweigert", "Veraltet", "Nicht eingerichtet", "Gefechte und Angriffe", "erwähnt, nicht verortet"];
  assert.deepEqual(missing(keys), { en: [], ti: [] });
  setLangNow("en"); assert.equal(t("Widerlegt"), "Refuted");
  setLangNow("ti"); assert.equal(t("Widerlegt"), "ዝተነጸገ");
  setLangNow("de");
});
