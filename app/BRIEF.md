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

## Stand nach Runde 4 (UX, 11. Oktober 2026, spät)
- Lage: Messwerte als Raster, Auffälliges zuerst, jede Kachel führt zu einer eigenen Messwert-Seite; „Seit deinem letzten Besuch“ zeigt nur, was sich geändert hat; Kopfzeile „Stand hh:mm“; Suche oben rechts.
- Messwert-Seiten (Internet, Hitzepunkte nach Ort, Erdbeben, See) mit Stand und Quelle; ohne aktuelle Daten nie „alles ruhig“.
- Suche über Orte, Behauptungen, Meldungen, Quellen; zuletzt Gesuchtes.
- Kurze Bestätigungen (Gemerkt, Link kopiert, Gespeichert) mit „Rückgängig“.
- Meldungen: Filter eingeklappt, leere Regionen ausgeblendet.
- Große Bildschirme: Navigation als Leiste links.
- Benachrichtigungen öffnen jetzt die passende Messwert-Seite (Funktion notify v2).

## Gestaltung (Runde 5, UI)
- Schrift: Schibsted Grotesk (Hausschrift eines Nachrichtenverlags) für alles, Noto Sans Ethiopic für Ge'ez; Zahlen in Tabellenziffern.
- Etiketten in normaler Schreibung statt Versalien; Listen stehen direkt auf der Seite, Karten nur für abgeschlossene Einheiten (Hinweise, Messwerte, Karte).
- Erkennungszeichen: der Farbbalken „wer berichtet“. Die Lage beginnt mit „N Geschichten heute“ und diesem Balken über die volle Breite.
- Farben unverändert sparsam: Farbe nur für Quellenart, Stufe und Warnung.

## Stand nach Runde 6 (Funktionen)
- Daten: lädt still neu, wenn die App nach über 10 Minuten wieder geöffnet wird; Hinweis, wenn eine Ansicht älter als eine Stunde ist; „Neu“ geht bei einem Ladefehler nicht verloren.
- Tagesbericht: Vor/Zurück, „–“ statt erfundener Nullen, damals gestörte Quellen, Stand aller Behauptungen, verlinkte Behauptungen, Hinweise mit Art, lange Listen aufklappbar, als Text teilen, die letzten sieben auch ohne Netz; alte Meldungen öffnen ihre Detailseite.
- Satellit: älteres Bild immer links, Pfeile zum Blättern, Vorlagen mit echtem Datum (gesperrt, wenn kein Bild innerhalb von 45 Tagen), Erneut versuchen, Nachbarbilder vorgeladen, Hinweise bei nur einem Bild.
- Behauptungen: „Als Beleg übernehmen“ aus ähnlichen Meldungen, „Neuer Beleg“ ohne Stufenwechsel, Sortierung „Länger nicht geprüft“ mit Tage-Hinweis, mehrzeilige Felder.
- Benachrichtigungen: robuste Schalter, Hinweis wenn im Handy ausgeschaltet (mit Weg zu den Einstellungen), Probe-Benachrichtigung, Tagesbericht nur für freigeschaltete Konten.
- Quellen: Übersicht „x von y erreichbar“, gestörte zuerst; Lage zeigt gestörte Quellen.
- Teilen einer Geschichte mit allen Medien; arabische Schlagzeilen werden gruppiert; Filter in Meldungen bleiben gemerkt; Karte-Liste folgt Ebenen und Zeitraum.

## Auftrag Runde 7: deutlich übersichtlicher (11. Oktober 2026, 23 Uhr)
Rückmeldung: „immer noch sehr unübersichtlich“. Ziel: jede Seite in 5 Sekunden erfassbar.
Regeln:
1. Eine Seite, eine Aufgabe. Lage = kurzes Briefing (Wichtig jetzt, wichtigste Geschichten, Messwerte, Weiter zu). Alles andere hat seine eigene Seite.
2. Eine Zeilenform für alle Meldungen und Geschichten: Schlagzeile, darunter eine Zeile mit Farbpunkten der Quellenart, Medium oder „N Medien“, Zeit. Kein Balken, keine Teilen-Knöpfe, keine gemeinsamen Wörter in Listen (die stehen in der Detailseite).
3. Erklärtexte nur einmal (Einführung, Detailseite). In Listen und Köpfen keine Absätze.
4. Höchstens eine Zeile Filter sichtbar; der Rest hinter „Filter“.
5. Gleiche Dinge sehen gleich aus: Zahlen rechts, Pfeil für „führt weiter“, Warnfarbe nur für Warnungen.
Umgesetzt (Runde 7): einheitliche Zeilen (Meldung/Geschichte, Messwert, Vorfall auf See) überall; Lage als Briefing ohne Balken und Absätze; Meldungen ohne Umschalter (Gemerkt oben rechts, Zusammenfassen im Filter); Behauptungen als Zeilen; Karte mit „Ebenen“-Knopf; Detailseiten ohne doppelte Etiketten; Messwert-, Orts- und Berichtsseiten mit denselben Listen; „‹ Lage“ bei direkt geöffneten Seiten; eigene Farbe für „Wahrscheinlich“.

## Runde 8: jedes Detail (Nacht 11./12. Oktober 2026)
Vier unabhängige Detailprüfungen (Lage/Meldungen, Behauptungen, Karte/Orte/Messwerte, Konto/Recht), danach zwei Gegenprüfungen.
Umgesetzt:
- Ehrlichkeit: „–“ statt Null auch auf Ortsseiten, wenn eine Messquelle schweigt; „mind.“ bei Hitzepunkten, wenn nur eine Auswahl geladen ist; Hitzepunkte nach Ort mit demselben Umkreis (40 km) wie die Ortsseiten; „unauffällig“ statt „normal“; leichte Rückgänge heißen nicht mehr „Einbruch“; „Noch keine Meldung in unseren Quellen“ statt „Nicht berichtet von“; englische Originaltexte sind als solche gekennzeichnet.
- Neutralität: Regierungen Eritreas und Äthiopiens sowie Tigray gleich als Konfliktparteien beschrieben; „West-Tigray/Welkait, umstritten“; neutrale Beispiele im Formular; „eine andere Seite bestreitet es“.
- Karte: lesbare Ortsnamen (heller Rand), weniger Überlappungen, Legende der Formen, eigene Farbe für Vorfälle auf See (dunkel: gelb), Ortsseite öffnet die Karte gezoomt auf den Ort.
- Formular: Datum als Tag.Monat.Jahr, Zukunft wird abgelehnt, Rückfrage beim Abbrechen, Eingeständnis nur bei „Bestätigt“.
- Lade-Skelette statt „gibt es nicht“, verständliche Fehlertexte ohne englische Technikmeldungen, Rückgängig beim Merken, Abmelden mit Rückfrage.
- Stufen haben eigene Formen (Haken, Fragezeichen, Pfeile, Kreuz), nicht nur Farben; Schalter in Hausfarben; größere Tippflächen.
- Impressum und Datenschutz auch auf dem Anmeldebildschirm; Datenschutz ergänzt (USA-Übermittlung Supabase, Microsoft, Speicherdauer, Suchverlauf).
Offen (braucht den Inhaber): Apple-Schlüssel für das Widerrufen bei Kontolöschung, Builds für die App-Stores über das Expo-Konto, Google/Apple-Anmeldung einrichten.
- Nachtrag 12. Okt., 1 Uhr: Prüfung mit echten Daten (Quellen, Behauptungen, Meldungen der letzten 72 Std.): alle Behauptungen übersetzt, Meldungen ohne Bezug zur Region werden schon in der Datenbank aussortiert. Radio Erena und Addis Standard sperren Abrufe von Servern (Schutzseite „Just a moment…“); Ausweichadressen (WordPress-Schnittstelle, Google News) ebenfalls gesperrt – nicht umgehen. Im Browser lädt die Ge'ez-Schrift jetzt im Hintergrund (schnellerer Start).
- 12. Okt., Mittag: Ersatzquellen gesucht (30 Adressen von unserem Server aus geprüft). Freigegeben und eingeschaltet: BBC News Tigrinya und BBC News Amharic (Internationale Medien; Amharisch nur zu Eritrea, Tigray, Afar, Rotes Meer). Danach ebenfalls freigegeben und eingeschaltet: Ethiopia Observer (unabhängig, Äthiopien) und Human Rights Concern – Eritrea (Exil, Menschenrechte) als Ersatz für Addis Standard und Radio Erena. Nicht erreichbar oder verwaist: Eritrea Hub, Assenna, Harnnet, Eritrean Press, TesfaNews, Addis Zeybe, Ezega, Madote, Eritrea Focus. Hinweis: Die eingesetzte Fassung der Funktion „ingest“ ist neuer als die Datei im Repository (Version 10 im Dashboard).

## Runde 9: Marke (12. Oktober 2026)
Neues Zeichen „( • )“: zwei Klammern um einen Punkt in einer Linse – jede Angabe steht in ihrem Zusammenhang. Ersetzt den Sonnenuntergang über dem Meer (wirkte wie eine Reise-App). Farben bleiben (Tiefsee, Gischt, Lagune), werden als Markenfarben festgeschrieben (`BRAND` in theme.ts). Keine Landesfarben, keine Karte im Zeichen. Neu erzeugt: App-Symbol (iOS, Android adaptiv und einfarbig), Startbildschirm hell/dunkel, Benachrichtigungssymbol, Favicon, Web-Symbole, Vorschaubild für geteilte Links. In der App: Zeichen auf Anmeldung, Einführung, Fußzeile „Mehr“ und als Marke oben in der Seitenleiste am Computer; Impressum und Datenschutz mit Kopfzeile. Markenhandbuch als Design-System-Seite in Claude.

## Runde 10 (12.10.2026): offene Ausgabe für alle

Entscheidungen des Inhabers: Lesen ohne Anmeldung; alle Meldungen, Geschichten, Behauptungen, Messwerte, Karte und Satellit für alle; Tagesbericht nur Betreiber; Behauptungen öffentlich mit Absicherung.

- Datenbank: `app_public()` (anonym, ohne Tagesberichte), `app_data()` nur Betreiber, beide über `private.payload()`. Hinweise als Benachrichtigung für alle; Push-Kennungen nur im Expo-Format.
- App: keine Anmeldeschranke mehr; Anmeldung nur „für die Redaktion“ (E-Mail und Passwort, unten unter Mehr). Kein Apple/Google-Login, keine Registrierung.
- Reiter: Lage, Meldungen, Behauptungen, Karte. Satellit ist eine eigene Seite (von Lage, Karte, Orten, Seitenleiste). Suchen und Mehr auf jedem Reiter.
- Lage: „Auffällig“ statt „Wichtig jetzt“, „Meistberichtet, 24 Std.“, neu-seit-Zeile mit Meldungen, Behauptungen, See, Erdbeben.
- Geschichte: wer berichtet je Seite; „noch keine Meldung von …“ nur bei Geschichten zu Eritrea, Äthiopien, Tigray, Afar. Link „Auf Deutsch lesen (Google Übersetzer)“.
- Behauptungen: Links zu Methode und Korrekturen, „Korrektur melden“ per E-Mail, neue Seite `/corrections`.
- Quellen: Übersicht „Welche Seiten wir hören“ mit Lücken.
- Technik: ErrorBoundary, Zeitlimit 20 s für Anfragen, Bildspeicher begrenzt, Sicherheits-Header (Rahmen verboten, HSTS), allowBackup aus. Datenschutz angepasst.

## Runde 11 (12.10.2026): neuer Name Semay, öffentlich auffindbar

- „Horn Lens“ war als YouTube-Kanal belegt. Neuer Name nach Prüfung von gut 50 Kandidaten (YouTube, Web, Domains): **Semay (ሰማይ)**, „Himmel“ auf Tigrinya und Amharisch. Wahl des Inhabers.
- Zeichen ( • ) bleibt; Wortmarke „Semay“ mit „ሰማይ“ daneben (brand/src/build.py, Logo.tsx). Vorschaubild: „Derselbe Himmel, alle Seiten.“
- Web: https://semay-lagebild.vercel.app (semay.vercel.app war vergeben). horn-lens.vercel.app leitet dauerhaft weiter.
- Für Suchmaschinen freigeschaltet: kein noindex mehr, robots.txt mit Sitemap, Beschreibung und Vorschau für geteilte Links.
- App-Name, Schema `semay://`, Expo-Slug `semay`. Bundle-ID bleibt `app.beles.hornlens` (unsichtbar; Wechsel erst, falls gewünscht, vor der ersten Einreichung).
- Unverändert intern: GitHub-Repo und Vercel-Projekt heißen weiter horn-lens; Supabase-Organisation „Horn Lens“.

## Runde 12 (12.10.2026): Oberfläche

- Lage beginnt mit dem „Himmelsband“ (immer Tiefsee, auch im hellen Modus): Marke, Datum, Neues seit dem letzten Besuch, kleine Karte der Region (antippen → Karte) und vier Messwert-Kacheln. Die Messwerte-Liste darunter entfällt. Am Computer stehen Karte und Kacheln nebeneinander. Statusleiste dort hell.
- Meldungszeilen: alle Schlagzeilen gleich kräftig, „Neu“ als Wort statt fetter Schrift; neben dem Medium steht die Seite in Kurzform (z. B. „Exil Eritrea“, „Regierung Äthiopien“, bei Geschichten „3 Quellenarten“).
- Auffällig ohne Warnstreifen; Meldungen-Reiter ohne doppelte Suche.
- Technik: `ForceDark` in theme.ts (erzwingt dunkles Schema für einen Bereich), `Screen hero`, `components/SkyBand.tsx`, `TYPE_SHORT` in de.ts.

## Runde 13 (12.10.2026): sofort verständlich

- Wunsch des Inhabers: Überblick ohne Einlesen, keine Sammlung zum Durcharbeiten.
- Lage beginnt mit „Auf einen Blick“ (lib/brief.ts): wenige Sätze nach festen Regeln, ohne KI und Wertung, je mit Quelle. Reihenfolge: Auffälliges, meistberichtetes Thema, Zahl der Meldungen, Rotes Meer, Internet Eritrea, Hitzepunkte (mit Ort der meisten), spürbare Erdbeben, geänderte Behauptungen. Daneben/darunter die Karte. Die Kacheln entfallen, „Auffällig“ steckt jetzt in den Sätzen.
- Schlagzeilen auf Deutsch: neue Spalte `items.title_de`, Funktion `translate` (MyMemory, frei, nur Schlagzeilen, ohne Leserdaten), Zeitplan „hornlens-translate“ um :17 und :47. Freies Kontingent etwa 5.000 Zeichen am Tag; reicht für die täglich neuen Schlagzeilen. In der Meldung steht das Original immer dabei („Maschinell übersetzt“). Schlagzeilen ganz in Großbuchstaben werden lesbar gesetzt.
- „Meistberichtet“ heißt jetzt „Die Themen heute“.

## Runde 14 (12.10.2026): Deutsch, Englisch, Tigrinya; Karte und Satellit

- Sprachen: `src/lib/i18n.ts` (`t("Deutscher Text", {platzhalter})`), Wörterbücher `src/i18n/parts/*.json` (Schlüssel = deutscher Text), Regeln in `app/I18N.md`, Prüfung `node scripts/i18n-check.mjs`. Sprachwahl unter Mehr („Sprache · Language · ቋንቋ“), sonst Gerätesprache. Wechsel zeichnet die App neu.
- Datenbanktexte: Deutsch über Wörterbuch und Regeln (`de()`), Englisch im Original, Tigrinya über einige Regeln (Seevorfälle, Erdbeben, Internet), sonst Englisch. Datumsangaben auf Tigrinya mit eigenen Monats- und Tagesnamen, falls das Gerät keine hat.
- Schlagzeilen: `title_en`, `title_ti` zusätzlich zu `title_de` (Funktion translate, MyMemory). Tigrinya-Maschinenübersetzung ist verständlich, aber holprig; immer als „maschinell übersetzt“ mit Original.
- Benachrichtigungen in der Sprache des Geräts (`push_tokens.lang`, `app_push_lang`).
- Tigrinya-Texte der Oberfläche: von Claude geschrieben, von einer Muttersprachlerin oder einem Muttersprachler gegenzulesen.
- Karte: am Computer groß mit Liste rechts, am Handy Karte oben, Liste darunter. Liste „Was die Karte zeigt“ (Seevorfälle, Erdbeben, wo die Hitzepunkte liegen, Satelliten-Orte), Antippen zoomt hin. Legende auf der Karte.
- Satellit: erst Ort und Zusammenhang, dann der Vergleich; Aufnahmedaten kurz unter dem Bild; am Computer Bild und Auswahl nebeneinander.
