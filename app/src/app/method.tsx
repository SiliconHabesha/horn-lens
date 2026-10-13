// So arbeitet Semay: Regeln, Grenzen und die Nachweise, die die Datenanbieter verlangen.
import React from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Card, openLink, Screen, T } from "../components/ui";
import { tzName } from "../lib/de";
import { KIND_ORDER, kindLabel } from "../lib/assess";
import { t as tr } from "../lib/i18n";
import { space, useTheme } from "../lib/theme";

const KIND_NOTE: Record<string, string> = {
  contested: "Mindestens eine Meldung berichtet, dass etwas bestritten oder zurückgewiesen wird.",
  single: "Bisher berichtet nur ein Medium darüber. Grund zur Vorsicht.",
  oneSide: "Alle Medien gehören zu einer Konfliktseite, etwa nur Eritreas Regierung oder nur Exilmedien.",
  outside: "Nur Medien von außerhalb berichten; keine Konfliktseite hat sich in unseren Quellen geäußert.",
  multi: "Medien verschiedener Seiten berichten. Das bestätigt es nicht, oft stützen sich alle auf dieselbe Erklärung.",
};
const B = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: "row", gap: 8 }}><T v="body">•</T><T v="body" style={{ flex: 1 }}>{children}</T></View>
);

export default function Method() {
  const t = useTheme();
  return (
    <Screen topInset={false} refresh={false}>
      <T v="body">{tr("Für jede Seite gelten dieselben Regeln. Wo wir nichts sehen können, sagen wir es.")}</T>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>{tr("Was du siehst")}</T>
      <View style={{ gap: 6 }}>
        <B>{tr("Meldungen: die Schlagzeile, ein Link zum Original und wer sie veröffentlicht hat. Wir kopieren keine Artikel. Eine Meldung ist keine geprüfte Tatsache.")}</B>
        <B>{tr("Schlagzeilen in Englisch, Amharisch, Tigrinya oder Arabisch übersetzt Semay maschinell ins Deutsche (MyMemory). Das Original steht in der Meldung immer dabei; die Übersetzung kann Fehler enthalten.")}</B>
        <B>{tr("„Auf einen Blick“ auf der Lage entsteht nach festen Regeln aus Zahlen und Meldungen, ohne KI und ohne Wertung. Jeder Satz nennt seine Quelle.")}</B>
        <B>{tr("Ist die Datenlage zu dünn (weniger als drei Meldungen im Zeitraum oder viele gestörte Quellen), sagt „Auf einen Blick“ das ausdrücklich, statt eine Lage zu behaupten. Darunter steht, was wir gerade nicht sehen können.")}</B>
        <B>{tr("Die Art eines Ereignisses (Militär, Gefechte, Grenze, Politik, Diplomatie, Seefahrt, Humanitäre Lage, Desinformation, Infrastruktur) erkennt Semay automatisch an Stichwörtern in der Schlagzeile. Das kann irren und ist überall als automatisch gekennzeichnet.")}</B>
        <B>{tr("Orte: Messwerte (Hitzepunkte, Erdbeben) haben genaue Koordinaten. Vorfälle auf See sind ungefähr verortet, wie UKMTO sie angibt. Meldungen werden nie auf einen Punkt gesetzt: Nennt eine Schlagzeile einen Ort, zeigt die Karte eine Fläche um ihn mit dem Hinweis „erwähnt, nicht verortet“. Ohne Ortsnamen erscheint eine Meldung nicht auf der Karte.")}</B>
        <B>{tr("Geschichten: Nennen mehrere Medien in ähnlichen Worten dasselbe, fasst Semay ihre Meldungen automatisch zusammen. Das sagt nichts darüber, ob es stimmt, nur wer darüber berichtet.")}</B>
        <B>{tr("Messwerte: Messungen von Satelliten und Sensoren. Sie zeigen, dass an einem Ort zu einer Zeit etwas geschah, nie wer es war oder warum.")}</B>
        <B>{tr("Satellitenbilder: Sentinel-2-Ausschnitte mit genauer Aufnahmezeit, nur mit höchstens 3 % Wolken.")}</B>
        <B>{tr("Zeiten sind Berliner Zeit (derzeit {tz}), außer den Aufnahmezeiten der Satelliten in UTC.", { tz: tzName() })}</B>
        <B>{tr("Antwortet eine Messquelle drei Stunden lang nicht, steht dort ein Strich (–) statt einer Null; ebenso, wenn Semay nur eine Auswahl lädt und darin nichts liegt. Erfunden wird nichts.")}</B>
      </View>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>{tr("Wie Semay Geschichten einordnet")}</T>
      <View style={{ gap: 6 }}>
        <B>{tr("Semay prüft nichts selbst. Es beschreibt nur, wer berichtet. Eine einzige Quelle ist ein Grund zur Vorsicht; viele Quellen beweisen aber nichts, weil sich oft alle auf dieselbe Erklärung oder Agenturmeldung stützen.")}</B>
        {KIND_ORDER.map((k) => <B key={k}>{`${kindLabel(k)}: ${tr(KIND_NOTE[k])}`}</B>)}
        <B>{tr("Jede Quelle ist offen einer Seite zugeordnet: Eritreas Regierung und ihr nahe Medien, eritreische Exilmedien, Äthiopiens Regierung und ihr nahe Medien, Medien aus Tigray, oder von außerhalb. Die Zuordnung steht unter Quellen.")}</B>
        <B>{tr("Semay sieht nur, was Medien veröffentlichen. Was nur in sozialen Netzwerken oder Chatgruppen kursiert, erscheint erst, wenn ein Medium darüber berichtet.")}</B>
        <B>{tr("Bis Oktober 2026 hat Semay einzelne Behauptungen von Hand geprüft. Diese Einträge stehen im Archiv und werden nicht mehr aktualisiert.")}</B>
      </View>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>{tr("Was wir nicht sehen können")}</T>
      <View style={{ gap: 6 }}>
        <B>{tr("In Eritrea gibt es fast keine unabhängigen Medien. Die meisten Berichte stammen von der Regierung, aus der Diaspora oder aus dem Ausland.")}</B>
        <B>{tr("Kurze Rückgänge der Internetverbindung in Eritrea können unbemerkt bleiben, das Messsignal ist schwach.")}</B>
        <B>{tr("Kleinere Erdbeben in dieser Region erfasst USGS nur lückenhaft.")}</B>
        <B>{tr("Vorfälle auf See sind die, die UKMTO meldet. Was nur andere Marinen oder Reedereien melden, kann fehlen.")}</B>
        <B>{tr("Bei 10 m pro Pixel zeigen Satelliten große Gebäude, Schiffe und Landebahnen, keine Menschen oder einzelnen Fahrzeuge.")}</B>
      </View>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>{tr("Fehler und Widerspruch")}</T>
      <View style={{ gap: 6 }}>
        <B>{tr("Wer die Zuordnung einer Quelle oder eine Einordnung für falsch hält, schreibt an info@beles.app. Wir korrigieren dann die Regeln für alle, nicht einzelne Meldungen.")}</B>
      </View>
      <View style={{ flexDirection: "row", gap: space.l, marginTop: space.s, flexWrap: "wrap" }}>
        <Pressable onPress={() => router.push("/corrections")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}><T v="smallStrong" color={t.accent}>{tr("Korrekturen ansehen")}</T></Pressable>
        <Pressable onPress={() => openLink("mailto:info@beles.app?subject=Semay")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}><T v="smallStrong" color={t.accent}>{tr("E-Mail schreiben")}</T></Pressable>
      </View>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>{tr("Nachweise")}</T>
      <T v="caption" style={{ marginBottom: space.s }}>{tr("In der Originalsprache, wie von den Anbietern verlangt.")}</T>
      <Card style={{ gap: 8 }}>
        <T v="small" color={t.ink}>Fire detections: We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Earth Science Data and Information System (ESDIS). Near real-time data are provided as is; see the <T v="small" color={t.accent} onPress={() => openLink("https://www.earthdata.nasa.gov/data/projects/lance/disclaimer")}>LANCE disclaimer</T>.</T>
        <T v="small" color={t.ink}>Earthquakes: Credit: U.S. Geological Survey.</T>
        <T v="small" color={t.ink}>Internet outages: IODA, Georgia Tech.</T>
        <T v="small" color={t.ink}>Sea incidents: UKMTO. Contains public sector information licensed under the Open Government Licence v3.0.</T>
        <T v="small" color={t.ink}>Satellite images: Contains modified Copernicus Sentinel data, processed by Microsoft Planetary Computer.</T>
        <T v="small" color={t.ink}>Map outlines and regional boundaries: Made with Natural Earth.</T>
      </Card>
      <T v="small" style={{ marginTop: space.m }}>{tr("Semay ist weder mit NASA, USGS, UKMTO, dem britischen Verteidigungsministerium, Georgia Tech, Microsoft, der ESA noch der Europäischen Union verbunden und wird von keiner dieser Stellen unterstützt.")}</T>
    </Screen>
  );
}
