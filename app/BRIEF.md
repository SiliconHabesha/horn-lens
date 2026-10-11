# Auftrag: Horn Lens auf Store-Niveau bringen (Runde 2, 11. Oktober 2026)

## Ziel
Eine App, die ein anspruchsvoller Nutzer täglich öffnet und weiterempfiehlt: in 10 Sekunden weiß man, was am Horn von Afrika los ist, ob es Neues gibt, und wie belastbar es ist. Maßstab: Apple-Design-Award-Niveau bei Ruhe, Klarheit und Handwerk; Glaubwürdigkeit wie bei Reuters/Bellingcat. Kein Gimmick, keine erfundenen Daten.

## Nutzer
- Betreiber (Yonatan): will morgens und unterwegs schnell den Stand, pflegt Behauptungen, teilt Meldungen.
- Später Öffentlichkeit (Diaspora, Journalisten, Analysten): offene Ausgabe ohne Konto.
- Deutsch, Handy zuerst; Nicht-Techniker.

## Was jetzt nicht reicht (Selbstkritik nach Bildschirmfotos)
1. „Lage“ ist eine lange Textliste. Es fehlt ein sofort lesbares Lagebild: Was hat sich seit gestern verändert? Wo auf der Karte?
2. Meldungen sind einzelne Schlagzeilen. Dieselbe Geschichte erscheint mehrfach; man sieht nicht, welche Seiten darüber berichten (Kern des Projekts: wer sagt was).
3. Keine Detailansicht einer Meldung: Tippen öffnet sofort die fremde Seite.
4. Karte: fest, kein Zoomen mit zwei Fingern, kein Verschieben.
5. Kein Einstieg für neue Nutzer: Farben und Stufen erklärt sich niemand selbst.
6. Nichts merken oder beobachten (Behauptung verfolgen, Meldung merken).
7. Wenig Bewegung und Rückmeldung (Übergänge, Lade-Platzhalter statt Kreisel).
8. Impressum fehlt (soll identisch zu BELES sein).

## Recherche-Fragen
- Wie lösen Ground News, Reuters, AP News, Liveuamap, ACLED, Bellingcat, Flightradar24, Windy, Apple News, Artifact (eingestellt) und Particle die Punkte 1–7?
- Muster für „Story-Cluster“ (gleiche Geschichte, verschiedene Quellen, Abdeckung nach Quellenart/Ausrichtung).
- Best Practices: Onboarding für Nachrichten-Apps, Barrierefreiheit, Push-Strategie, Lade-Zustände, Offline.
- Was Apple/Google bei News-Apps in der Prüfung verlangen.

## Umsetzungs-Regeln
- Nichts erfinden: jede Zahl aus der Datenbank, jede Gruppierung nachvollziehbar (z. B. gemeinsame Wörter).
- Neutral: Quellenarten nebeneinander, keine Wertung einer Seite.
- Expo SDK 57, react-native-web muss weiter laufen; keine Dienste mit Kosten oder API-Schlüsseln.
- Jede Änderung: Typprüfung, Web-Build, Test mit Bildschirmfotos, Blick auf die Fotos, unabhängige Prüfung am Ende.
- Sicherheit: private Daten nie in den App-Code; Anmeldung und Zwischenspeicher wie gehabt.

## Stand nach Runde 2 (11. Oktober 2026)
Umgesetzt nach Recherche (Ground News, Particle, Bellingcat, ACLED, Flightradar24, Reuters/BBC, Apple HIG, Store-Regeln):
- Geschichten: gleiche Nachricht bei mehreren Medien zusammengefasst (seltene gemeinsame Wörter, 48 Std.), Balken nach Quellenart, gemeinsame Wörter sichtbar.
- Meldung im Detail: Einordnung der Quelle, alle Medien zur Geschichte nach Quellenart, vorsichtiger Hinweis, welche Seiten keine passende Schlagzeile haben, Merken, Teilen, Behauptung daraus anlegen.
- Lage: „Seit deinem letzten Besuch“ mit Meldungen, Behauptungen, Vorfällen, Erdbeben; kleine Karte; Eritrea und „Meistberichtet“ als Geschichten.
- Karte: zoomen (zwei Finger, Doppeltipp, Mausrad, Knöpfe), verschieben, Zeitraum, Detailkarte über der Karte, Genauigkeit des Ortes.
- Einführung (3 Seiten, überspringbar, unter „Mehr“ erneut), Merkliste, Lade-Platzhalter, größere Tippflächen, Impressum wie BELES, Kontakt.
Offen: Behauptung verfolgen mit eigener Benachrichtigung (braucht Server-Änderung), Übersetzung von Tigrinya/Amharisch für die Zuordnung.

## Stand nach Runde 3 (11. Oktober 2026, abends)
- Orte: 29 Orte mit Seite (Schlagzeilen, die den Ort nennen, Messwerte im Umkreis, Satellitenbilder, Behauptungen, Orte in der Nähe); Schreibweisen lateinisch und in Ge'ez-Schrift; mehrdeutige Namen (Sawa, Bure, Keren, Assab, Shire, Mocha) zählen nur mit passendem Zusammenhangswort; umstrittene Gebiete als umstritten bezeichnet.
- Karte: Orte antippbar, kleinere Orte erscheinen beim Zoomen; Lage zeigt die heute genannten Orte.
- Behauptungen: Suche, ähnliche Meldungen der letzten 72 Std. in jeder Behauptung, Datum per Heute/Gestern/Vorgestern und Prüfung auf gültiges Datum.
- Technik: iOS- und Android-Bündel bauen fehlerfrei; Lint eingerichtet (verbleibende Hinweise betreffen den nicht genutzten React Compiler); spürbare Rückmeldung nach dem Aktualisieren.
