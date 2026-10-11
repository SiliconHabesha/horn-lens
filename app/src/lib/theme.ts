// Farben und Schrift von Horn Lens: ruhiger Nachrichten-Stil, Farbe nur mit Bedeutung (Quelle, Status, Warnung).
import { Platform, useColorScheme } from "react-native";

const light = {
  bg: "#EDF0EE",
  card: "#F9FAF9",
  cardAlt: "#E4E9E7",
  ink: "#13262E",
  muted: "#55666C",
  faint: "#617075",
  rule: "#D3DAD8",
  accent: "#0F6E74",
  accentInk: "#FFFFFF",
  warn: "#9A3A12",
  warnBg: "#F6E7DF",
  okBg: "#E3EFE6",
  water: "#DCE7E8",
  land: "#F7F8F7",
  landEr: "#E6EBE3",
  border: "#9FB0B2",
  fire: "#D4531C",
  quake: "#6A4C9C",
  ship: "#9A3A12",
  tab: "#F9FAF9",
  type: {
    government_er: "#9B5D00", progov_er: "#826626", government_et: "#8F4F2A", progov_et: "#965D45",
    exile: "#6A4C9C", tigray: "#8E3B5C", international: "#0F6E74", ethiopian_independent: "#2F6B3A",
    un_ngo: "#2C5A9E", aggregator: "#636D70", measurement: "#3F6C8C", maritime_authority: "#1F4E79",
  } as Record<string, string>,
  status: { confirmed: "#2F6B3A", likely: "#0F6E74", unconfirmed: "#8A5D00", disputed: "#6A4C9C", false: "#9A3A12" } as Record<string, string>,
};
export type Theme = typeof light;

const dark: Theme = {
  bg: "#0E1A1F",
  card: "#15262E",
  cardAlt: "#1C313A",
  ink: "#E4ECEB",
  muted: "#9AAAAD",
  faint: "#7D8E92",
  rule: "#273C44",
  accent: "#4FB3B5",
  accentInk: "#0E1A1F",
  warn: "#E58A5E",
  warnBg: "#3A2219",
  okBg: "#1B3326",
  water: "#10252D",
  land: "#18303A",
  landEr: "#22404A",
  border: "#4C6670",
  fire: "#FF8A4C",
  quake: "#B9A0E6",
  ship: "#E58A5E",
  tab: "#132329",
  type: {
    government_er: "#E3A23B", progov_er: "#D4B46A", government_et: "#D08A5F", progov_et: "#DCA285",
    exile: "#A68BD6", tigray: "#D88AA9", international: "#4FB3B5", ethiopian_independent: "#6FB37B",
    un_ngo: "#7FA6E0", aggregator: "#8E9A9D", measurement: "#8DB6D4", maritime_authority: "#9CC1E8",
  },
  status: { confirmed: "#6FB37B", likely: "#4FB3B5", unconfirmed: "#E3A23B", disputed: "#B9A0E6", false: "#E58A5E" },
};

export function useTheme(): Theme & { dark: boolean } {
  const scheme = useColorScheme();
  return scheme === "dark" ? { ...dark, dark: true } : { ...light, dark: false };
}

export const font = {
  regular: "PublicSans_400Regular",
  medium: "PublicSans_500Medium",
  semibold: "PublicSans_600SemiBold",
  bold: "PublicSans_700Bold",
  black: "PublicSans_800ExtraBold",
  ethiopic: "NotoSansEthiopic_400Regular",
};

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };
export const radius = { s: 8, m: 12, l: 16, pill: 999 };

// Im Browser keinen schwarzen Fokusrahmen um Eingabefelder (das Feld hat schon einen eigenen Rahmen)
export const noOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : {};
