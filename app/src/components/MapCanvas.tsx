// Karte rund um Eritrea: Grundkarte, Messwerte und Satelliten-Orte. Mit zwei Fingern zoomen, mit einem verschieben,
// doppelt tippen vergrößert; im Browser auch Mausrad. Während der Geste wird nur das fertige Bild verschoben (flüssig),
// beim Loslassen neu gezeichnet (scharf).
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import MAP from "../data/map.json";
import REG from "../data/regions.json";
import { fmtCap, fmtCapDay, fmtFull, headline, num, plural } from "../lib/de";
import { font, radius, useTheme } from "../lib/theme";
import { t as tr } from "../lib/i18n";
import { inRange, itemAt, newsAreas, PLACES, type Place, type Range } from "../lib/places";
export type { Range } from "../lib/places";
import type { Data, Item } from "../lib/types";
import { tap } from "./ui";

export type Box = [number, number, number, number];
export const FULL: Box = [0, 0, MAP.width, MAP.height];
export const proj = (lat: number, lon: number): [number, number] => {
  const r = Math.PI / 180;
  return [MAP.translate[0] + MAP.scale * lon * r, MAP.translate[1] - MAP.scale * Math.log(Math.tan(Math.PI / 4 + (lat * r) / 2))];
};
export const boxOf = (north: number, west: number, south: number, east: number): Box => {
  const [x0, y0] = proj(north, west), [x1, y1] = proj(south, east);
  return [x0, y0, x1 - x0, y1 - y0];
};

const MINI_NAMES = new Set(["asmara", "massawa", "assab", "mekelle", "portsudan", "djibouti"]);
const LABELS: [string, number, number][] = [["ERITREA", 15.9, 38.2], ["ÄTHIOPIEN", 10.7, 37.9], ["SUDAN", 17.6, 35.4], ["JEMEN", 15.6, 44.6], ["SAUDI-ARABIEN", 19.3, 41.9],
  ["SOMALIA", 4.6, 45.6], ["SOMALILAND", 9.9, 46.4], ["KENIA", 1.4, 38.6], ["SÜDSUDAN", 7.6, 32.6]];

export type Layers = { fire: boolean; quake: boolean; ship: boolean; sat: boolean; news?: boolean };
export type Mark = { x: number; y: number; kind: string; at: number; when: string; text: string; place?: string; url?: string | null; src?: string; sat?: string; pid?: string; name?: string; minor?: boolean; news?: boolean };

/** Halbmesser der Fläche um einen erwähnten Ort, in Kartenpunkten (etwa 25 km) */
const AREA_KM = 25;
const areaR = (p: Place) => { const [x0] = proj(p.lat, p.lon), [x1] = proj(p.lat, p.lon + AREA_KM / 111); return Math.abs(x1 - x0); };

/** Alle antippbaren Markierungen mit Beschreibung und Herkunft */
export function marksOf(data: Data, layers: Layers, range?: Range): Mark[] {
  const out: Mark[] = [];
  if (layers.news) for (const a of newsAreas(data, range).areas) { const [x, y] = proj(a.p.lat, a.p.lon); out.push({ x, y, kind: tr("Meldungen, die {place} nennen", { place: a.p.name }), at: Math.max(...a.items.map(itemAt)),
    when: a.items.length === 1 ? tr("1 Meldung") : tr("{n} Meldungen", { n: num(a.items.length) }), text: a.items.slice(0, 2).map((i) => `„${headline(i)}“`).join(" "),
    place: tr("erwähnt, nicht verortet"), pid: a.p.id, name: a.p.name, news: true }); }
  if (layers.fire) for (const f of data.fires) { const [x, y] = proj(f.lat, f.lon); out.push({ x, y, kind: tr("Hitzepunkt"), at: +new Date(f.t), when: fmtFull(f.t),
    text: `${f.sat ? `${tr("Satellit {sat}.", { sat: f.sat })} ` : ""}${f.frp != null ? `${tr("Strahlungsleistung {mw} MW.", { mw: num(f.frp) })} ` : ""}${tr("Ein Hitzepunkt ist kein bestätigter Angriff: Auch Feldbrände, Gasfackeln und Vulkane werden erfasst.")}`,
    place: tr("Ort auf etwa 375 m genau"), url: f.url, src: "NASA FIRMS" }); }
  if (layers.quake) for (const q of data.quakes) { if (!inRange(q.t, range)) continue; const [x, y] = proj(q.lat, q.lon); out.push({ x, y, kind: tr("Erdbeben"), at: +new Date(q.t), when: fmtFull(q.t), text: q.title, url: q.url, src: "USGS", place: tr("Ort gemessen (Epizentrum)") }); }
  if (layers.ship) for (const m of data.maritime) { if (!inRange(m.t, range)) continue; const [x, y] = proj(m.lat, m.lon); out.push({ x, y, kind: tr("Vorfall auf See"), at: +new Date(m.t), when: fmtFull(m.t), text: m.title,
    place: tr("Ort ungefähr, wie von UKMTO angegeben"), url: m.url || "https://www.ukmto.org/recent-incidents", src: "UKMTO" }); }
  if (layers.sat) for (const p of data.sat.filter((p) => p.images.length)) { const [x, y] = proj(p.lat, p.lon); out.push({ x, y, kind: tr("Satelliten-Ort"), at: +new Date(p.images[0].t),
    when: tr("neuestes Bild vom {date}", { date: fmtCap(p.images[0].t) }), text: tr("{place}: {count}, das neueste vom {date}.", { place: p.name, count: plural(p.images.length, "klares Bild", "klare Bilder"), date: fmtCapDay(p.images[0].t) }), sat: p.id }); }
  // Orte zuletzt: Messwerte haben beim Antippen Vorrang, weil sie näher gesucht werden
  for (const p of PLACES) { const [x, y] = proj(p.lat, p.lon); out.push({ x, y, kind: tr("Ort"), at: 0, when: p.country, text: "", pid: p.id, name: p.name, minor: !p.major }); }
  return out;
}

/** Ist der sichtbare Ausschnitt schmaler als das (in Kartenpunkten), werden auch kleinere Orte beschriftet */
export const MINOR_W = 260;

/** Nur die Zeichnung (ohne Gesten). k = Kartenpunkte je Bildschirmpunkt, damit Zeichen beim Zoomen gleich groß bleiben. */
export function MapSvg({ data, layers, box, w, h, sel, since, mini, range }: {
  data: Data; layers: Layers; box: Box; w: number; h: number; sel?: Mark | null; since?: number; mini?: boolean; range?: Range;
}) {
  const t = useTheme();
  const k = box[2] / Math.max(w, 1);
  const old = (iso: string) => (since ? +new Date(iso) < since : false);
  const areas = layers.news ? newsAreas(data, range).areas : [];
  const base = useMemo(() => (
    <G>
      <Rect x={-MAP.width} y={-MAP.height} width={MAP.width * 3} height={MAP.height * 3} fill={t.water} />
      {MAP.countries.map((c: any, i: number) => <Path key={i} d={c.d} fill={c.n === "Eritrea" ? t.landEr : t.land} stroke={c.n === "Eritrea" ? t.ink : t.border} strokeWidth={(c.n === "Eritrea" ? 1.4 : 0.8) * k} />)}
      {["Ethiopia", "Eritrea", "Somalia", "Sudan"].map((n) => (REG as any)[n] ? <Path key={n} d={(REG as any)[n]} fill="none" stroke={t.border} strokeWidth={0.8 * k} strokeDasharray={`${3 * k} ${3 * k}`} /> : null)}
      {mini ? null : LABELS.map(([n, la, lo]) => { const [x, y] = proj(la, lo); return <SvgText fontFamily={font.semibold} key={n} x={x} y={y} fontSize={11 * k} fontWeight="700" letterSpacing={1.5 * k} fill={t.muted} textAnchor="middle">{tr(n)}</SvgText>; })}
      {mini ? null : (() => { const [x, y] = proj(16.9, 40.4); return <SvgText fontFamily={font.semibold} x={x} y={y} fontSize={12 * k} fontStyle="italic" fill={t.accent} textAnchor="middle" transform={`rotate(-32 ${x} ${y})`}>{tr("Rotes Meer")}</SvgText>; })()}
      {mini ? null : [["TIGRAY", 13.78, 38.44], ["AFAR", 13.3, 40.3], ["AMHARA", 11.58, 38.05], ["OROMIA", 8.1, 38.9]].map(([n, la, lo]) => { const [x, y] = proj(la as number, lo as number);
        return <SvgText fontFamily={font.semibold} key={n as string} x={x} y={y} fontSize={9.5 * k} fontStyle="italic" fontWeight="700" letterSpacing={1 * k} fill={t.faint} textAnchor="middle">{tr(n as string)}</SvgText>; })}
    </G>
  ), [t, k, mini]);
  // Alle Hitzepunkte als ein einziger Pfad aus Kreisen: ein Zeichenobjekt statt Tausender (wichtig auf schwächeren Handys)
  const fires = useMemo(() => {
    if (!layers.fire || !data.fires.length) return null;
    const r = (mini ? 2.2 : 2.6) * k, d2 = 2 * r;
    let d = "";
    for (const f of data.fires) { const [x, y] = proj(f.lat, f.lon); d += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${d2.toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-d2).toFixed(2)} 0`; }
    return <Path d={d} fill={t.fire} opacity={0.85} />;
  }, [data, layers.fire, t, k, mini]);
  return (
    <Svg width={w} height={h} viewBox={box.join(" ")}>
      {base}
      {/* Erwähnte Orte: Fläche statt Punkt, gestrichelt (erwähnt, nicht verortet). Zahl = Meldungen im Zeitfenster. */}
      {areas.map((a) => { const [x, y] = proj(a.p.lat, a.p.lon); const r = Math.max(areaR(a.p), (8 + Math.min(10, 2.5 * Math.log2(a.items.length + 1))) * k);
        return (
          <G key={`n${a.p.id}`}>
            <Circle cx={x} cy={y} r={r} fill={t.accent} opacity={0.14} />
            <Circle cx={x} cy={y} r={r} fill="none" stroke={t.accent} strokeWidth={1.2 * k} strokeDasharray={`${3 * k} ${2.5 * k}`} />
            {r / k >= 11 ? <SvgText fontFamily={font.bold} x={x} y={y + 3.6 * k} fontSize={10 * k} fill={t.accent} textAnchor="middle">{String(a.items.length)}</SvgText> : null}
          </G>); })}
      {fires}
      {layers.quake && data.quakes.filter((q) => inRange(q.t, range)).map((q, i) => { const [x, y] = proj(q.lat, q.lon);
        return <Circle key={`q${i}`} cx={x} cy={y} r={(4 + 2 * Math.max(0, (q.mag || 2.5) - 2.5)) * k} fill="none" stroke={t.quake} strokeWidth={2 * k} opacity={old(q.t) ? 0.25 : 1} />; })}
      {layers.sat && data.sat.filter((p) => p.images.length).map((p) => { const [x, y] = proj(p.lat, p.lon); const s = 9 * k;
        return <Rect key={p.id} x={x - s / 2} y={y - s / 2} width={s} height={s} fill="none" stroke={t.accent} strokeWidth={1.6 * k} />; })}
      {/* Auswahlring unter den Ortsnamen, damit er keinen Namen verdeckt */}
      {sel ? <Circle cx={sel.x} cy={sel.y} r={12 * k} fill="none" stroke={t.ink} strokeWidth={2.2 * k} /> : null}
      {PLACES.filter((p) => (mini ? MINI_NAMES.has(p.id) : p.major || box[2] < MINOR_W)).map(({ name: n, lat: la, lon: lo, left, dy = 0 }) => { const [x, y] = proj(la, lo);
        const fs = (mini ? 10 : 11) * k, ty = y + (4 + dy) * k, anchor = left ? "end" : "start";
        // Am Kartenrand nicht abschneiden: Name so weit nach innen schieben, dass er ganz sichtbar bleibt (Breite grob geschätzt)
        const wEst = n.length * fs * 0.56, pad = 4 * k;
        const tx = left ? Math.max(x - 5 * k, box[0] + wEst + pad) : Math.min(x + 5 * k, box[0] + box[2] - wEst - pad);
        return (
        <G key={n}>
          <Circle cx={x} cy={y} r={2.2 * k} fill={t.ink} />
          {/* Heller Rand um die Schrift, damit Namen auf Grenzen und Punkten lesbar bleiben */}
          <SvgText fontFamily={font.semibold} x={tx} y={ty} fontSize={fs} fill={t.land} stroke={t.land} strokeWidth={3 * k} strokeLinejoin="round" opacity={0.85} textAnchor={anchor}>{n}</SvgText>
          <SvgText fontFamily={font.semibold} x={tx} y={ty} fontSize={fs} fill={t.ink} textAnchor={anchor}>{n}</SvgText>
        </G>); })}
      {layers.ship && data.maritime.filter((m) => inRange(m.t, range)).map((m, i) => { const [x, y] = proj(m.lat, m.lon); const s = 7 * k;
        return <Path key={`m${i}`} d={`M${x} ${y - s}l${s} ${s}l${-s} ${s}l${-s} ${-s}z`} fill={t.ship} stroke={t.card} strokeWidth={1 * k} opacity={old(m.t) ? 0.3 : 1} />; })}
    </Svg>
  );
}

// Ausschnitt an das Seitenverhältnis anpassen und innerhalb der Karte halten
// Stärkste Vergrößerung: etwa 60 Kartenpunkte breit (rund 100 km)
const MIN_W = 60;
export function fit(b: Box, aspect: number): Box {
  let [x, y, bw, bh] = b;
  const cx = x + bw / 2, cy = y + bh / 2;
  if (bh / bw > aspect) bw = bh / aspect; else bh = bw * aspect;
  const maxW = Math.min(MAP.width, MAP.height / aspect);
  if (bw > maxW) { bw = maxW; bh = bw * aspect; }
  if (bw < MIN_W) { bw = MIN_W; bh = bw * aspect; }
  x = Math.min(Math.max(cx - bw / 2, 0), MAP.width - bw);
  y = Math.min(Math.max(cy - bh / 2, 0), MAP.height - bh);
  return [x, y, bw, bh];
}

export function ZoomMap({ data, layers, w, h, box, onBox, sel, onSelect, since, range, home }: {
  data: Data; layers: Layers; w: number; h: number; box: Box; onBox: (b: Box) => void; sel: Mark | null; onSelect: (m: Mark | null) => void; since?: number; range?: Range;
  /** Ausschnitt für „Ganze Karte“ (sonst das ganze Horn von Afrika) */ home?: Box;
}) {
  const t = useTheme();
  const marks = useMemo(() => marksOf(data, layers, range), [data, layers, range?.[0], range?.[1]]);
  const tx = useRef(new Animated.Value(0)).current, ty = useRef(new Animated.Value(0)).current, sc = useRef(new Animated.Value(1)).current;
  const g = useRef({ m0: [0, 0], d0: 0, s: 1, T: [0, 0], moved: false, pinch: false, lastTap: 0, start: [0, 0] });
  const live = useRef({ box, w, h, marks, onBox, onSelect });
  live.current = { box, w, h, marks, onBox, onSelect };
  const viewRef = useRef<View>(null);
  const origin = useRef([0, 0]);

  // Nach dem Neuzeichnen die vorläufige Verschiebung zurücksetzen
  useLayoutEffect(() => { tx.setValue(0); ty.setValue(0); sc.setValue(1); }, [box]);

  const commit = (s: number, T: number[]) => {
    const { box: b, w: W, h: H } = live.current;
    const k = b[2] / W;
    // Bildschirmpunkt q zeigt den Inhalt p = c + (q - c - T) / s
    const cx = W / 2, cy = H / 2;
    const p0x = cx + (0 - cx - T[0]) / s, p0y = cy + (0 - cy - T[1]) / s;
    live.current.onBox(fit([b[0] + p0x * k, b[1] + p0y * k, b[2] / s, b[3] / s], H / W));
  };
  const zoomAt = (qx: number, qy: number, f: number) => {
    const { box: b, w: W, h: H } = live.current;
    const k = b[2] / W;
    const mx = b[0] + qx * k, my = b[1] + qy * k;
    const nw = b[2] / f, nh = b[3] / f;
    live.current.onBox(fit([mx - (qx / W) * nw, my - (qy / H) * nh, nw, nh], H / W));
  };
  const hit = (qx: number, qy: number) => {
    const { box: b, w: W, marks: M } = live.current;
    const k = b[2] / W;
    const x = b[0] + qx * k, y = b[1] + qy * k;
    let best: Mark | null = null, bd = (22 * k) ** 2;
    for (const m of M) { if (m.minor && b[2] >= MINOR_W) continue; const d = ((m.x - x) ** 2 + (m.y - y) ** 2) * (m.pid ? 1.6 : 1); if (d < bd) { bd = d; best = m; } }
    if (best) tap();
    live.current.onSelect(best);
  };
  // Browser: Lage der Karte direkt abfragen (synchron), damit Tippen und Ziehen auch nach dem Scrollen stimmen
  const measure = () => {
    if (Platform.OS !== "web") return;
    const r = (viewRef.current as any)?.getBoundingClientRect?.();
    if (r) origin.current = [r.left + window.scrollX, r.top + window.scrollY];
  };
  const local = (e: any): [number, number] => {
    const n = e.nativeEvent;
    return Platform.OS === "web" ? [n.pageX - origin.current[0], n.pageY - origin.current[1]] : [n.locationX, n.locationY];
  };
  const touches = (e: any): [number, number][] => (e.nativeEvent.touches || []).map((x: any) => (Platform.OS === "web" ? [x.pageX - origin.current[0], x.pageY - origin.current[1]] : [x.locationX, x.locationY]));

  const pr = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      measure();
      const G = g.current;
      G.moved = false; G.pinch = false; G.s = 1; G.T = [0, 0];
      G.start = local(e);
      G.m0 = G.start; G.d0 = 0;
    },
    onPanResponderMove: (e, gs) => {
      const G = g.current, { w: W, h: H } = live.current;
      const tt = touches(e);
      if (tt.length >= 2) {
        const [a, b] = tt;
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (!G.pinch) { G.pinch = true; G.m0 = [m[0] - G.T[0], m[1] - G.T[1]]; G.d0 = d / G.s; }
        G.s = Math.min(8, Math.max(0.5, d / Math.max(G.d0, 1)));
        const c = [W / 2, H / 2];
        G.T = [(m[0] - c[0]) - G.s * (G.m0[0] - c[0]), (m[1] - c[1]) - G.s * (G.m0[1] - c[1])];
        G.moved = true;
      } else if (!G.pinch) {
        if (Math.abs(gs.dx) + Math.abs(gs.dy) > 6) G.moved = true;
        G.T = [gs.dx, gs.dy];
      }
      tx.setValue(G.T[0]); ty.setValue(G.T[1]); sc.setValue(G.s);
    },
    onPanResponderRelease: (e) => {
      const G = g.current;
      if (G.moved) { commit(G.s, G.T); return; }
      const now = Date.now();
      if (now - G.lastTap < 300) { G.lastTap = 0; zoomAt(G.start[0], G.start[1], 2); return; }
      G.lastTap = now;
      hit(G.start[0], G.start[1]);
    },
    onPanResponderTerminate: () => { const G = g.current; if (G.moved) commit(G.s, G.T); else { tx.setValue(0); ty.setValue(0); sc.setValue(1); } },
  }), []);

  // Browser: Mausrad zoomt um den Mauszeiger
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = viewRef.current as any as HTMLElement | null;
    if (!el?.addEventListener) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(ev.clientX - r.left, ev.clientY - r.top, ev.deltaY < 0 ? 1.25 : 0.8);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomed = box[2] < fit(home || FULL, h / w)[2] * 0.98;
  const btn = (icon: keyof typeof Ionicons.glyphMap, label: string, onPress: () => void) => (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => ({ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
      <Ionicons name={icon} size={20} color={t.ink} />
    </Pressable>
  );
  return (
    <View style={{ width: w, height: h, overflow: "hidden", backgroundColor: t.water }}>
      <View ref={viewRef} collapsable={false} {...pr.panHandlers} onLayout={measure}
        accessible accessibilityLabel={tr("Karte. Mit zwei Fingern zoomen, doppelt tippen zum Vergrößern, auf eine Markierung tippen für Einzelheiten.")}
        style={{ width: w, height: h, ...(Platform.OS === "web" ? { cursor: "grab", touchAction: "none", userSelect: "none" } as any : {}) }}>
        <Animated.View pointerEvents="none" style={{ width: w, height: h, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] }}>
          <MapSvg data={data} layers={layers} box={box} w={w} h={h} sel={sel} since={since} range={range} />
        </Animated.View>
      </View>
      <View style={{ position: "absolute", right: 10, top: 10, borderRadius: radius.m, backgroundColor: t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, overflow: "hidden" }}>
        {btn("add", tr("Vergrößern"), () => zoomAt(w / 2, h / 2, 1.6))}
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.rule }} />
        {btn("remove", tr("Verkleinern"), () => zoomAt(w / 2, h / 2, 1 / 1.6))}
        {zoomed ? <><View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.rule }} />{btn("scan-outline", tr("Ganze Karte"), () => onBox(fit(home || FULL, h / w)))}</> : null}
      </View>
    </View>
  );
}
