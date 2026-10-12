// Einführung beim ersten Start (drei Seiten, jederzeit überspringbar). Später unter „Mehr“ als Legende wieder aufrufbar.
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReduceMotion } from "../components/Skeleton";
import { Button, StatusPill, T, tap } from "../components/ui";
import { STATUS, STATUS_ORDER, TYPES } from "../lib/de";
import { useData } from "../lib/data";
import { BRAND, radius, space, useTheme } from "../lib/theme";
import { Mark } from "../components/Logo";

export const WELCOME_KEY = "hl:welcome:v1";
const VOICES: [string, string][] = [
  ["government_er", "Amtliche Sicht Eritreas, einer Konfliktpartei"], ["exile", "Meist regierungskritisch, mit Quellen im Land"], ["government_et", "Amtliche Sicht Äthiopiens, einer Konfliktpartei"], ["progov_et", "Nah an Äthiopiens Regierung"],
  ["tigray", "Aus Tigray, oft einer Konfliktseite nah"], ["international", "Agenturen und Sender von außen"], ["un_ngo", "Eigene Erhebungen, Berichte von außen"],
];

function Page({ w, icon, title, lead, children }: { w: number; icon: keyof typeof Ionicons.glyphMap | "mark"; title: string; lead: string; children?: React.ReactNode }) {
  const t = useTheme();
  return (
    <ScrollView style={{ width: w }} contentContainerStyle={{ padding: space.xl, gap: space.m }}>
      {icon === "mark" ? (
        <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: BRAND.ink, alignItems: "center", justifyContent: "center" }}>
          <Mark size={32} color={BRAND.paper} dot={BRAND.lagoonLight} />
        </View>
      ) : (
      <View style={{ width: 56, height: 56, borderRadius: radius.l, backgroundColor: t.cardAlt, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={28} color={t.accent} />
      </View>
      )}
      <T v="title" accessibilityRole="header">{title}</T>
      <T v="body" color={t.muted}>{lead}</T>
      {children}
    </ScrollView>
  );
}
function Row({ color, title, sub, icon }: { color: string; title: string; sub: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      {icon ? <Ionicons name={icon} size={18} color={color} style={{ marginTop: 2 }} /> : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginTop: 6 }} />}
      <View style={{ flex: 1 }}><T v="bodyStrong">{title}</T><T v="small">{sub}</T></View>
    </View>
  );
}

export default function Welcome() {
  const t = useTheme();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pageW = Math.min(width, 560);
  const [page, setPage] = useState(0);
  const reduce = useReduceMotion();
  const { data } = useData();
  // Schon einmal gesehen (über „Mehr“ geöffnet): dann heißt es „Schließen“ statt „Überspringen“
  const again = useLocalSearchParams<{ first?: string }>().first !== "1";
  const ref = useRef<ScrollView>(null);
  const done = () => { AsyncStorage.setItem(WELCOME_KEY, "1").catch(() => {}); if (router.canGoBack()) router.back(); else router.replace("/"); };
  const go = (i: number) => { tap(); ref.current?.scrollTo({ x: i * pageW, animated: !reduce }); setPage(i); };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + space.s, paddingBottom: ins.bottom + space.m }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: space.l }}>
        <Pressable onPress={() => { tap(); done(); }} accessibilityRole="button" hitSlop={12} style={{ padding: 8 }}>
          <T v="smallStrong" color={t.accent}>{page < 2 && !again ? "Überspringen" : "Schließen"}</T>
        </Pressable>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScrollEndDrag={onScroll}
          style={{ width: pageW, flexGrow: 0, flex: 1 }} scrollEventThrottle={32}>
          <Page w={pageW} icon="mark" title="Willkommen bei Horn Lens"
            lead="Was am Horn von Afrika geschieht, Eritrea zuerst. Jede Angabe mit Herkunft, damit du selbst einschätzen kannst, wie belastbar sie ist.">
            <Row icon="newspaper-outline" color={t.ink} title="Meldungen aller Seiten" sub="Schlagzeilen aus Eritrea, Äthiopien, Tigray, der Diaspora und von außen, nebeneinander." />
            <Row icon="layers-outline" color={t.ink} title="Geschichten" sub="Berichten mehrere Medien dasselbe, fasst Horn Lens sie zusammen und zeigt, welche Seiten darüber berichten." />
            <Row icon="map-outline" color={t.ink} title="Messwerte und Satellitenbilder" sub="Hitzepunkte, Erdbeben, Vorfälle auf See, Internetverbindung und Vorher-Nachher-Bilder." />
            {data && !data.owner ? <T v="caption" style={{ marginTop: space.s }}>Ohne Anmeldung siehst du die offene Ausgabe: Rotes Meer, Messwerte und Satellitenbilder.</T> : null}
          </Page>
          <Page w={pageW} icon="people-outline" title="Wer sagt was"
            lead="Jede Quelle hat eine Farbe für ihre Art. So siehst du auf einen Blick, ob nur eine Seite berichtet oder viele.">
            {VOICES.map(([k, sub]) => <Row key={k} color={t.type[k]} title={TYPES[k]} sub={sub} />)}
            <T v="caption" style={{ marginTop: space.s }}>Eine Meldung ist keine geprüfte Tatsache.</T>
          </Page>
          <Page w={pageW} icon="checkmark-done-circle-outline" title="Wie sicher ist das?"
            lead="Behauptungen aus dem Konflikt bekommen eine Stufe. Sie ändert sich nur mit Belegen, und der Verlauf bleibt sichtbar.">
            {STATUS_ORDER.map((k) => (
              <View key={k} style={{ gap: 2 }}>
                <StatusPill status={k} />
                <T v="small">{STATUS[k][1]}</T>
              </View>
            ))}
            <Row icon="flame-outline" color={t.fire} title="Messwerte zeigen, was geschah, nicht warum" sub="Ein Hitzepunkt zeigt Hitze, nicht die Ursache: oft Feldbrände, manchmal Kämpfe. Ein Rückgang der Internetverbindung sagt nicht, warum." />
          </Page>
        </ScrollView>
      </View>
      <View style={{ paddingHorizontal: space.xl, gap: space.m, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }} accessible accessibilityLabel={`Seite ${page + 1} von 3`}>
          {[0, 1, 2].map((i) => <View key={i} style={{ width: i === page ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? t.ink : t.faint }} />)}
        </View>
        <Button label={page < 2 ? "Weiter" : "Los geht’s"} onPress={() => (page < 2 ? go(page + 1) : done())} />
      </View>
    </View>
  );
}
