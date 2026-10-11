// Nur die verwendeten Schriftschnitte laden (hält App und Web-Fassung klein)
import { useFonts } from "expo-font";
const SG_400 = require("@expo-google-fonts/schibsted-grotesk/400Regular/SchibstedGrotesk_400Regular.ttf");
const SG_500 = require("@expo-google-fonts/schibsted-grotesk/500Medium/SchibstedGrotesk_500Medium.ttf");
const SG_600 = require("@expo-google-fonts/schibsted-grotesk/600SemiBold/SchibstedGrotesk_600SemiBold.ttf");
const SG_700 = require("@expo-google-fonts/schibsted-grotesk/700Bold/SchibstedGrotesk_700Bold.ttf");
const SG_800 = require("@expo-google-fonts/schibsted-grotesk/800ExtraBold/SchibstedGrotesk_800ExtraBold.ttf");
const NotoSansEthiopic_400Regular = require("@expo-google-fonts/noto-sans-ethiopic/400Regular/NotoSansEthiopic_400Regular.ttf");
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DataProvider, useData } from "../lib/data";
import Login from "./login";
import { WELCOME_KEY } from "./welcome";
import SetPassword from "../components/SetPassword";
import { ToastHost } from "../components/Toast";
import { pushSupported } from "../lib/push";
import { font, useTheme } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Root() {
  const t = useTheme();
  const [loaded] = useFonts({ SG_400, SG_500, SG_600, SG_700, SG_800, NotoSansEthiopic_400Regular });
  useEffect(() => { SystemUI.setBackgroundColorAsync(t.bg).catch(() => {}); }, [t.bg]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  useEffect(() => { if (Platform.OS === "web") { try { document.documentElement.lang = "de"; document.title = "Horn Lens"; } catch { /* egal */ } } }, []);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style={t.dark ? "light" : "dark"} />
        <Gate>
        <Stack screenOptions={({ navigation }: any) => ({
          headerStyle: { backgroundColor: t.bg }, headerTintColor: t.ink, headerShadowVisible: false,
          headerTitleStyle: { fontFamily: font.semibold, fontSize: 16 }, headerBackTitle: "Zurück",
          contentStyle: { backgroundColor: t.bg },
          // Direkt geöffnet (Link, Benachrichtigung): trotzdem ein Weg zurück zur Lage
          ...(navigation.canGoBack() ? {} : { headerLeft: () => <HomeBack /> }),
        })}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Horn Lens" }} />
          <Stack.Screen name="item/[id]" options={{ title: "Meldung" }} />
          <Stack.Screen name="place/[id]" options={{ title: "Ort" }} />
          <Stack.Screen name="places" options={{ title: "Orte" }} />
          <Stack.Screen name="signal/[kind]" options={{ title: "Messwerte" }} />
          <Stack.Screen name="search" options={{ title: "Suchen", animation: "fade" }} />
          <Stack.Screen name="claim/[id]" options={{ title: "Behauptung" }} />
          <Stack.Screen name="claim-form" options={{ title: "Behauptung", presentation: "modal" }} />
          <Stack.Screen name="report/[date]" options={{ title: "Tagesbericht" }} />
          <Stack.Screen name="more" options={{ title: "Mehr" }} />
          <Stack.Screen name="sources" options={{ title: "Quellen" }} />
          <Stack.Screen name="method" options={{ title: "So arbeitet Horn Lens" }} />
          <Stack.Screen name="login" options={{ title: "Anmelden", presentation: "modal" }} />
          <Stack.Screen name="welcome" options={{ headerShown: false, presentation: "modal", gestureEnabled: true }} />
        </Stack>
        <FirstRun />
        <ToastHost />
        {pushSupported ? <NotificationRouter /> : null}
        </Gate>
      </DataProvider>
    </SafeAreaProvider>
  );
}

// Die Web-Fassung ist privat: ohne Anmeldung nur der Anmeldebildschirm (so gewünscht; Impressum und Datenschutz liegen unter /impressum.html und /datenschutz.html)
const WEB_PRIVATE = true;
function Gate({ children }: { children: React.ReactNode }) {
  const { session, authReady, recovery } = useData();
  if (Platform.OS !== "web" || !WEB_PRIVATE) return <>{children}</>;
  if (!authReady) return null;
  if (!session) return <Login gate />;
  if (recovery) return <SetPassword />;
  return <>{children}</>;
}

function HomeBack() {
  const t = useTheme();
  return (
    <Pressable onPress={() => router.replace("/")} accessibilityRole="button" accessibilityLabel="Zur Lage" hitSlop={10}
      style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 8 }}>
      <Ionicons name="chevron-back" size={22} color={t.ink} />
      <Text style={{ fontFamily: font.medium, fontSize: 16, color: t.ink }}>Lage</Text>
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
      setTimeout(() => { try { router.push("/welcome"); } catch { /* Navigation noch nicht bereit */ } }, 350);
    }).catch(() => {});
  }, [authReady]);
  return null;
}

// Antippen einer Benachrichtigung öffnet den passenden Bildschirm (jede Benachrichtigung nur einmal)
const handled = new Set<string>();
function NotificationRouter() {
  const r = Notifications.useLastNotificationResponse();
  const { authReady, data } = useData();
  useEffect(() => {
    if (!r || !authReady) return;
    const id = r.notification.request.identifier;
    if (handled.has(id)) return;
    handled.add(id);
    const path = (r.notification.request.content.data as any)?.path;
    if (typeof path !== "string" || !path.startsWith("/")) return;
    if (path.startsWith("/report") && data && !data.owner) return;
    setTimeout(() => { try { router.push(path as any); } catch { /* Navigation noch nicht bereit */ } }, 400);
    Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
  }, [r, authReady]);
  return null;
}
