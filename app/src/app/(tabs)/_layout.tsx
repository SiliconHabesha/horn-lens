import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
// Seitenleiste auf großen Bildschirmen: Marke oben, darunter die normale Leiste
import { BottomTabBar } from "expo-router/build/react-navigation/bottom-tabs";
import { Logo } from "../../components/Logo";
import { tap } from "../../components/ui";
import { useData } from "../../lib/data";
import { font, useTheme } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (on: Icon, off: Icon) => ({ color, focused }: { color: any; focused: boolean }) => <Ionicons name={focused ? on : off} size={23} color={color} />;

export default function TabsLayout() {
  const t = useTheme();
  const { data } = useData();
  const owner = !!data?.owner;
  // Große Bildschirme (Tablet quer, Computer): Navigation als Leiste links statt unten
  const { width } = useWindowDimensions();
  const side = width >= 900;
  return (
    <Tabs screenListeners={{ tabPress: () => tap() }}
      tabBar={(props: any) => side ? (
        <View style={{ width: 240, height: "100%", alignSelf: "stretch", flexGrow: 0, flexShrink: 0, backgroundColor: t.tab, borderRightWidth: 1, borderRightColor: t.rule }}>
          <Pressable onPress={() => router.navigate("/")} accessibilityRole="link" accessibilityLabel="Horn Lens, zur Lage"
            style={{ paddingHorizontal: 22, paddingTop: 26, paddingBottom: 18 }}>
            <Logo size={19} sub="powered by BELES" />
          </Pressable>
          <BottomTabBar {...props} />
        </View>
      ) : <BottomTabBar {...props} />}
      screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: t.ink, tabBarInactiveTintColor: t.faint,
      tabBarPosition: side ? "left" : "bottom",
      tabBarVariant: "uikit",
      tabBarLabelPosition: side ? "beside-icon" : "below-icon",
      tabBarStyle: side ? { backgroundColor: t.tab, borderRightWidth: 1, borderRightColor: t.rule, width: 240, minWidth: 240, paddingTop: 0, flex: 1 }
        : { backgroundColor: t.tab, borderTopColor: t.rule, ...(Platform.OS === "web" ? { height: 62, paddingBottom: 8 } : {}) },
      tabBarItemStyle: side ? { justifyContent: "flex-start", alignSelf: "stretch", maxWidth: undefined, paddingHorizontal: 14, height: 48, borderRadius: 12, marginVertical: 2 } : { paddingHorizontal: 0 },
      tabBarLabelStyle: side ? { fontFamily: font.semibold, fontSize: 15, marginLeft: 12 } : { fontFamily: font.semibold, fontSize: 10, letterSpacing: -0.2 },
      tabBarActiveBackgroundColor: side ? t.cardAlt : undefined, tabBarAllowFontScaling: side,
      sceneStyle: { backgroundColor: t.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: "Lage", tabBarIcon: icon("compass", "compass-outline") }} />
      <Tabs.Screen name="news" options={{ title: owner ? "Meldungen" : "Rotes Meer", tabBarIcon: icon("newspaper", "newspaper-outline") }} />
      <Tabs.Screen name="claims" options={{ title: "Behauptungen", href: owner ? undefined : null, tabBarIcon: icon("checkmark-done-circle", "checkmark-done-circle-outline") }} />
      <Tabs.Screen name="map" options={{ title: "Karte", tabBarIcon: icon("map", "map-outline") }} />
      <Tabs.Screen name="satellite" options={{ title: "Satellit", tabBarIcon: icon("planet", "planet-outline") }} />
    </Tabs>
  );
}
