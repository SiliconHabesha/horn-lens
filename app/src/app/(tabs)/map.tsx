// Karte: Hitzepunkte, Erdbeben, Vorfälle auf See und Satelliten-Orte. Tippen zeigt, was es ist und woher es stammt.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { GestureResponderEvent, LayoutChangeEvent, Pressable, View } from "react-native";
import Svg, { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";
import MAP from "../../data/map.json";
import REG from "../../data/regions.json";
import { Button, Card, Chip, ChipRow, openLink, Screen, T } from "../../components/ui";
import { fmtCap, fmtCapDay, fmtFull, num, plural } from "../../lib/de";
import { useData } from "../../lib/data";
import { feedState, noData } from "../../lib/feeds";
import { font, radius, space, useTheme } from "../../lib/theme";

const PLACES: [string, number, number, boolean][] = [
  ["Asmara", 15.333, 38.933, false], ["Massawa", 15.609, 39.45, false], ["Assab", 13.009, 42.739, true],
  ["Tesseney", 15.11, 36.657, false], ["Badme", 14.726, 37.803, false], ["Zalambessa", 14.517, 39.383, true],
  ["Adigrat", 14.277, 39.462, false], ["Mekelle", 13.497, 39.475, false], ["Shire", 14.104, 38.284, false],
  ["Humera", 14.297, 36.617, false], ["Alamata", 12.416, 39.554, false], ["Semera", 11.792, 41.006, false],
  ["Sawa", 15.699, 36.974, false], ["Bure", 12.601, 42.27, true], ["Bab el-Mandeb", 12.583, 43.333, false],
  ["Mokka", 13.32, 43.25, false], ["Hudaida", 14.798, 42.954, false], ["Port Sudan", 19.616, 37.216, false], ["Dschibuti", 11.588, 43.145, false],
];
const LABELS: [string, number, number][] = [["ERITREA", 15.9, 38.2], ["ÄTHIOPIEN", 11.3, 37.6], ["SUDAN", 17.6, 35.4], ["JEMEN", 15.6, 44.6], ["SAUDI-ARABIEN", 19.3, 41.9], ["DSCHIBUTI", 11.15, 42.3]];
const proj = (lat: number, lon: number): [number, number] => {
  const r = Math.PI / 180;
  return [MAP.translate[0] + MAP.scale * lon * r, MAP.translate[1] - MAP.scale * Math.log(Math.tan(Math.PI / 4 + (lat * r) / 2))];
};
// Ausschnitte: ganzes Gebiet, Norden (Asmara bis Tigray), Süden (Assab bis Bab el-Mandeb)
const VIEWS: Record<string, { label: string; box: [number, number, number, number] | null }> = {
  all: { label: "Gesamt", box: null },
  north: { label: "Asmara und Tigray", box: (() => { const [x0, y0] = proj(16.3, 36.3); const [x1, y1] = proj(13.2, 40.2); return [x0, y0, x1 - x0, y1 - y0] as [number, number, number, number]; })() },
  south: { label: "Assab und Bab el-Mandeb", box: (() => { const [x0, y0] = proj(14.2, 41.3); const [x1, y1] = proj(12.1, 43.9); return [x0, y0, x1 - x0, y1 - y0] as [number, number, number, number]; })() },
};

type Mark = { x: number; y: number; kind: string; when: string; text: string; url?: string | null; src?: string; sat?: string };

export default function MapScreen() {
  const t = useTheme();
  const { data } = useData();
  const [view, setView] = useState("all");
  const [layers, setLayers] = useState({ fire: true, quake: true, ship: true, sat: true });
  const [sel, setSel] = useState<Mark | null>(null);
  const [w, setW] = useState(0);
  const box = VIEWS[view].box || [0, 0, MAP.width, MAP.height];
  const k = box[2] / Math.max(w, 1); // Kartenpunkte pro Bildschirmpunkt: Zeichen bleiben beim Zoomen gleich groß

  const marks = useMemo(() => {
    if (!data) return [] as Mark[];
    const out: Mark[] = [];
    if (layers.fire) for (const f of data.fires) { const [x, y] = proj(f.lat, f.lon); out.push({ x, y, kind: "Hitzepunkt", when: fmtFull(f.t),
      text: `${f.sat ? `Satellit ${f.sat}. ` : ""}${f.frp != null ? `Strahlungsleistung ${num(f.frp)} MW. ` : ""}Ein Hitzepunkt ist kein bestätigter Angriff: Auch Feldbrände, Gasfackeln und Vulkane werden erfasst.`, url: f.url, src: "NASA FIRMS" }); }
    if (layers.quake) for (const q of data.quakes) { const [x, y] = proj(q.lat, q.lon); out.push({ x, y, kind: "Erdbeben", when: fmtFull(q.t), text: q.title, url: q.url, src: "USGS" }); }
    if (layers.ship) for (const m of data.maritime) { const [x, y] = proj(m.lat, m.lon); out.push({ x, y, kind: "Vorfall auf See", when: fmtFull(m.t), text: m.title, url: m.url || "https://www.ukmto.org/recent-incidents", src: "UKMTO" }); }
    if (layers.sat) for (const p of data.sat.filter((p) => p.images.length)) { const [x, y] = proj(p.lat, p.lon); out.push({ x, y, kind: "Satelliten-Ort", when: `neuestes Bild vom ${fmtCap(p.images[0].t)}`,
      text: `${p.name}: ${plural(p.images.length, "klares Bild", "klare Bilder")}, das neueste vom ${fmtCapDay(p.images[0].t)}.`, sat: p.id }); }
    return out;
  }, [data, layers]);

  // Hintergrund und Hitzepunkte nur neu zeichnen, wenn sich Ausschnitt, Farben oder Daten ändern (sonst ruckelt das Antippen)
  const baseLayer = useMemo(() => (
            <G>
              <Rect x={0} y={0} width={MAP.width} height={MAP.height} fill={t.water} />
              {MAP.countries.map((c: any, i: number) => <Path key={i} d={c.d} fill={c.n === "Eritrea" ? t.landEr : t.land} stroke={c.n === "Eritrea" ? t.ink : t.border} strokeWidth={(c.n === "Eritrea" ? 1.4 : 0.8) * k} />)}
              <Path d={(REG as any).Ethiopia} fill="none" stroke={t.border} strokeWidth={0.8 * k} strokeDasharray={`${3 * k} ${3 * k}`} />
              <Path d={(REG as any).Eritrea} fill="none" stroke={t.border} strokeWidth={0.8 * k} strokeDasharray={`${3 * k} ${3 * k}`} />
              {LABELS.map(([n, la, lo]) => { const [x, y] = proj(la, lo); return <SvgText fontFamily={font.semibold} key={n} x={x} y={y} fontSize={11 * k} fontWeight="700" letterSpacing={1.5 * k} fill={t.muted} textAnchor="middle">{n}</SvgText>; })}
              {(() => { const [x, y] = proj(16.9, 40.4); return <SvgText fontFamily={font.semibold} x={x} y={y} fontSize={12 * k} fontStyle="italic" fill={t.accent} textAnchor="middle" transform={`rotate(-32 ${x} ${y})`}>Rotes Meer</SvgText>; })()}
              {[["TIGRAY", 13.78, 38.44], ["AFAR", 12.55, 40.45], ["AMHARA", 11.58, 38.05]].map(([n, la, lo]) => { const [x, y] = proj(la as number, lo as number);
                return <SvgText fontFamily={font.semibold} key={n as string} x={x} y={y} fontSize={9.5 * k} fontStyle="italic" fontWeight="700" letterSpacing={1 * k} fill={t.faint} textAnchor="middle">{n as string}</SvgText>; })}
            </G>
  ), [t, k]);
  const fireLayer = useMemo(() => !data ? null : (
              <G>
                {layers.fire && data.fires.map((f, i) => { const [x, y] = proj(f.lat, f.lon); return <Circle key={`f${i}`} cx={x} cy={y} r={2.6 * k} fill={t.fire} opacity={0.85} />; })}
              </G>
  ), [data, layers.fire, t, k]);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const mapRef = useRef<View>(null);
  const hit = (lx: number, ly: number) => {
    const x = box[0] + lx * k, y = box[1] + ly * k;
    let best: Mark | null = null, bd = (22 * k) ** 2;
    for (const m of marks) { const d = (m.x - x) ** 2 + (m.y - y) ** 2; if (d < bd) { bd = d; best = m; } }
    setSel(best);
  };
  // Seitenkoordinaten statt locationX: im Browser bezieht sich locationX sonst auf das angetippte Kartenelement
  const onPress = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    mapRef.current?.measure((_x, _y, _w, _h, px, py) => hit(pageX - px, pageY - py));
  };
  if (!data) return <Screen title="Karte"><T v="small">Wird geladen …</T></Screen>;
  const h = w ? (w * box[3]) / box[2] : 0;
  const usgs = feedState(data, "usgs"), ukmto = feedState(data, "ukmto"), firms = feedState(data, "firms");
  const fireNote = data.firesError ? "Hitzepunkte nicht geladen" : !firms.ok ? noData(firms, "NASA FIRMS")
    : data.firesTotal > data.fires.length ? `Die ${num(data.fires.length)} stärksten von ${num(data.firesTotal)} Hitzepunkten, 24 Std.` : `${plural(data.fires.length, "Hitzepunkt", "Hitzepunkte")}, 24 Std.`;

  return (
    <Screen title="Karte" sub="Messwerte rund um Eritrea. Auf eine Markierung tippen für Einzelheiten.">
      <ChipRow>
        {Object.entries(VIEWS).map(([key, v]) => <Chip key={key} label={v.label} active={view === key} onPress={() => { setView(key); setSel(null); }} />)}
      </ChipRow>
      <View onLayout={onLayout} style={{ marginTop: space.m, borderRadius: radius.l, overflow: "hidden", backgroundColor: t.water, borderWidth: 1, borderColor: t.rule }}>
        {w ? (
          <Pressable ref={mapRef as any} collapsable={false} onPress={onPress} accessibilityLabel="Karte. Auf eine Markierung tippen." style={{ width: w, height: h }}>
            <Svg width={w} height={h} viewBox={box.join(" ")}>
              {baseLayer}
              {fireLayer}
              {layers.quake && data.quakes.map((q, i) => { const [x, y] = proj(q.lat, q.lon); return <Circle key={`q${i}`} cx={x} cy={y} r={(4 + 2 * Math.max(0, (q.mag || 2.5) - 2.5)) * k} fill="none" stroke={t.quake} strokeWidth={2 * k} />; })}
              {layers.sat && data.sat.filter((p) => p.images.length).map((p) => { const [x, y] = proj(p.lat, p.lon); const s = 9 * k;
                return <Rect key={p.id} x={x - s / 2} y={y - s / 2} width={s} height={s} fill="none" stroke={t.accent} strokeWidth={1.6 * k} />; })}
              {PLACES.map(([n, la, lo, left]) => { const [x, y] = proj(la, lo); return (
                <G key={n}>
                  <Circle cx={x} cy={y} r={2.2 * k} fill={t.ink} />
                  <SvgText fontFamily={font.semibold} x={left ? x - 5 * k : x + 5 * k} y={y + 4 * k} fontSize={11 * k} fill={t.ink} textAnchor={left ? "end" : "start"}>{n}</SvgText>
                </G>); })}
              {layers.ship && data.maritime.map((m, i) => { const [x, y] = proj(m.lat, m.lon); const s = 7 * k;
                return <Path key={`m${i}`} d={`M${x} ${y - s}l${s} ${s}l${-s} ${s}l${-s} ${-s}z`} fill={t.ship} stroke={t.card} strokeWidth={1 * k} />; })}
              {sel ? <Circle cx={sel.x} cy={sel.y} r={11 * k} fill="none" stroke={t.ink} strokeWidth={2 * k} /> : null}
            </Svg>
          </Pressable>
        ) : <View style={{ height: 300 }} />}
      </View>

      {sel ? (
        <Card style={{ marginTop: space.m }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T v="label" color={t.accent}>{sel.kind}</T>
            <Pressable onPress={() => setSel(null)} hitSlop={10} accessibilityLabel="Schließen"><Ionicons name="close" size={18} color={t.faint} /></Pressable>
          </View>
          <T v="caption" style={{ marginTop: 2 }}>{sel.when}</T>
          <T v="body" style={{ marginTop: 6 }}>{sel.text}</T>
          <View style={{ flexDirection: "row", gap: space.s, marginTop: space.m }}>
            {sel.sat ? <Button label="Bilder vergleichen" icon="images-outline" onPress={() => router.push(`/satellite?place=${sel.sat}`)} />
              : sel.url ? <Button label={`Bei ${sel.src} öffnen`} icon="open-outline" kind="secondary" onPress={() => openLink(sel.url)} /> : null}
          </View>
        </Card>
      ) : null}

      <T v="h3" style={{ marginTop: space.l, marginBottom: space.s }}>Ebenen</T>
      <View style={{ gap: 8 }}>
        {([
          ["fire", t.fire, fireNote],
          ["quake", t.quake, usgs.ok ? `${num(data.quakes.length)} Erdbeben ab Stärke 2,5, 7 Tage (USGS)` : noData(usgs, "USGS")],
          ["ship", t.ship, ukmto.ok ? `${plural(data.maritime.length, "Vorfall", "Vorfälle")} auf See, 30 Tage (UKMTO)` : noData(ukmto, "UKMTO")],
          ["sat", t.accent, `${plural(data.sat.filter((p) => p.images.length).length, "Satelliten-Ort", "Satelliten-Orte")} mit Vorher-Nachher-Bildern`],
        ] as [keyof typeof layers, string, string][]).map(([key, c, label]) => (
          <Pressable key={key} onPress={() => setLayers({ ...layers, [key]: !layers[key] })} accessibilityRole="switch" accessibilityState={{ checked: layers[key] }}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: layers[key] ? 1 : 0.45 }}>
            <Ionicons name={layers[key] ? "checkbox" : "square-outline"} size={20} color={c} />
            <T v="small" color={t.ink} style={{ flex: 1 }}>{label}</T>
          </Pressable>
        ))}
      </View>
      <T v="caption" style={{ marginTop: space.l }}>Gestrichelt: amtliche Regionsgrenzen (Natural Earth); West-Tigray ist seit 2020 umstritten. Ein Feuer wird oft von mehreren Satelliten erfasst.</T>

      {data.maritime.length ? (
        <>
          <T v="h3" style={{ marginTop: space.xl, marginBottom: space.s }}>Vorfälle auf See</T>
          {data.maritime.map((m, i) => (
            <Pressable key={i} onPress={() => openLink(m.url || "https://www.ukmto.org/recent-incidents")} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: t.rule }} accessibilityRole="link">
              <T v="caption">{fmtFull(m.t)}</T>
              <T v="bodyStrong" style={{ fontFamily: font.semibold }}>{m.title}</T>
            </Pressable>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
