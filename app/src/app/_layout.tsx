// Nur die verwendeten Schriftschnitte laden (hält App und Web-Fassung klein)
import * as Font from "expo-font";
import { useFonts } from "expo-font";
const SG_400 = require("@expo-google-fonts/schibsted-grotesk/400Regular/SchibstedGrotesk_400Regular.ttf");
const SG_500 = require("@expo-google-fonts/schibsted-grotesk/500Medium/SchibstedGrotesk_500Medium.ttf");
const SG_600 = require("@expo-google-fonts/schibsted-grotesk/600SemiBold/SchibstedGrotesk_600SemiBold.ttf");
const SG_700 = require("@expo-google-fonts/schibsted-grotesk/700Bold/SchibstedGrotesk_700Bold.ttf");
const SG_800 = require("@expo-google-fonts/schibsted-grotesk/800ExtraBold/SchibstedGrotesk_800ExtraBold.ttf");
const NotoSansEthiopic_400Regular = require("@expo-google-fonts/noto-sans-ethiopic/400Regular/NotoSansEthiopic_400Regular.ttf");
const NotoSansEthiopic_600SemiBold = require("@expo-google-fonts/noto-sans-ethiopic/600SemiBold/NotoSansEthiopic_600SemiBold.ttf");
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DataProvider, useData } from "../lib/data";
import { LangProvider, useLang } from "../lib/lang";
import { t as tr } from "../lib/i18n";
import { WELCOME_KEY } from "./welcome";
import SetPassword from "../components/SetPassword";
import { ToastHost } from "../components/Toast";
import { pushSupported } from "../lib/push";
import { font, useTheme } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Root() {
  const t = useTheme();
  // Im Browser die Ge'ez-Schrift (gut 700 KB) nicht abwarten: nur wenige Schlagzeilen brauchen sie, bis dahin hilft die Systemschrift.
  // Auf dem Handy liegt sie in der App und ist sofort da.
  const [loaded] = useFonts(Platform.OS === "web" ? { SG_400, SG_500, SG_600, SG_700, SG_800 } : { SG_400, SG_500, SG_600, SG_700, SG_800, NotoSansEthiopic_400Regular, NotoSansEthiopic_600SemiBold });
  useEffect(() => { if (Platform.OS === "web") Font.loadAsync({ NotoSansEthiopic_400Regular, NotoSansEthiopic_600SemiBold }).catch(() => {}); }, []);
  useEffect(() => { SystemUI.setBackgroundColorAsync(t.bg).catch(() => {}); }, [t.bg]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  useEffect(() => { if (Platform.OS === "web") { try { document.title = "Semay – " + tr("Lagebild Horn von Afrika"); } catch { /* egal */ } } }, []);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <LangProvider>
      <DataProvider>
        <StatusBar style={t.dark ? "light" : "dark"} />
        <Gate>
        <AppStack />
        <FirstRun />
        <ToastHost />
        {pushSupported ? <NotificationRouter /> : null}
        </Gate>
      </DataProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}

// Fängt Abstürze eines Bildschirms ab: statt einer weißen Seite ein Hinweis und ein Weg zurück
export function ErrorBoundary({ retry }: { error: Error; retry: () => Promise<void> }) {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
        <Ionicons name="alert-circle-outline" size={36} color={t.muted} />
        <Text style={{ fontFamily: font.semibold, fontSize: 18, color: t.ink, textAlign: "center" }}>{tr("Hier ist etwas schiefgegangen.")}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: t.muted, textAlign: "center", maxWidth: 360 }}>{tr("Der Fehler liegt bei uns, nicht bei dir. Bitte erneut versuchen oder zur Lage zurückgehen.")}</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable onPress={() => { retry().catch(() => {}); }} accessibilityRole="button" style={{ backgroundColor: t.ink, borderRadius: 12, paddingHorizontal: 18, height: 46, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: t.bg }}>{tr("Erneut versuchen")}</Text>
          </Pressable>
          <Pressable onPress={() => { try { router.replace("/"); } catch { /* egal */ } }} accessibilityRole="button" style={{ borderRadius: 12, paddingHorizontal: 18, height: 46, justifyContent: "center", borderWidth: 1, borderColor: t.rule }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: t.ink }}>{tr("Zur Lage")}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

// Die Bildschirme mit ihren Titeln (in der gewählten Sprache; neu gezeichnet, wenn sie wechselt)
function AppStack() {
  const t = useTheme();
  useLang();
  return (
    <Stack screenOptions={({ navigation }: any) => ({
          headerStyle: { backgroundColor: t.bg }, headerTintColor: t.ink, headerShadowVisible: false,
          headerTitleStyle: { fontFamily: font.semibold, fontSize: 16 }, headerTitleAlign: "center", headerBackTitle: tr("Zurück"),
          contentStyle: { backgroundColor: t.bg },
          // Direkt geöffnet (Link, Benachrichtigung): trotzdem ein Weg zurück zur Lage
          ...(navigation.canGoBack() ? {} : { headerLeft: () => <HomeBack /> }),
        })}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Semay" }} />
          <Stack.Screen name="item/[id]" options={{ title: tr("Meldung") }} />
          <Stack.Screen name="place/[id]" options={{ title: tr("Ort") }} />
          <Stack.Screen name="places" options={{ title: tr("Orte") }} />
          <Stack.Screen name="signal/[kind]" options={{ title: tr("Messwerte") }} />
          <Stack.Screen name="search" options={{ title: tr("Suchen"), animation: "fade" }} />
          <Stack.Screen name="claim/[id]" options={{ title: tr("Behauptung") }} />
          <Stack.Screen name="claim-form" options={{ title: tr("Behauptung"), presentation: "modal" }} />
          <Stack.Screen name="report/[date]" options={{ title: tr("Tagesbericht") }} />
          <Stack.Screen name="more" options={{ title: tr("Mehr") }} />
          <Stack.Screen name="sources" options={{ title: tr("Quellen") }} />
          <Stack.Screen name="method" options={{ title: tr("So arbeitet Semay") }} />
          <Stack.Screen name="satellite" options={{ title: tr("Satellit") }} />
          <Stack.Screen name="corrections" options={{ title: tr("Korrekturen") }} />
          <Stack.Screen name="login" options={{ title: tr("Redaktion"), presentation: "modal" }} />
          <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false, presentation: "modal", gestureEnabled: true }} />
        </Stack>
  );
}

// Alle lesen ohne Konto. Nur wer über „Passwort vergessen“ kommt, setzt zuerst ein neues Passwort.
function Gate({ children }: { children: React.ReactNode }) {
  const { recovery } = useData();
  const { ready, lang } = useLang();
  if (!ready) return null;
  if (recovery) return <SetPassword />;
  // Neue Sprache: alles neu zeichnen, damit jeder Text sie übernimmt
  return <View key={lang} style={{ flex: 1 }}>{children}</View>;
}

function HomeBack() {
  const t = useTheme();
  return (
    <Pressable onPress={() => router.replace("/")} accessibilityRole="button" accessibilityLabel={tr("Zur Lage")} hitSlop={10}
      style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 8 }}>
      <Ionicons name="chevron-back" size={22} color={t.ink} />
      <Text style={{ fontFamily: font.medium, fontSize: 16, color: t.ink }}>{tr("Lage")}</Text>
    </Pressable>
  );
}

// Beim allerersten Start einmal die Einführung zeigen
let welcomeChecked = false;
function FirstRun() {
  const { authReady } = useData();
  useEffect(() => {
    if (!authReady || welcomeChecked) return;
    welcomeChecked = true;
    AsyncStorage.getItem(WELCOME_KEY).then((v) => {
      if (v) return;
      // Gleich vermerken: auch wer die Einführung wegwischt, sieht sie nicht bei jedem Start erneut
      AsyncStorage.setItem(WELCOME_KEY, "1").catch(() => {});
      setTimeout(() => { try { router.push("/welcome?first=1"); } catch { /* Navigation noch nicht bereit */ } }, 350);
    }).catch(() => {});
  }, [authReady]);
  return null;
}

// Antippen einer Benachrichtigung öffnet den passenden Bildschirm (jede Benachrichtigung nur einmal)
const handled = new Set<string>();
function NotificationRouter() {
  const r = Notifications.useLastNotificationResponse();
  const { authReady, data, loading } = useData();
  useEffect(() => {
    // Erst wenn die Daten da sind: sonst zeigt der Zielbildschirm kurz „gibt es nicht“
    if (!r || !authReady || (!data && loading)) return;
    const id = r.notification.request.identifier;
    if (handled.has(id)) return;
    handled.add(id);
    const path = (r.notification.request.content.data as any)?.path;
    if (typeof path !== "string" || !path.startsWith("/")) return;
    if (path.startsWith("/report") && data && !data.owner) return;
    setTimeout(() => { try { router.push(path as any); } catch { /* Navigation noch nicht bereit */ } }, 400);
    Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
  }, [r, authReady, data, loading]);
  return null;
}
