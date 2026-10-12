import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Tabs } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
// Seitenleiste auf großen Bildschirmen: Marke oben, darunter die normale Leiste
import { BottomTabBar } from "expo-router/build/react-navigation/bottom-tabs";
import { Logo } from "../../components/Logo";
import { tap } from "../../components/ui";
import { font, useTheme } from "../../lib/theme";

type Icon = keyof typeof Ionicons.glyphMap;
const icon = (on: Icon, off: Icon) => ({ color, focused }: { color: any; focused: boolean }) => <Ionicons name={focused ? on : off} size={23} color={color} />;

export default function TabsLayout() {
  const t = useTheme();
  // Große Bildschirme (Tablet quer, Computer): Navigation als Leiste links statt unten
  const { width } = useWindowDimensions();
  const side = width >= 900;
  return (
    <Tabs screenListeners={{ tabPress: () => tap() }}
      tabBar={(props: any) => side ? (
        <View style={{ width: 240, height: "100%", alignSelf: "stretch", flexGrow: 0, flexShrink: 0, backgroundColor: t.tab, borderRightWidth: 1, borderRightColor: t.rule }}>
          <Pressable onPress={() => router.navigate("/")} accessibilityRole="link" accessibilityLabel="Semay, zur Lage"
            style={{ paddingHorizontal: 22, paddingTop: 26, paddingBottom: 18 }}>
            <Logo size={19} sub="powered by BELES" />
          </Pressable>
          <BottomTabBar {...props} />
          {/* Weitere Ziele, die auf dem Handy oben rechts stehen */}
          <View style={{ marginTop: 12, paddingTop: 12, marginHorizontal: 8, borderTopWidth: 1, borderTopColor: t.rule }}>
            {([["search", "Suchen", "/search"], ["planet-outline", "Satellit", "/satellite"], ["location-outline", "Orte", "/places"], ["ellipsis-horizontal-circle-outline", "Mehr", "/more"]] as const).map(([ic, label, to]) => (
              <Pressable key={to} onPress={() => { tap(); router.push(to); }} accessibilityRole="link"
                style={({ pressed, hovered }: any) => ({ flexDirection: "row", alignItems: "center", gap: 12, height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: hovered ? t.cardAlt : "transparent", opacity: pressed ? 0.6 : 1 })}>
                <Ionicons name={ic} size={21} color={t.muted} />
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: t.muted }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : <BottomTabBar {...props} />}
      screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: t.ink, tabBarInactiveTintColor: t.faint,
      tabBarPosition: side ? "left" : "bottom",
      tabBarVariant: "uikit",
      tabBarLabelPosition: side ? "beside-icon" : "below-icon",
      tabBarStyle: side ? { backgroundColor: t.tab, width: 240, minWidth: 240, paddingTop: 0, flexGrow: 0, borderRightWidth: 0 }
        : { backgroundColor: t.tab, borderTopColor: t.rule, ...(Platform.OS === "web" ? { height: 62, paddingBottom: 8 } : {}) },
      tabBarItemStyle: side ? { justifyContent: "flex-start", alignSelf: "stretch", maxWidth: undefined, paddingHorizontal: 14, height: 48, borderRadius: 12, marginVertical: 2 } : { paddingHorizontal: 0 },
      tabBarLabelStyle: side ? { fontFamily: font.semibold, fontSize: 15, marginLeft: 12 } : { fontFamily: font.semibold, fontSize: 10, letterSpacing: -0.2 },
      tabBarActiveBackgroundColor: side ? t.cardAlt : undefined, tabBarAllowFontScaling: side,
      sceneStyle: { backgroundColor: t.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: "Lage", tabBarIcon: icon("compass", "compass-outline") }} />
      <Tabs.Screen name="news" options={{ title: "Meldungen", tabBarIcon: icon("newspaper", "newspaper-outline") }} />
      <Tabs.Screen name="claims" options={{ title: "Behauptungen", tabBarIcon: icon("checkmark-done-circle", "checkmark-done-circle-outline") }} />
      <Tabs.Screen name="map" options={{ title: "Karte", tabBarIcon: icon("map", "map-outline") }} />
    </Tabs>
  );
}
