// Satellit: zwei Aufnahmen desselben Ortes übereinander, mit dem Finger vergleichen.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, PanResponder, Pressable, View } from "react-native";
import { Card, Chip, ChipRow, Empty, openLink, Screen, T, tap } from "../../components/ui";
import { fmtCap, fmtCapDay, num } from "../../lib/de";
import { satImageUri, useData } from "../../lib/data";
import { toast } from "../../components/Toast";
import { radius, space, useTheme } from "../../lib/theme";
import type { SatImage, SatPlace } from "../../lib/types";

const group = (p: SatPlace) => p.country_raw.startsWith("Eritrea /") ? "Grenze" : p.country_raw.startsWith("Eritrea") ? "Eritrea"
  : p.country_raw.startsWith("Ethiopia") ? "Äthiopien" : "Rotes Meer";
const GROUPS = ["Eritrea", "Grenze", "Äthiopien", "Rotes Meer"];

function useUri(img: SatImage | undefined) {
  const [uri, setUri] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const again = useRef(false);
  useEffect(() => {
    let live = true; setUri(null); setErr(null);
    const retry = again.current; again.current = false;
    if (img) satImageUri(img.id, retry).then((u) => live && setUri(u)).catch((e) => live && setErr(String(e?.message || e)));
    return () => { live = false; };
  }, [img?.id, n]);
  return { uri, err, retry: () => { again.current = true; setN((x) => x + 1); } };
}
const DAY = 864e5;

/** Datum mit Pfeilen: ein Bild früher oder später */
function Stepper({ label, list, value, onChange }: { label: string; list: SatImage[]; value: SatImage; onChange: (i: SatImage) => void }) {
  const t = useTheme();
  const i = list.findIndex((x) => x.id === value.id);
  const btn = (d: number, icon: keyof typeof Ionicons.glyphMap, a11y: string) => {
    const target = list[i + d];
    return (
      <Pressable disabled={!target} onPress={() => { tap(); onChange(target); }} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: !target }} hitSlop={4}
        style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: !target ? 0.3 : pressed ? 0.5 : 1 })}>
        <Ionicons name={icon} size={20} color={t.ink} />
      </Pressable>
    );
  };
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: t.card, borderRadius: radius.m, borderWidth: 1, borderColor: t.rule }}>
      {btn(1, "chevron-back", `${label}: ein Bild früher`)}
      <View style={{ flex: 1, alignItems: "center" }}>
        <T v="caption">{label}</T>
        <T v="smallStrong" numberOfLines={1}>{new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value.t))}</T>
      </View>
      {btn(-1, "chevron-forward", `${label}: ein Bild später`)}
    </View>
  );
}

export default function Satellite() {
  const t = useTheme();
  const p = useLocalSearchParams<{ place?: string }>();
  const { data } = useData();
  const places = useMemo(() => (data?.sat || []).filter((x) => x.images.length), [data]);
  const [placeId, setPlaceId] = useState<string | null>(p.place || null);
  useEffect(() => { if (p.place) { setPlaceId(p.place); router.setParams({ place: undefined }); } }, [p.place]);
  const asked = placeId ? places.find((x) => x.id === placeId) : undefined;
  const place = asked || places[0];
  const missingAsked = !!placeId && !asked && places.length > 0;
  const toldMissing = useRef(false);
  useEffect(() => { if (missingAsked && !toldMissing.current) { toldMissing.current = true; toast("Für diesen Ort gibt es noch kein klares Bild. Gezeigt wird ein anderer.", "information-circle-outline"); } }, [missingAsked]);
  const nearest = (target: number) => place.images.reduce((best, i) => (Math.abs(new Date(i.t).getTime() - target) < Math.abs(new Date(best.t).getTime() - target) ? i : best), place.images[0]);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [split, setSplit] = useState(0.5);
  const [allDates, setAllDates] = useState(false);
  const [beforeId, setBeforeId] = useState<number | null>(null);
  useEffect(() => {
    if (!place) return;
    setAfterId(place.images[0].id);
    setBeforeId(nearest(new Date(place.images[0].t).getTime() - 365 * 864e5).id);
    setSplit(0.5);
  }, [place?.id]);
  const pickA = place?.images.find((i) => i.id === afterId) || place?.images[0];
  const pickB = place?.images.find((i) => i.id === beforeId) || place?.images[place.images.length - 1];
  // Links immer das ältere Bild, damit „Vorher“ und „Nachher“ stimmen
  const [before, after] = pickA && pickB && pickA.t < pickB.t ? [pickA, pickB] : [pickB, pickA];
  const single = !before || !after || before.id === after.id;
  const A = useUri(after), B = useUri(single ? undefined : before);
  // Nachbarbilder vorab laden, damit das Blättern schnell geht
  useEffect(() => {
    if (!place) return;
    for (const cur of [before, after]) {
      const k = place.images.findIndex((x) => x.id === cur?.id);
      for (const d of [-1, 1]) { const n = place.images[k + d]; if (n) satImageUri(n.id).catch(() => {}); }
    }
  }, [before?.id, after?.id]);

  const [w, setW] = useState(0);
  const wRef = useRef(0); wRef.current = w;
  const startRef = useRef(0.5);
  const splitRef = useRef(0.5); splitRef.current = split;
  const pan = useMemo(() => PanResponder.create({
    // Nur waagerechtes Wischen übernimmt der Vergleich; senkrecht blättert die Seite weiter
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { startRef.current = splitRef.current; },
    onPanResponderMove: (_e, g) => { if (wRef.current) setSplit(Math.max(0, Math.min(1, startRef.current + g.dx / wRef.current))); },
  }), []);

  if (!data) return <Screen title="Satellit"><ActivityIndicator /></Screen>;
  if (!places.length) return <Screen title="Satellit"><Empty icon="planet-outline" text={data.satError ? "Die Satellitenbilder konnten nicht geladen werden." : "Noch kein klares Bild gesammelt."} /></Screen>;

  const years = [...new Set(places.flatMap((x) => x.images.map((i) => new Date(i.t).getUTCFullYear())))].sort();
  // Vorlagen: zeigen das echte Datum und sind gesperrt, wenn kein Bild nah genug am Wunschdatum liegt
  const preset = (label: string, target: number | null, pick?: SatImage) => {
    const img = pick || (target != null ? nearest(target) : place.images[0]);
    const off = target != null ? Math.abs(new Date(img.t).getTime() - target) / DAY : 0;
    const usable = img.id !== place.images[0].id && off <= 45;
    const active = after?.id === place.images[0].id && before?.id === img.id;
    return (
      <Chip key={label} label={usable ? `${label} (${fmtCapDay(img.t)})` : `${label}: kein passendes Bild`} active={active}
        onPress={() => { if (!usable) return; setAfterId(place.images[0].id); setBeforeId(img.id); setSplit(0.5); }} />
    );
  };

  const scalePct = place.half_km > 0 ? 100 / (2 * place.half_km) : 0;

  return (
    <Screen title="Satellit">
      <ChipRow>
        {GROUPS.flatMap((g) => places.filter((x) => group(x) === g)).map((x) => <Chip key={x.id} label={x.name} active={x.id === place.id} onPress={() => setPlaceId(x.id)} />)}
      </ChipRow>

      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        style={{ marginTop: space.m, aspectRatio: 1, borderRadius: radius.l, overflow: "hidden", backgroundColor: t.cardAlt }}
        {...(single ? {} : pan.panHandlers)} accessibilityLabel={single ? "Satellitenbild" : "Vergleich: links Vorher, rechts Nachher. Wischen verschiebt die Trennlinie."}>
        {/* Unten das Vorher-Bild, darüber rechts das Nachher-Bild */}
        {single ? (A.uri ? <Image source={{ uri: A.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} /> : null) : (
          <>
            {B.uri ? <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: w, height: w }}><Image source={{ uri: B.uri }} style={{ width: w, height: w }} contentFit="cover" transition={150} draggable={false} /></View> : null}
            <View style={{ position: "absolute", top: 0, bottom: 0, left: split * w, right: 0, overflow: "hidden" }} pointerEvents="none">
              {A.uri ? <Image source={{ uri: A.uri }} style={{ position: "absolute", top: 0, left: -split * w, width: w, height: w }} contentFit="cover" transition={150} draggable={false} /> : null}
            </View>
            <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: split * w - 1, width: 2, backgroundColor: "#fff" }} />
            <View pointerEvents="none" style={{ position: "absolute", top: w / 2 - 18, left: split * w - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff",
              alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 }}>
              <Ionicons name="code-outline" size={18} color="#13262E" />
            </View>
            <View pointerEvents="none" style={{ position: "absolute", left: 8, top: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
              <T v="caption" color="#fff">Vorher · {fmtCapDay(before!.t)}</T>
            </View>
            <View pointerEvents="none" style={{ position: "absolute", right: 8, top: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
              <T v="caption" color="#fff">Nachher · {fmtCapDay(after!.t)}</T>
            </View>
          </>
        )}
        {scalePct ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 10, bottom: 10, width: `${scalePct}%` }}>
            <T v="caption" color="#fff" style={{ textShadowColor: "#000", textShadowRadius: 3 }}>1 km</T>
            <View style={{ height: 3, backgroundColor: "#fff", borderRadius: 2 }} />
          </View>
        ) : null}
        {(!A.uri && !A.err) || (!single && !B.uri && !B.err) ? (
          <View pointerEvents="none" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" } as any}>
            <ActivityIndicator color={t.muted} /><T v="caption" style={{ marginTop: 6 }}>Bild wird geladen …</T>
          </View>
        ) : null}
        {A.err || B.err ? <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 } as any}>
          <T v="small" style={{ textAlign: "center" }}>Das Bild konnte nicht geladen werden.</T>
          <Pressable onPress={() => { tap(); if (A.err) A.retry(); if (B.err) B.retry(); }} accessibilityRole="button" hitSlop={6}
            style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: t.card, opacity: pressed ? 0.6 : 1 })}>
            <T v="smallStrong">Erneut versuchen</T>
          </Pressable>
        </View> : null}
      </View>

      <T v="smallStrong" style={{ marginTop: space.m, marginBottom: 6 }}>Neuestes Bild vergleichen mit</T>
      <ChipRow>
        {preset("vor einem Jahr", new Date(place.images[0].t).getTime() - 365 * DAY)}
        {preset("Okt. 2020, vor dem Tigray-Krieg", Date.UTC(2020, 9, 20))}
        {preset("ältestes Bild", null, place.images[place.images.length - 1])}
        {preset("voriges Bild", null, place.images[1] || place.images[0])}
      </ChipRow>

      {single ? (
        <T v="small" style={{ marginTop: space.m }}>{place.images.length === 1 ? "Von diesem Ort gibt es bisher nur ein klares Bild; ein Vergleich ist noch nicht möglich." : "Beide Seiten zeigen dasselbe Bild. Ein anderes Datum wählen."}</T>
      ) : null}
      {place.images.length > 2 ? (
        <Pressable onPress={() => { tap(); setAllDates(!allDates); }} accessibilityRole="button" accessibilityState={{ expanded: allDates }} hitSlop={6} style={{ marginTop: space.s, paddingVertical: 6 }}>
          <T v="smallStrong" color={t.accent}>{allDates ? "Fertig" : "Andere Daten wählen"}</T>
        </Pressable>
      ) : null}
      {place.images.length > 1 && (allDates || place.images.length === 2) ? (
        <View style={{ flexDirection: "row", gap: space.s, marginTop: space.s }}>
          <Stepper label="Vorher" list={place.images} value={before!} onChange={(i) => { if (before!.id === pickA?.id) setAfterId(i.id); else setBeforeId(i.id); }} />
          <Stepper label="Nachher" list={place.images} value={after!} onChange={(i) => { if (after!.id === pickA?.id) setAfterId(i.id); else setBeforeId(i.id); }} />
        </View>
      ) : null}

      <Card style={{ marginTop: space.l, gap: 8 }}>
        <T v="h3">{place.name}</T>
        <T v="small">{[place.country, place.why].filter(Boolean).join(". ")}</T>
        {(single ? [["Bild", after]] : [["Vorher", before], ["Nachher", after]]).map(([k, i]: any) => (
          <View key={k} style={{ gap: 2 }}>
            <T v="label" color={t.muted}>{k}</T>
            <T v="small" color={t.ink}>Aufgenommen {fmtCap(i.t)} von {i.platform}. Wolken: {num(Number(i.cloud))} %.</T>
            <Pressable onPress={() => { tap(); openLink(`https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/${encodeURIComponent(i.item)}`); }} accessibilityRole="link">
              <T v="caption" color={t.accent}>Datensatz der Quelle ↗</T>
            </Pressable>
          </View>
        ))}
      </Card>
      <T v="caption" style={{ marginTop: space.m }}>
        Licht, Jahreszeit und Dunst unterscheiden sich zwischen Aufnahmen: am besten Bilder aus derselben Jahreszeit vergleichen. Bei 10 m sind große Gebäude, Schiffe und Landebahnen zu sehen, ein Auto nicht.
        {"\n"}Contains modified Copernicus Sentinel data {years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : years[0]}, processed by Microsoft Planetary Computer.
      </T>
    </Screen>
  );
}
