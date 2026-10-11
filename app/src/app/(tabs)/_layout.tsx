import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { tap } from "../../components/ui";
import { useData } from "../../lib/data";
import { font, useTheme } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (on: Icon, off: Icon) => ({ color, focused }: { color: any; focused: boolean }) => <Ionicons name={focused ? on : off} size={23} color={color} />;

export default function TabsLayout() {
  const t = useTheme();
  const { data } = useData();
  const owner = !!data?.owner;
  return (
    <Tabs screenListeners={{ tabPress: () => tap() }} screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: t.ink, tabBarInactiveTintColor: t.faint,
      tabBarStyle: { backgroundColor: t.tab, borderTopColor: t.rule, ...(Platform.OS === "web" ? { height: 62, paddingBottom: 8 } : {}) },
      tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 10, letterSpacing: -0.2 }, tabBarAllowFontScaling: false, tabBarItemStyle: { paddingHorizontal: 0 },
      sceneStyle: { backgroundColor: t.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: "Lage", tabBarIcon: icon("pulse", "pulse-outline") }} />
      <Tabs.Screen name="news" options={{ title: owner ? "Meldungen" : "Rotes Meer", tabBarIcon: icon("newspaper", "newspaper-outline") }} />
      <Tabs.Screen name="claims" options={{ title: "Behauptungen", href: owner ? undefined : null, tabBarIcon: icon("checkmark-done-circle", "checkmark-done-circle-outline") }} />
      <Tabs.Screen name="map" options={{ title: "Karte", tabBarIcon: icon("map", "map-outline") }} />
      <Tabs.Screen name="satellite" options={{ title: "Satellit", tabBarIcon: icon("planet", "planet-outline") }} />
    </Tabs>
  );
}
