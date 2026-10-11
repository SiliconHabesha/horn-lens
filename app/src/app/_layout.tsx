// Nur die verwendeten Schriftschnitte laden (hält App und Web-Fassung klein)
import { useFonts } from "expo-font";
const PublicSans_400Regular = require("@expo-google-fonts/public-sans/400Regular/PublicSans_400Regular.ttf");
const PublicSans_500Medium = require("@expo-google-fonts/public-sans/500Medium/PublicSans_500Medium.ttf");
const PublicSans_600SemiBold = require("@expo-google-fonts/public-sans/600SemiBold/PublicSans_600SemiBold.ttf");
const PublicSans_700Bold = require("@expo-google-fonts/public-sans/700Bold/PublicSans_700Bold.ttf");
const PublicSans_800ExtraBold = require("@expo-google-fonts/public-sans/800ExtraBold/PublicSans_800ExtraBold.ttf");
const NotoSansEthiopic_400Regular = require("@expo-google-fonts/noto-sans-ethiopic/400Regular/NotoSansEthiopic_400Regular.ttf");
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DataProvider, useData } from "../lib/data";
import Login from "./login";
import SetPassword from "../components/SetPassword";
import { pushSupported } from "../lib/push";
import { font, useTheme } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Root() {
  const t = useTheme();
  const [loaded] = useFonts({ PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold, PublicSans_800ExtraBold, NotoSansEthiopic_400Regular });
  useEffect(() => { SystemUI.setBackgroundColorAsync(t.bg).catch(() => {}); }, [t.bg]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync().catch(() => {}); }, [loaded]);
  useEffect(() => { if (Platform.OS === "web") { try { document.documentElement.lang = "de"; document.title = "Horn Lens"; } catch { /* egal */ } } }, []);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <DataProvider>
        <StatusBar style={t.dark ? "light" : "dark"} />
        <Gate>
        <Stack screenOptions={{
          headerStyle: { backgroundColor: t.bg }, headerTintColor: t.ink, headerShadowVisible: false,
          headerTitleStyle: { fontFamily: font.semibold, fontSize: 16 }, headerBackTitle: "Zurück",
          contentStyle: { backgroundColor: t.bg },
        }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Horn Lens" }} />
          <Stack.Screen name="claim/[id]" options={{ title: "Behauptung" }} />
          <Stack.Screen name="claim-form" options={{ title: "Behauptung", presentation: "modal" }} />
          <Stack.Screen name="report/[date]" options={{ title: "Tagesbericht" }} />
          <Stack.Screen name="more" options={{ title: "Mehr" }} />
          <Stack.Screen name="sources" options={{ title: "Quellen" }} />
          <Stack.Screen name="method" options={{ title: "So arbeitet Horn Lens" }} />
          <Stack.Screen name="login" options={{ title: "Anmelden", presentation: "modal" }} />
        </Stack>
        {pushSupported ? <NotificationRouter /> : null}
        </Gate>
      </DataProvider>
    </SafeAreaProvider>
  );
}

// Die Web-Fassung ist privat: ohne Anmeldung nur der Anmeldebildschirm (Impressum und Datenschutz fehlen noch für eine öffentliche Seite)
const WEB_PRIVATE = true;
function Gate({ children }: { children: React.ReactNode }) {
  const { session, authReady, recovery } = useData();
  if (Platform.OS !== "web" || !WEB_PRIVATE) return <>{children}</>;
  if (!authReady) return null;
  if (!session) return <Login gate />;
  if (recovery) return <SetPassword />;
  return <>{children}</>;
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
