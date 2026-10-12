// Markenzeichen von Semay (ሰማይ, „Himmel“ auf Tigrinya und Amharisch): zwei Klammern um einen Punkt.
// Bedeutung: Jede Angabe steht in ihrem Zusammenhang („in Klammern: wer sagt es“). Zwei gleiche Bögen: beide Seiten
// mit gleichem Gewicht, unter demselben Himmel. Der Punkt ist das Ereignis.
// Quelle der Geometrie: brand/src/build.py (gleiche Maße, damit App-Symbol und Zeichen in der App übereinstimmen).
import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { font, useTheme } from "../lib/theme";
import { T } from "./ui";

const RX = 270, RY = 320, GAP = 22;
const HALF_W = RX + 36, HALF_H = RY * Math.sin((112 * Math.PI) / 180) + 36;
const arc = (cx: number, cy: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + RX * Math.cos((a * Math.PI) / 180), cy + RY * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${RX} ${RY} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};
const LEFT = arc(0, 0, 90 + GAP, 270 - GAP), RIGHT = arc(0, 0, -90 + GAP, 90 - GAP);

/** Nur das Zeichen. size = Höhe in Punkten. Unter 24 Punkten kräftigere Striche, damit es lesbar bleibt. */
export function Mark({ size = 28, color, dot }: { size?: number; color?: string; dot?: string }) {
  const t = useTheme();
  const small = size < 24;
  const w = (HALF_W / HALF_H) * size;
  return (
    <Svg width={w} height={size} viewBox={`${-HALF_W} ${-HALF_H} ${HALF_W * 2} ${HALF_H * 2}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={LEFT} fill="none" stroke={color || t.ink} strokeWidth={small ? 96 : 72} strokeLinecap="round" />
      <Path d={RIGHT} fill="none" stroke={color || t.ink} strokeWidth={small ? 96 : 72} strokeLinecap="round" />
      <Circle cx={0} cy={0} r={small ? 88 : 70} fill={dot || t.accent} />
    </Svg>
  );
}

/** Zeichen und Wortmarke nebeneinander; Abstand und Größen wie im Markenhandbuch. */
export function Logo({ size = 22, color, sub }: { size?: number; color?: string; sub?: string }) {
  const t = useTheme();
  const c = color || t.ink;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.42 }} accessible accessibilityRole="header" accessibilityLabel={sub ? `Semay, ${sub}` : "Semay"}>
      <Mark size={size * 1.35} color={c} />
      <View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: size * 0.32 }}>
          <T style={{ fontFamily: font.black, fontSize: size, lineHeight: size * 1.15, letterSpacing: -size * 0.02, color: c }}>Semay</T>
          {/* Der Name in Ge'ez-Schrift, leiser als die lateinische Wortmarke */}
          <T style={{ fontFamily: font.ethiopicBold, fontSize: size * 0.68, lineHeight: size * 1.15, color: t.muted }}>ሰማይ</T>
        </View>
        {sub ? <T v="caption" style={{ marginTop: 1 }}>{sub}</T> : null}
      </View>
    </View>
  );
}
