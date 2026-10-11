// Mehr: Konto, Quellen, Methode, BELES, Rechtliches.
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { PushSettings } from "../components/PushSettings";
import { Banner, Button, Card, Divider, openLink, Screen, T, tap } from "../components/ui";
import { useData } from "../lib/data";
import { BELES_URL, CLAUDE_PAGE, WEB_URL } from "../lib/feeds";
import { refreshPushOwner } from "../lib/push";
import { sb } from "../lib/supabase";
import { space, useTheme } from "../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
function Row({ icon, title, sub, onPress, external }: { icon: Icon; title: string; sub?: string; onPress: () => void; external?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole={external ? "link" : "button"}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={20} color={t.ink} />
      <View style={{ flex: 1 }}><T v="bodyStrong">{title}</T>{sub ? <T v="caption">{sub}</T> : null}</View>
      <Ionicons name={external ? "open-outline" : "chevron-forward"} size={17} color={t.faint} />
    </Pressable>
  );
}

export default function More() {
  const t = useTheme();
  const { session, data } = useData();
  const email = session?.user?.email;
  return (
    <Screen topInset={false} refresh={false}>
      <T v="label" color={t.muted} style={{ marginBottom: space.s }}>Konto</T>
      <Card style={{ gap: space.m }}>
        {session ? (
          <>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Ionicons name={data?.owner ? "shield-checkmark" : "person-circle-outline"} size={26} color={data?.owner ? t.status.confirmed : t.ink} />
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">{email}</T>
                <T v="caption">{data?.owner ? "Voller Zugang: Meldungen, Behauptungen, Tagesberichte, Internet-Messwerte." : "Angemeldet. Dieses Konto sieht die offene Ausgabe."}</T>
              </View>
            </View>
            <Button label="Abmelden" kind="secondary" icon="log-out-outline" onPress={async () => {
              await sb.auth.signOut();
              // Benachrichtigungen sofort auf die offene Ausgabe umstellen
              await refreshPushOwner().catch(() => {});
            }} />
          </>
        ) : (
          <>
            <T v="small">Ohne Anmeldung zeigt Horn Lens die offene Ausgabe: Messwerte, Satellitenbilder und Schifffahrtsmeldungen vom Roten Meer.</T>
            <Button label="Als Betreiber anmelden" icon="log-in-outline" onPress={() => router.push("/login")} />
          </>
        )}
      </Card>
      {data?.owner ? <View style={{ marginTop: space.m }}><Banner icon="sparkles-outline" text="KI-Zusammenfassung und Übersetzung gibt es in Horn Lens in Claude." action="Öffnen" onAction={() => openLink(CLAUDE_PAGE)} /></View> : null}

      <T v="label" color={t.muted} style={{ marginTop: space.xl, marginBottom: space.s }}>Benachrichtigungen</T>
      <PushSettings />

      <T v="label" color={t.muted} style={{ marginTop: space.xl, marginBottom: space.s }}>Über Horn Lens</T>
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="library-outline" title="Unsere Quellen" sub="Wer berichtet, wie wir sie einordnen, ob sie erreichbar sind" onPress={() => router.push("/sources")} />
        <Divider />
        <Row icon="compass-outline" title="So arbeitet Horn Lens" sub="Regeln, Grenzen, Nachweise" onPress={() => router.push("/method")} />
        <Divider />
        <Row icon="people-outline" title="BELES" sub="Die App für Eritreerinnen und Eritreer weltweit" onPress={() => openLink(BELES_URL)} external />
      </Card>

      <T v="label" color={t.muted} style={{ marginTop: space.xl, marginBottom: space.s }}>Rechtliches</T>
      <Card style={{ paddingVertical: 4 }}>
        <Row icon="document-outline" title="Impressum" onPress={() => openLink(`${WEB_URL}/impressum.html`)} external />
        <Divider />
        <Row icon="lock-closed-outline" title="Datenschutz" onPress={() => openLink(`${WEB_URL}/datenschutz.html`)} external />
      </Card>
      <T v="caption" style={{ textAlign: "center", marginTop: space.xl }}>Horn Lens {Constants.expoConfig?.version || ""} · powered by BELES</T>
    </Screen>
  );
}
