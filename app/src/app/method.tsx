// So arbeitet Semay: Regeln, Grenzen und die Nachweise, die die Datenanbieter verlangen.
import React from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Card, openLink, Screen, T } from "../components/ui";
import { STATUS, STATUS_ORDER, tzName } from "../lib/de";
import { space, useTheme } from "../lib/theme";

const B = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: "row", gap: 8 }}><T v="body">•</T><T v="body" style={{ flex: 1 }}>{children}</T></View>
);

export default function Method() {
  const t = useTheme();
  return (
    <Screen topInset={false} refresh={false}>
      <T v="body">Für jede Seite gelten dieselben Regeln. Wo wir nichts sehen können, sagen wir es.</T>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Was du siehst</T>
      <View style={{ gap: 6 }}>
        <B>Meldungen: die Schlagzeile, ein Link zum Original und wer sie veröffentlicht hat. Wir kopieren keine Artikel. Eine Meldung ist keine geprüfte Tatsache.</B>
        <B>Geschichten: Nennen mehrere Medien in ähnlichen Worten dasselbe, fasst Semay ihre Meldungen automatisch zusammen. Das sagt nichts darüber, ob es stimmt, nur wer darüber berichtet.</B>
        <B>Messwerte: Messungen von Satelliten und Sensoren. Sie zeigen, dass an einem Ort zu einer Zeit etwas geschah, nie wer es war oder warum.</B>
        <B>Satellitenbilder: Sentinel-2-Ausschnitte mit genauer Aufnahmezeit, nur mit höchstens 3 % Wolken.</B>
        <B>{`Zeiten sind Berliner Zeit (derzeit ${tzName()}), außer den Aufnahmezeiten der Satelliten in UTC.`}</B>
        <B>Antwortet eine Messquelle drei Stunden lang nicht, steht dort ein Strich (–) statt einer Null; ebenso, wenn Semay nur eine Auswahl lädt und darin nichts liegt. Erfunden wird nichts.</B>
      </View>
      {(
        <>
          <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Wie eine Behauptung ihre Stufe bekommt</T>
          <View style={{ gap: 6 }}>
            {STATUS_ORDER.map((k) => <B key={k}>{`${STATUS[k][0]}: ${STATUS[k][1]}`}</B>)}
            <B>Zwei Quellen gelten nur als unabhängig, wenn es verschiedene Organisationen sind. Eine Reuters-Meldung, die ein anderes Medium übernimmt, zählt einmal.</B>
            <B>Jede Änderung bleibt mit Datum, Notiz und Quellen im Verlauf. Ein berichtigter Wortlaut ist mit „Berichtigt“ markiert.</B>
          </View>
        </>
      )}
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Was wir nicht sehen können</T>
      <View style={{ gap: 6 }}>
        <B>In Eritrea gibt es fast keine unabhängigen Medien. Die meisten Berichte stammen von der Regierung, aus der Diaspora oder aus dem Ausland.</B>
        <B>Kurze Rückgänge der Internetverbindung in Eritrea können unbemerkt bleiben, das Messsignal ist schwach.</B>
        <B>Kleinere Erdbeben in dieser Region erfasst USGS nur lückenhaft.</B>
        <B>Vorfälle auf See sind die, die UKMTO meldet. Was nur andere Marinen oder Reedereien melden, kann fehlen.</B>
        <B>Bei 10 m pro Pixel zeigen Satelliten große Gebäude, Schiffe und Landebahnen, keine Menschen oder einzelnen Fahrzeuge.</B>
      </View>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Fehler und Widerspruch</T>
      <View style={{ gap: 6 }}>
        <B>Wer eine Stufe oder einen Wortlaut für falsch hält, schreibt an info@beles.app, am besten mit einem Beleg. Jede Behauptung hat dafür unten den Knopf „Korrektur melden“.</B>
        <B>Wir prüfen jede Meldung. Ändert sich dadurch etwas, steht es mit Datum im Verlauf der Behauptung und in der Liste der Korrekturen.</B>
      </View>
      <View style={{ flexDirection: "row", gap: space.l, marginTop: space.s, flexWrap: "wrap" }}>
        <Pressable onPress={() => router.push("/corrections")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}><T v="smallStrong" color={t.accent}>Korrekturen ansehen</T></Pressable>
        <Pressable onPress={() => openLink("mailto:info@beles.app?subject=Horn%20Lens")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}><T v="smallStrong" color={t.accent}>E-Mail schreiben</T></Pressable>
      </View>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Nachweise</T>
      <T v="caption" style={{ marginBottom: space.s }}>In der Originalsprache, wie von den Anbietern verlangt.</T>
      <Card style={{ gap: 8 }}>
        <T v="small" color={t.ink}>Fire detections: We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Earth Science Data and Information System (ESDIS). Near real-time data are provided as is; see the <T v="small" color={t.accent} onPress={() => openLink("https://www.earthdata.nasa.gov/data/projects/lance/disclaimer")}>LANCE disclaimer</T>.</T>
        <T v="small" color={t.ink}>Earthquakes: Credit: U.S. Geological Survey.</T>
        <T v="small" color={t.ink}>Internet outages: IODA, Georgia Tech.</T>
        <T v="small" color={t.ink}>Sea incidents: UKMTO. Contains public sector information licensed under the Open Government Licence v3.0.</T>
        <T v="small" color={t.ink}>Satellite images: Contains modified Copernicus Sentinel data, processed by Microsoft Planetary Computer.</T>
        <T v="small" color={t.ink}>Map outlines and regional boundaries: Made with Natural Earth.</T>
      </Card>
      <T v="small" style={{ marginTop: space.m }}>Semay ist weder mit NASA, USGS, UKMTO, dem britischen Verteidigungsministerium, Georgia Tech, Microsoft, der ESA noch der Europäischen Union verbunden und wird von keiner dieser Stellen unterstützt.</T>
    </Screen>
  );
}
