// Mehr: Konto, Quellen, Methode, BELES, Rechtliches.
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { PushSettings } from "../components/PushSettings";
import { Banner, Button, Card, Divider, openLink, Screen, T, tap } from "../components/ui";
import { useData } from "../lib/data";
import { BELES_URL, CLAUDE_PAGE, WEB_URL } from "../lib/feeds";
import { deleteAccount } from "../lib/auth";
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

// Konto endgültig löschen, nach Rückfrage
function confirmDelete() {
  const text = "Dein Konto wird endgültig gelöscht. Du kannst dich später neu anmelden; gespeicherte Einstellungen gehen verloren.";
  const run = async () => {
    const err = await deleteAccount();
    await refreshPushOwner().catch(() => {});
    if (err) { if (Platform.OS === "web") window.alert(err); else Alert.alert("Konto löschen", err); }
  };
  if (Platform.OS === "web") { if (window.confirm(`Konto löschen?\n\n${text}`)) run(); return; }
  Alert.alert("Konto löschen?", text, [{ text: "Abbrechen", style: "cancel" }, { text: "Löschen", style: "destructive", onPress: run }]);
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
            <Pressable onPress={() => confirmDelete()} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: 6 }} hitSlop={8}>
              <T v="smallStrong" color={t.warn}>Konto löschen</T>
            </Pressable>
          </>
        ) : (
          <>
            <T v="small">Ohne Anmeldung zeigt Horn Lens die offene Ausgabe: Messwerte, Satellitenbilder und Schifffahrtsmeldungen vom Roten Meer.</T>
            <Button label="Anmelden mit Apple, Google oder E-Mail" icon="log-in-outline" onPress={() => router.push("/login")} />
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
        <Row icon="book-outline" title="Einführung und Legende" sub="Farben der Quellen, Stufen der Behauptungen" onPress={() => router.push("/welcome")} />
        <Divider />
        <Row icon="location-outline" title="Orte" sub="Asmara, Assab, Adigrat und mehr: was Horn Lens zu jedem Ort hat" onPress={() => router.push("/places")} />
        <Divider />
        <Row icon="bookmark-outline" title="Gemerkte Meldungen" sub="Nur auf diesem Gerät" onPress={() => router.navigate(`/news?mode=saved&k=${Date.now()}`)} />
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
        <Divider />
        <Row icon="mail-outline" title="Kontakt" sub="info@beles.app" onPress={() => openLink("mailto:info@beles.app?subject=Horn%20Lens")} external />
      </Card>
      <T v="caption" style={{ textAlign: "center", marginTop: space.xl }}>Horn Lens {Constants.expoConfig?.version || ""} · powered by BELES</T>
    </Screen>
  );
}
