// So arbeitet Horn Lens: Regeln, Grenzen und die Nachweise, die die Datenanbieter verlangen.
import React from "react";
import { View } from "react-native";
import { Card, openLink, Screen, T } from "../components/ui";
import { STATUS, STATUS_ORDER, tzName } from "../lib/de";
import { useData } from "../lib/data";
import { space, useTheme } from "../lib/theme";

const B = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: "row", gap: 8 }}><T v="body">•</T><T v="body" style={{ flex: 1 }}>{children}</T></View>
);

export default function Method() {
  const t = useTheme();
  const { data } = useData();
  return (
    <Screen topInset={false} refresh={false}>
      <T v="body">Für jede Seite gelten dieselben Regeln. Wo wir nichts sehen können, sagen wir es.</T>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Was du siehst</T>
      <View style={{ gap: 6 }}>
        <B>Meldungen: die Schlagzeile, ein Link zum Original und wer sie veröffentlicht hat. Wir kopieren keine Artikel. Eine Meldung ist keine bestätigte Tatsache.</B>
        {data?.owner ? <B>Geschichten: Nennen mehrere Medien in ähnlichen Worten dasselbe, fasst Horn Lens ihre Meldungen automatisch zusammen. Das sagt nichts darüber, ob es stimmt, nur wer darüber berichtet.</B> : null}
        <B>Messwerte: Messungen von Satelliten und Sensoren. Sie zeigen, dass an einem Ort zu einer Zeit etwas geschah, nie wer es war oder warum.</B>
        <B>Satellitenbilder: Sentinel-2-Ausschnitte mit genauer Aufnahmezeit, nur mit höchstens 3 % Wolken.</B>
        <B>{`Zeiten sind Berliner Zeit (derzeit ${tzName()}), außer den Aufnahmezeiten der Satelliten in UTC.`}</B>
        <B>Antwortet eine Messquelle drei Stunden lang nicht, steht dort „keine Daten“ statt einer Null. Erfunden wird nichts.</B>
      </View>
      {data?.owner ? (
        <>
          <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Wie eine Behauptung ihre Stufe bekommt</T>
          <View style={{ gap: 6 }}>
            {STATUS_ORDER.map((k) => <B key={k}>{`${STATUS[k][0]}: ${STATUS[k][1]}`}</B>)}
            <B>Zwei Quellen gelten nur als unabhängig, wenn es verschiedene Organisationen sind. Eine Reuters-Meldung, die ein anderes Medium übernimmt, zählt einmal.</B>
            <B>Jede Änderung bleibt mit Datum, Notiz und Quellen im Verlauf. Ein berichtigter Wortlaut ist mit „Berichtigt“ markiert.</B>
          </View>
        </>
      ) : null}
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Was wir nicht sehen können</T>
      <View style={{ gap: 6 }}>
        <B>In Eritrea gibt es fast keine unabhängigen Medien. Die meisten Berichte stammen von der Regierung, aus der Diaspora oder aus dem Ausland.</B>
        {data?.owner ? <B>Kurze Internet-Einbrüche in Eritrea können unbemerkt bleiben, das Messsignal ist schwach.</B> : null}
        <B>Kleinere Erdbeben in dieser Region erfasst USGS nur lückenhaft.</B>
        <B>Vorfälle auf See sind die, die UKMTO meldet. Was nur andere Marinen oder Reedereien melden, kann fehlen.</B>
        <B>Bei 10 m pro Pixel zeigen Satelliten große Gebäude, Schiffe und Landebahnen, keine Menschen oder einzelnen Fahrzeuge.</B>
      </View>
      <T v="h2" style={{ marginTop: space.xl, marginBottom: space.s }}>Nachweise</T>
      <T v="caption" style={{ marginBottom: space.s }}>In der Originalsprache, wie von den Anbietern verlangt.</T>
      <Card style={{ gap: 8 }}>
        <T v="small" color={t.ink}>Fire detections: We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Earth Science Data and Information System (ESDIS). Near real-time data are provided as is; see the <T v="small" color={t.accent} onPress={() => openLink("https://www.earthdata.nasa.gov/data/projects/lance/disclaimer")}>LANCE disclaimer</T>.</T>
        <T v="small" color={t.ink}>Earthquakes: Credit: U.S. Geological Survey.</T>
        {data?.owner ? <T v="small" color={t.ink}>Internet outages: IODA, Georgia Tech.</T> : null}
        <T v="small" color={t.ink}>Sea incidents: UKMTO. Contains public sector information licensed under the Open Government Licence v3.0.</T>
        <T v="small" color={t.ink}>Satellite images: Contains modified Copernicus Sentinel data, processed by Microsoft Planetary Computer.</T>
        <T v="small" color={t.ink}>Map outlines and regional boundaries: Made with Natural Earth.</T>
      </Card>
      <T v="small" style={{ marginTop: space.m }}>Horn Lens ist weder mit NASA, USGS, UKMTO oder dem britischen Verteidigungsministerium, Georgia Tech, Microsoft, der ESA noch der Europäischen Union verbunden und wird von keiner dieser Stellen unterstützt.</T>
    </Screen>
  );
}
