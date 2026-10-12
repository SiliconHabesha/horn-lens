// Farben und Schrift von Horn Lens: ruhiger Nachrichten-Stil, Farbe nur mit Bedeutung (Quelle, Status, Warnung).
import { Platform, useColorScheme } from "react-native";

const light = {
  bg: "#EDF0EE",
  card: "#F9FAF9",
  cardAlt: "#E4E9E7",
  ink: "#13262E",
  muted: "#55666C",
  faint: "#5B6A6F",
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
  ship: "#B0245A",
  tab: "#F9FAF9",
  type: {
    government_er: "#9B5D00", progov_er: "#B5852F", government_et: "#2E5C9E", progov_et: "#5A7FB8",
    exile: "#6A4C9C", tigray: "#8E3B5C", international: "#0F6E74", ethiopian_independent: "#2F6B3A",
    un_ngo: "#4F5D75", aggregator: "#636D70", measurement: "#3F6C8C", maritime_authority: "#1F4E79",
  } as Record<string, string>,
  status: { confirmed: "#2F6B3A", likely: "#4A7520", unconfirmed: "#8A5D00", disputed: "#6A4C9C", false: "#9A3A12" } as Record<string, string>,
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
  ship: "#F07FA8",
  tab: "#132329",
  type: {
    government_er: "#E3A23B", progov_er: "#D4B46A", government_et: "#7FA6E0", progov_et: "#A9C3EA",
    exile: "#A68BD6", tigray: "#D88AA9", international: "#4FB3B5", ethiopian_independent: "#6FB37B",
    un_ngo: "#A3B1C6", aggregator: "#8E9A9D", measurement: "#8DB6D4", maritime_authority: "#9CC1E8",
  },
  status: { confirmed: "#6FB37B", likely: "#A8C77A", unconfirmed: "#E3A23B", disputed: "#B9A0E6", false: "#E58A5E" },
};

export function useTheme(): Theme & { dark: boolean } {
  const scheme = useColorScheme();
  return scheme === "dark" ? { ...dark, dark: true } : { ...light, dark: false };
}

/** Markenfarben (fest, unabhängig vom hellen oder dunklen Modus). Siehe brand/ und das Markenhandbuch. */
export const BRAND = {
  ink: "#13262E",        // Tiefsee: App-Symbol, Text
  paper: "#EDF0EE",      // Gischt: Papier
  lagoon: "#0F6E74",     // Lagune: Akzent auf hellem Grund
  lagoonLight: "#4FB3B5", // Lagune hell: Akzent auf dunklem Grund
  night: "#0E1A1F",      // Nacht: Hintergrund im dunklen Modus
};

export const font = {
  // Schibsted Grotesk: Hausschrift eines skandinavischen Nachrichtenverlags, kräftig in Überschriften, ruhig im Text
  regular: "SG_400",
  medium: "SG_500",
  semibold: "SG_600",
  bold: "SG_700",
  black: "SG_800",
  ethiopic: "NotoSansEthiopic_400Regular",
  ethiopicBold: "NotoSansEthiopic_600SemiBold",
};

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };
export const radius = { s: 8, m: 12, l: 16, pill: 999 };

// Im Browser keinen schwarzen Fokusrahmen um Eingabefelder (das Feld hat schon einen eigenen Rahmen)
export const noOutline: any = Platform.OS === "web" ? { outlineStyle: "none" } : {};
