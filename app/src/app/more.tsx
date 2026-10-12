// Mehr: Konto, Quellen, Methode, BELES, Rechtliches.
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { Mark } from "../components/Logo";
import { PushSettings } from "../components/PushSettings";
import { toast } from "../components/Toast";
import { Button, Card, Chip, Group, Head, ListRow, Screen, T, openLink, tap } from "../components/ui";
import { useData } from "../lib/data";
import { BELES_URL, CLAUDE_PAGE, WEB_URL } from "../lib/feeds";
import { deleteAccount } from "../lib/auth";
import { LANGS, t as tr } from "../lib/i18n";
import { useLang } from "../lib/lang";
import { refreshPushOwner } from "../lib/push";
import { sb } from "../lib/supabase";
import { space, useTheme } from "../lib/theme";

// Konto endgültig löschen, nach Rückfrage
// Abmelden, nach Rückfrage (gemerkte Meldungen und Suchverlauf auf dem Gerät werden dabei gelöscht)
function confirmSignOut() {
  const text = tr("Gemerkte Meldungen und der Suchverlauf auf diesem Gerät werden dabei gelöscht.");
  const run = async () => {
    await sb.auth.signOut();
    // Benachrichtigungen sofort auf die offene Ausgabe umstellen
    await refreshPushOwner().catch(() => {});
    toast(tr("Abgemeldet"), "log-out-outline");
  };
  if (Platform.OS === "web") { if (window.confirm(`${tr("Abmelden?")}\n\n${text}`)) run(); return; }
  Alert.alert(tr("Abmelden?"), text, [{ text: tr("Abbrechen"), style: "cancel" }, { text: tr("Abmelden"), onPress: run }]);
}

function confirmDelete() {
  const text = tr("Dein Konto wird endgültig gelöscht. Du kannst dich später neu anmelden; gespeicherte Einstellungen gehen verloren.");
  const run = async () => {
    const err = await deleteAccount();
    await refreshPushOwner().catch(() => {});
    if (err) { if (Platform.OS === "web") window.alert(err); else Alert.alert(tr("Konto löschen"), err); }
    else toast(tr("Konto gelöscht"), "trash-outline");
  };
  if (Platform.OS === "web") { if (window.confirm(`${tr("Konto löschen?")}\n\n${text}`)) run(); return; }
  Alert.alert(tr("Konto löschen?"), text, [{ text: tr("Abbrechen"), style: "cancel" }, { text: tr("Löschen"), style: "destructive", onPress: run }]);
}

export default function More() {
  const t = useTheme();
  const { session, data } = useData();
  const email = session?.user?.email;
  const { lang, setLang } = useLang();
  return (
    <Screen topInset={false} refresh={false}>
      {/* Sprache: Überschrift immer in allen drei Sprachen, damit jede sie findet */}
      <Head title="Sprache · Language · ቋንቋ" first />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {LANGS.map((l) => <Chip key={l.id} label={l.label} active={lang === l.id} onPress={() => setLang(l.id)} />)}
      </View>

      {session ? (
        <>
          <Head title={tr("Redaktion")} />
          <Card style={{ gap: space.m }}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Ionicons name={data?.owner ? "shield-checkmark" : "person-circle-outline"} size={26} color={data?.owner ? t.status.supported : t.ink} />
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">{email}</T>
                <T v="caption">{data?.owner ? tr("Angemeldet: Behauptungen pflegen, Tagesbericht") : tr("Angemeldet, ohne Redaktionsrechte")}</T>
              </View>
            </View>
            <Button label={tr("Abmelden")} kind="secondary" icon="log-out-outline" onPress={confirmSignOut} />
            {/* Ältere Leserkonten können sich weiter löschen; das Redaktionskonto nicht aus Versehen */}
            {!data?.owner ? (
              <Pressable onPress={() => { tap(); confirmDelete(); }} accessibilityRole="button" style={{ alignSelf: "center", minHeight: 44, justifyContent: "center" }} hitSlop={8}>
                <T v="smallStrong" color={t.warn}>{tr("Konto löschen")}</T>
              </Pressable>
            ) : null}
          </Card>
          {data?.owner ? <Group style={{ marginTop: space.m }}><ListRow first icon="sparkles-outline" label={tr("KI-Zusammenfassung in Claude")} external onPress={() => openLink(CLAUDE_PAGE)} /></Group> : null}
        </>
      ) : null}

      <Head title={tr("Benachrichtigungen")} />
      <PushSettings />

      <Head title={tr("Inhalte")} />
      <Group>
        <ListRow first icon="location-outline" label={tr("Orte")} sub={tr("Was Semay zu Asmara, Assab, Adigrat und mehr weiß")} onPress={() => router.push("/places")} />
        <ListRow icon="planet-outline" label={tr("Satellitenbilder")} sub={tr("Vorher und nachher vergleichen")} onPress={() => router.push("/satellite")} />
        <ListRow icon="bookmark-outline" label={tr("Gemerkte Meldungen")} sub={tr("Nur auf diesem Gerät gespeichert")} onPress={() => router.navigate(`/news?mode=saved&k=${Date.now()}`)} />
        <ListRow icon="search-outline" label={tr("Suchen")} sub={tr("Orte, Meldungen, Behauptungen und Quellen")} onPress={() => router.push("/search")} />
      </Group>

      <Head title={tr("Über Semay")} />
      <Group>
        <ListRow first icon="book-outline" label={tr("Einführung und Legende")} sub={tr("Farben der Quellen, Stufen der Behauptungen")} onPress={() => router.push("/welcome")} />
        <ListRow icon="compass-outline" label={tr("So arbeitet Semay")} sub={tr("Regeln, Grenzen, Nachweise")} onPress={() => router.push("/method")} />
        <ListRow icon="library-outline" label={tr("Unsere Quellen")} sub={tr("Wer berichtet, wie wir sie einordnen, was noch fehlt")} onPress={() => router.push("/sources")} />
        <ListRow icon="git-compare-outline" label={tr("Korrekturen")} sub={tr("Jede Änderung an einer Behauptung")} onPress={() => router.push("/corrections")} />
        <ListRow icon="people-outline" label="BELES" sub={tr("Die App für Eritreerinnen und Eritreer weltweit")} external onPress={() => openLink(BELES_URL)} />
      </Group>

      <Head title={tr("Rechtliches")} />
      <Group>
        <ListRow first icon="document-outline" label={tr("Impressum")} external onPress={() => openLink(`${WEB_URL}/impressum.html`)} />
        <ListRow icon="lock-closed-outline" label={tr("Datenschutz")} external onPress={() => openLink(`${WEB_URL}/datenschutz.html`)} />
        <ListRow icon="mail-outline" label={tr("Kontakt")} sub="info@beles.app" external onPress={() => openLink("mailto:info@beles.app?subject=Horn%20Lens")} />
      </Group>
      <View style={{ alignItems: "center", marginTop: space.xxl, gap: 6 }}>
        <Mark size={26} color={t.muted} dot={t.accent} />
        <T v="caption">{tr("Semay {version}, powered by BELES", { version: Constants.expoConfig?.version || "" })}</T>
        {!session ? (
          <Pressable onPress={() => { tap(); router.push("/login"); }} accessibilityRole="link" hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}>
            <T v="caption" color={t.muted} style={{ textDecorationLine: "underline" }}>{tr("Anmeldung für die Redaktion")}</T>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
