# Semay (ሰማይ)

> Neuer Name seit 12. Oktober 2026 (vorher „Horn Lens“, der Name war schon von einem YouTube-Kanal belegt). Semay heißt auf Tigrinya und Amharisch „Himmel“. Web: https://semay-lagebild.vercel.app

Ein persönliches Lagebild zum Horn von Afrika, mit Eritrea an erster Stelle. Powered by BELES.

Die Seite sammelt jede Stunde Meldungen, Messwerte und Satellitenbilder. Bei jeder Meldung steht, **wer** etwas sagt und **wann**. Erfunden wird nichts: Was keine Quelle liefert, zeigt die Seite als „keine Daten“ an.

Stand: 13. Oktober 2026.

**Neu am 13. Oktober 2026:** ganzes Horn von Afrika, Lage für 24 Stunden bis 7 Tage, neue Prüfstufen, Karte mit Genauigkeit und Abspielen, Satellit nebeneinander, Abruf-Protokoll. Was umgesetzt ist und was offen bleibt: [`docs/ABNAHME.md`](docs/ABNAHME.md). Sicherheit: [`docs/SICHERHEIT.md`](docs/SICHERHEIT.md). Umgebungsvariablen: [`.env.example`](.env.example).

**Tests:** `cd app && npm run web:build`, dann `python3 tests/features_test.py` (Ja/Nein-Prüfungen) und `python3 tests/app_test.py` (Bildschirmfotos); `cd tests/unit && npm install && npm test`; `cd tests/ingest && npm install && node prepare.mjs && node run.mjs`; `tests/sql/claim_rules.sql` im SQL-Editor.

---


## 0. Die App (neu, 11. Oktober 2026)

Horn Lens gibt es jetzt als echte App für iPhone und Android, gebaut mit Expo im Ordner `app/`. Aus demselben Code entsteht auch eine Web-Fassung.

- **Bedienung:** Tab-Leiste unten mit Lage, Meldungen, Behauptungen, Karte und Satellit. Unter „Mehr“ (oben rechts in „Lage“) liegen Konto, Benachrichtigungen, Quellen, Methode und Rechtliches.
- **Funktionen:** Ziehen zum Aktualisieren. „Neu seit deinem letzten Besuch“. Suche und Filter bei Meldungen. Teilen-Knopf. Karte mit Ausschnitten und Ebenen. Satelliten-Vergleich per Wischen. Tagesberichte. Ohne Verbindung zeigt die App den letzten Stand. Dunkler Modus.
- **Anmeldung:** mit Apple, Google oder E-Mail. Ohne Anmeldung zeigt die Handy-App die offene Ausgabe: Messwerte, Satellit und Rotes Meer. Voller Zugang nur für die freigeschaltete E-Mail-Adresse, das prüft die Datenbank (siehe `supabase/app_access.md`). Google und Apple musst du einmal einrichten: Anleitung „Horn Lens: Anmeldung mit Google und Apple einrichten“ (Claude-Dokument). Konto löschen: Mehr → Konto löschen (Edge Function `delete-account`).
- **Benachrichtigungen:** Hinweise (Vorfälle auf See, starke Erdbeben, Internet-Einbrüche, viele Meldungen zu Eritrea) und der Tagesbericht. Sie funktionieren erst in der Store-Fassung, siehe `app/STORE.md`.
- **KI-Zusammenfassung:** bleibt kostenlos in Claude (Horn Lens in Claude); die App verlinkt dorthin.
- **Web-Fassung:** https://horn-lens.vercel.app. Sie ist privat: ohne Anmeldung zeigt sie nur den Anmeldebildschirm und wird nicht von Suchmaschinen erfasst. Der Code liegt im privaten GitHub-Projekt `SiliconHabesha/horn-lens`. Jede Änderung dort geht automatisch online; die Bauanleitung steht in `vercel.json` im Hauptordner.
- **Dein Konto:** Lege es einmal in der Web-Fassung unter „Konto anlegen“ an, mit deiner E-Mail-Adresse, für die der Zugang freigeschaltet ist. Dann den Link in der Bestätigungs-E-Mail öffnen. Zeigt der Link danach eine Fehlerseite, ist die Bestätigung trotzdem erledigt. Damit er künftig auf Horn Lens führt, in Supabase → Authentication → URL Configuration die Site URL auf die Web-Adresse setzen.
- **In die Stores:** Schritt für Schritt in `app/STORE.md`, mit Store-Texten und Angaben für die Prüfung.
- **Prüfen:** `cd app && npm run web:build`, danach `python3 tests/app_test.py`

## 1. So schaust du es dir an

**Private Seite:** https://claude.ai/artifact/GaVvLNTjhVbwh5pVPkEQ2p

- Öffne sie in claude.ai, angemeldet mit deinem Konto. Nur du kannst sie öffnen.
- Beim ersten Öffnen fragt claude.ai zweimal:
  - ob die Seite deine **Supabase-Verbindung** nutzen darf. Erlauben, sonst bleibt die Seite leer.
  - ob die Seite **Claude** fragen darf, nämlich für Zusammenfassung und Übersetzung. Das ist freiwillig.
- Die Supabase-Verbindung muss in claude.ai unter Einstellungen → Connectors eingerichtet sein. Sie ist es bereits.

**Aufbau:** Die Seite ist deutsch und in Reiter geteilt: Übersicht (Hinweise, Messwerte, das Wichtigste aus allen Reitern, Eritrea-Meldungen), Meldungen nach Region, Behauptungen, Karte, Satellit, Quellen & Methode. Die Zusammenfassung schreibt Claude auf Deutsch; der Knopf „… ins Deutsche übersetzen“ übersetzt englische, tigrinische und arabische Schlagzeilen.

**Öffentliche Fassung:** liegt fertig im Ordner `public/`, ist aber noch nicht online. Siehe `public/DEPLOY.md`.

## 2. Was automatisch passiert

| Wann | Was |
|---|---|
| jede Stunde um :07 | Nachrichten abholen (30 Nachrichtenquellen, davon 25 aktiv), den Regionen zuordnen und die Meldungen der letzten 72 Stunden nach den aktuellen Regeln neu einordnen |
| jede Stunde um :37 | Messsignale abholen: Hitzepunkte (NASA FIRMS), Erdbeben (USGS), Internet-Ausfälle (IODA), Vorfälle auf See (UKMTO) |
| jede Stunde um :52 | neue wolkenfreie Satellitenbilder für 15 Orte holen (Sentinel-2) |
| täglich 07:15 deutscher Zeit | Tagesbericht der letzten 24 Stunden erstellen |

Alles läuft im Supabase-Projekt **horn-lens**. Es gehört zur Organisation „Horn Lens“, Gratis-Tarif, Rechenzentrum Frankfurt (eu-central-1).

## 3. Die Regeln der Seite

- **Jede Meldung** hat einen Link zum Original, den Herausgeber und die Uhrzeit. Artikel werden nicht kopiert, nur Überschriften.
- **Jede Quelle** ist nach Art gekennzeichnet:
  - Regierung Eritreas
  - Exilmedien
  - internationale Medien
  - UN und NGOs
  - äthiopische unabhängige Medien
  - äthiopische regierungsnahe Medien
  - tigrayische Medien
  - Messwerte
  - Seefahrtsbehörde
- **Behauptungen** haben einen Status:
  - **bestätigt:** zwei unabhängige Quellen auf zwei verschiedenen Websites, oder ein Eingeständnis der betroffenen Seite mit Beleg. Die Datenbank erzwingt das.
  - **wahrscheinlich**
  - **unbestätigt**
  - **umstritten**
  - **falsch**

  Jede Änderung bleibt mit Datum, Begründung und Quellen im Verlauf. Wird ein Wortlaut berichtigt, steht der alte Wortlaut im Verlauf.
  Die bisherigen Behauptungen stehen auf Englisch in der Datenbank; die Seite zeigt sie auf Deutsch (aus `web/src/de_data.json`). Berichtigst du eine Angabe, wird dein deutscher Text gespeichert; was du im Formular nicht änderst, bleibt unverändert.
- **Messwerte** zeigen, dass an einem Ort zu einer Zeit etwas passiert ist, nie wer oder warum. Antwortet eine Messquelle drei Stunden lang nicht, steht dort „Keine Daten“ statt einer Null.
- **Satellitenbilder** zeigen immer Aufnahmezeit (UTC) und Wolkenanteil. Gespeichert wird nur, was höchstens 3 % Wolken hat.
- **Uhrzeiten** sind deutsche Zeit (MEZ/MESZ), Satellitenzeiten UTC.
- **KI** (Zusammenfassung, Übersetzung) läuft nur auf Knopfdruck über dein eigenes Claude-Konto:
  - Jeder Satz muss die Meldungen nennen, auf denen er beruht; Sätze ohne Beleg werden gestrichen.
  - Maschinelle Übersetzungen sind als solche markiert.

## 4. Was wo liegt

```
web/src/app.js          Seitenlogik (eine Datei für private und öffentliche Fassung)
web/src/styles.css      Gestaltung (hell/dunkel)
web/src/shell.html      Grundgerüst
web/src/de_data.json    deutsche Anzeige für Texte, die auf Englisch in der Datenbank stehen
                        ("public": darf auch die öffentliche Fassung zeigen, "private": nur die private Seite)
web/artifact.html       gebaute private Seite (das ist das Claude-Artefakt)
public/                 gebaute öffentliche Fassung mit eigenen Schriften, Impressum, Datenschutz
build/build.py          baut beide Fassungen:  cd build && python3 build.py
build/make-map.mjs      Kartenumrisse (Natural Earth) → map.json
build/make-regions.mjs  Regionengrenzen Äthiopien/Eritrea → regions.json
supabase/schema.sql     die Datenbank, wie sie läuft (Tabellen, Rechte, Regeln, Zeitplan, Quellen, Orte)
supabase/pending_corrections.sql   Korrekturen aus der Datenprüfung (am 11. Oktober eingespielt)
supabase/functions/     die drei Abholer: ingest (Nachrichten), signals (Messwerte), satellite (Bilder)
tests/                  Prüfungen mit Testdaten (siehe Abschnitt 8)
```

## 5. Kosten und Grenzen

Alles läuft kostenlos:

| Dienst | Was es kostet und wo die Grenze liegt |
|---|---|
| Supabase | Gratis-Tarif mit bis zu 500 MB Datenbank. Belegt sind etwa 70 MB, zum größten Teil Satellitenbilder (rund 110 KB je Bild). Bei jetzigem Wachstum reicht das mehrere Jahre. |
| Microsoft Planetary Computer | kostenlos, aber ein Vorschau-Dienst ohne Zusage, dass er immer läuft |
| NASA FIRMS, USGS, UKMTO, IODA | öffentliche Daten, kostenlos |
| Claude | Zusammenfassungen und Übersetzungen gehen über das Konto der Person, die die Seite ansieht |

**Ruhepause:** Supabase legt Gratis-Projekte nach etwa einer Woche ohne Nutzung schlafen. Horn Lens fragt jede Stunde die Datenbank-Schnittstelle ab, das sollte als Nutzung zählen. Falls doch eine Warn-E-Mail kommt: im Supabase-Dashboard das Projekt öffnen und „Restore“ klicken.

**Domain:** noch keine gekauft. Erst nötig, wenn die öffentliche Fassung online geht.

## 6. Quellen

Aktiv, nach Art:

| Art | Quellen |
|---|---|
| Regierung Eritreas | Shabait (Informationsministerium) |
| Eritreische Exilmedien | Awate, Radio Erena (blockt den Abruf mit HTTP 403), Asmarino (seit 2021 keine neuen Beiträge; Abschalten wartet auf Freigabe) |
| International | Al Jazeera, Africanews, France 24, DW, The Guardian (Eritrea, Äthiopien), The New Humanitarian, The EastAfrican, gCaptain, Maritime Executive, Splash247 |
| UN und NGOs | UN News, Human Rights Watch, Amnesty International, International Crisis Group |
| Äthiopisch, unabhängig | Addis Standard (blockt mit HTTP 403), Ethiopia Insight, Wazema, The Reporter |
| Äthiopisch, regierungsnah | Fana |
| Tigrayisch | Tghat (erscheint selten) |
| Messwerte und Seefahrt | NASA FIRMS, USGS, IODA, UKMTO, Copernicus Sentinel-2 |

**Abgeschaltet:**
- GDELT: lehnt Abfragen von Supabase ab.
- Eritrea Focus, Addis Fortune, Capital: bewusst abgeschaltet, können eingeschaltet werden.

**Lücken, die bekannt sind:**
- Für die äthiopische Regierung selbst gibt es keinen funktionierenden Feed (ENA und Press Agency bieten keinen an).
- Für eritreische regierungsnahe Medien wurde ebenfalls kein funktionierender Feed gefunden.
- BBC Tigrinya ist aus rechtlichen Gründen nicht abrufbar.
- ReliefWeb braucht einen eigenen Anwendungsnamen. Den beantragst du (siehe Abschnitt 9).

## 7. Satelliten-Orte (15)

| Gruppe | Orte |
|---|---|
| Eritrea | Flugplatz Assab, Hafen Assab, Hafen Massawa, Asmara mit Flughafen, Ausbildungszentrum Sawa, Om Hajer, Tesseney |
| Grenze | Übergang Zalambessa/Serha, Tsorona, Badme |
| Äthiopien | Humera, Adigrat, Mekelle, Bure (Afar) |
| Rotes Meer | Insel Perim im Bab el-Mandeb |

Je Ort gibt es:
- alle klaren Bilder der letzten 40 Tage;
- je Monat das klarste Bild der letzten 24 Monate;
- für 2018 bis 2023 je ein Oktober-Bild.

Ältere Tagesbilder werden nach 75 Tagen aufgeräumt. Fehlt einem Monat ein Monatsbild, bleibt das klarste Tagesbild als Monatsbild stehen.

## 8. Häufige Handgriffe

- **Seite neu bauen**, nach Änderungen an `web/src`:
  1. Beim ersten Mal: `cd build && npm install`. Das holt Kartenwerkzeuge und Schriften.
  2. `cd build && python3 build.py`
  3. `web/artifact.html` als Artefakt neu veröffentlichen.
- **Prüfen**, ob alles noch geht. Dafür braucht es Python mit Playwright und Pillow sowie Node.
  - `python3 tests/private_page_test.py` prüft die private Seite mit Testdaten.
  - `python3 tests/public_page_test.py` prüft die öffentliche Fassung. Dabei darf nichts zum Krieg oder zu Behauptungen erscheinen.
  - `cd tests/ingest && npm install && node prepare.mjs && node run.mjs` prüft die Zuordnung der Meldungen zu den Regionen.
- **Behauptungen pflegen:** direkt auf der privaten Seite, mit den Knöpfen „Update status“, „Correct details“ und „Add a claim“. Die Regeln prüft die Datenbank.
- **Eine Quelle ab- oder einschalten:** in Supabase in der Tabelle `sources` das Feld `active` ändern.
- **Abholer ändern:** Code in `supabase/functions/...` anpassen, dann im Supabase-Dashboard oder mit dem Supabase-Werkzeug neu ausrollen. Die Abholer prüfen einen internen Schlüssel (Header `x-ingest-key`). Er steht nur in der Datenbank (`private.settings`).
- **Alte Werkzeug-Funktion „probe“:** ist stillgelegt (antwortet nur noch „gone“). Du kannst sie im Supabase-Dashboard unter Edge Functions löschen.

## 9. Offen, entscheidest du

1. **Öffentliche Fassung:** wann sie online geht. Vorher müssen Impressum und Datenschutz ausgefüllt sein (siehe `public/DEPLOY.md`).
2. **IODA:** um Erlaubnis bitten, die Internet-Messwerte öffentlich zu zeigen (ioda-info@cc.gatech.edu). Bis dahin verlinkt die öffentliche Fassung nur auf IODA.
3. **ReliefWeb:** einen kostenlosen Anwendungsnamen beantragen, dann kommen UN-Lageberichte dazu.
4. **Benachrichtigungen:** auf Wunsch eine tägliche Kurzfassung oder eine Eilmeldung aufs Handy, als geplante Aufgabe.

## 10. Lizenzen und Danksagungen (stehen auch auf der Seite)

- **NASA FIRMS:** „We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) …“, mit Link zum LANCE-Hinweis.
- **USGS:** „Credit: U.S. Geological Survey“.
- **UKMTO:** „Contains public sector information licensed under the Open Government Licence v3.0.“
- **Satellitenbilder:** „Contains modified Copernicus Sentinel data [Jahre], processed by Microsoft Planetary Computer.“
- **Kartengrundlage:** Natural Earth (gemeinfrei).
- **Schriften:** Public Sans und Noto Sans Ethiopic (SIL Open Font License). In der öffentlichen Fassung liegen sie auf dem eigenen Server, nicht bei Google.

Horn Lens gehört zu keiner dieser Stellen und wird von keiner unterstützt.
