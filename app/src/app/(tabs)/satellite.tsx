// Satellit: zwei Aufnahmen desselben Ortes übereinander, mit dem Finger vergleichen.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, PanResponder, Pressable, View } from "react-native";
import { Card, Chip, ChipRow, Empty, openLink, Screen, T, tap } from "../../components/ui";
import { fmtCap, fmtCapDay, num } from "../../lib/de";
import { satImageUri, useData } from "../../lib/data";
import { radius, space, useTheme } from "../../lib/theme";
import type { SatImage, SatPlace } from "../../lib/types";

const group = (p: SatPlace) => p.country_raw.startsWith("Eritrea /") ? "Grenze" : p.country_raw.startsWith("Eritrea") ? "Eritrea"
  : p.country_raw.startsWith("Ethiopia") ? "Äthiopien" : "Rotes Meer";
const GROUPS = ["Eritrea", "Grenze", "Äthiopien", "Rotes Meer"];

function useUri(img: SatImage | undefined) {
  const [uri, setUri] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true; setUri(null); setErr(null);
    if (img) satImageUri(img.id).then((u) => live && setUri(u)).catch((e) => live && setErr(String(e?.message || e)));
    return () => { live = false; };
  }, [img?.id]);
  return { uri, err };
}

export default function Satellite() {
  const t = useTheme();
  const p = useLocalSearchParams<{ place?: string }>();
  const { data } = useData();
  const places = useMemo(() => (data?.sat || []).filter((x) => x.images.length), [data]);
  const [placeId, setPlaceId] = useState<string | null>(p.place || null);
  useEffect(() => { if (p.place) { setPlaceId(p.place); router.setParams({ place: undefined }); } }, [p.place]);
  const place = places.find((x) => x.id === placeId) || places[0];
  const nearest = (target: number) => place.images.reduce((best, i) => (Math.abs(new Date(i.t).getTime() - target) < Math.abs(new Date(best.t).getTime() - target) ? i : best), place.images[0]);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [beforeId, setBeforeId] = useState<number | null>(null);
  useEffect(() => {
    if (!place) return;
    setAfterId(place.images[0].id);
    setBeforeId(nearest(new Date(place.images[0].t).getTime() - 365 * 864e5).id);
    setSplit(0.5);
  }, [place?.id]);
  const after = place?.images.find((i) => i.id === afterId) || place?.images[0];
  const before = place?.images.find((i) => i.id === beforeId) || place?.images[place.images.length - 1];
  const single = !before || !after || before.id === after.id;
  const A = useUri(after), B = useUri(single ? undefined : before);

  const [w, setW] = useState(0);
  const [split, setSplit] = useState(0.5);
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
  const preset = (label: string, pick: () => SatImage) => (
    <Chip key={label} label={label} onPress={() => { setAfterId(place.images[0].id); setBeforeId(pick().id); setSplit(0.5); }} />
  );
  const scalePct = place.half_km > 0 ? 100 / (2 * place.half_km) : 0;

  return (
    <Screen title="Satellit" sub="Sentinel-2, etwa 10 m pro Pixel, Norden oben. Über das Bild wischen, um Vorher und Nachher zu vergleichen.">
      {GROUPS.map((g) => {
        const ps = places.filter((x) => group(x) === g);
        if (!ps.length) return null;
        return (
          <View key={g} style={{ marginBottom: space.s }}>
            <T v="label" color={t.muted} style={{ marginBottom: 6 }}>{g}</T>
            <ChipRow>{ps.map((x) => <Chip key={x.id} label={x.name} active={x.id === place.id} onPress={() => setPlaceId(x.id)} />)}</ChipRow>
          </View>
        );
      })}

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
        {A.err || B.err ? <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", padding: 20 } as any}>
          <T v="small" style={{ textAlign: "center" }}>Das Bild konnte nicht geladen werden.</T></View> : null}
      </View>

      <T v="smallStrong" style={{ marginTop: space.m, marginBottom: 6 }}>Neuestes Bild vergleichen mit</T>
      <ChipRow>
        {preset("einem Jahr früher", () => nearest(new Date(place.images[0].t).getTime() - 365 * 864e5))}
        {preset("Okt. 2020, vor dem Tigray-Krieg", () => nearest(Date.UTC(2020, 9, 20)))}
        {preset("dem ältesten Bild", () => place.images[place.images.length - 1])}
        {preset("dem vorigen Bild", () => place.images[1] || place.images[0])}
      </ChipRow>

      <T v="smallStrong" style={{ marginTop: space.m, marginBottom: 6 }}>Vorher</T>
      <ChipRow>{place.images.map((i) => <Chip key={i.id} label={fmtCapDay(i.t)} active={i.id === before?.id} onPress={() => setBeforeId(i.id)} />)}</ChipRow>
      <T v="smallStrong" style={{ marginTop: space.m, marginBottom: 6 }}>Nachher</T>
      <ChipRow>{place.images.map((i) => <Chip key={i.id} label={fmtCapDay(i.t)} active={i.id === after?.id} onPress={() => setAfterId(i.id)} />)}</ChipRow>

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
