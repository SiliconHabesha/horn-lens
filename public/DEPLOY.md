# Öffentliche Fassung online stellen

Der Ordner `public/` ist eine fertige, eigenständige Website. Sie braucht keinen Server mit Programmen, nur einen Ort für Dateien.

## Was die öffentliche Fassung zeigt (und was nicht)

**Sie zeigt:**
- Hitzepunkte (NASA FIRMS) in Eritrea, Tigray, Afar und den Grenzgebieten
- Erdbeben (USGS)
- Vorfälle auf See (UKMTO)
- Satellitenbilder mit Aufnahmedatum und Vergleich
- Meldungen, die **nur** das Rote Meer betreffen

**Sie zeigt nicht:**
- Kriegsmeldungen
- Behauptungen und Tagesberichte
- Internet-Ausfälle: Dafür steht die Erlaubnis von IODA noch aus, bis dahin gibt es nur einen Link zu IODA.

Das ist zweifach abgesichert:
- **In der Datenbank:** Mit dem öffentlichen Lese-Schlüssel kommt man an nichts anderes heran. Schreiben kann man mit diesem Schlüssel gar nicht.
- **In der Seite:** Sie filtert zusätzlich selbst.

Die Seite lädt keine Schriften von Google. Das ist wichtig in Deutschland: Das LG München I hat 2022 entschieden (3 O 17493/20), dass das Einbinden von Google Fonts ohne Zustimmung unzulässig ist. Die Schriften liegen im Ordner `fonts/`.

## Vorher erledigen

1. **Impressum ausfüllen** (`impressum.html`). Pflicht für eine geschäftsmäßige Website in Deutschland (§ 5 DDG, früher TMG). Hinein gehören:
   - Name und Anschrift
   - eine schnelle Kontaktmöglichkeit (E-Mail)
   - bei einer Firma: Rechtsform, Vertretungsberechtigte, Registereintrag und USt-IdNr.
   - als Verantwortlicher für Inhalte nach § 18 Abs. 2 MStV: Name und Anschrift
2. **Datenschutzerklärung ausfüllen** (`datenschutz.html`). Inhaltlich wichtig:
   - Wer verantwortlich ist (wie im Impressum).
   - **Hosting:** der Anbieter, bei dem die Seite liegt (zum Beispiel Cloudflare). Er verarbeitet beim Aufruf die IP-Adresse.
   - **Datenabruf:** Der Browser der Besucher holt die Daten direkt bei Supabase (Supabase Inc., Rechenzentrum Frankfurt). Dabei wird die IP-Adresse an Supabase übertragen.
   - Was es nicht gibt: Es gibt keine Cookies, kein Tracking, keine Analyse und keine eingebetteten Dienste von Google.
   - Die Rechte der Besucher (Auskunft, Löschung, Beschwerde bei der Aufsichtsbehörde).

   Am einfachsten mit einem Generator für Datenschutzerklärungen. Lass das am besten einmal prüfen. Ich bin kein Anwalt.
3. Optional: **eigene Domain** kaufen.

## Hochladen mit Cloudflare Pages (kostenlos)

1. Konto bei Cloudflare anlegen (dash.cloudflare.com).
2. **Workers & Pages** → **Create** → **Pages** → **Upload assets** (Direkt hochladen).
3. Einen Projektnamen wählen, zum Beispiel `horn-lens`. Die Seite ist dann unter `horn-lens.pages.dev` erreichbar.
4. Den **Inhalt** des Ordners `public/` hochladen (`index.html`, `impressum.html`, `datenschutz.html`, `robots.txt`, Ordner `fonts`). Die Datei `DEPLOY.md` muss nicht mit.
5. **Deploy** klicken.
6. Später: unter **Custom domains** die eigene Domain verbinden.

Jede andere Ablage für statische Dateien geht genauso, zum Beispiel ein normaler Webspace.

## Nach Änderungen

1. `cd build && python3 build.py` erzeugt `public/` neu. Ausgefüllte Seiten für Impressum und Datenschutz bleiben dabei erhalten; nur die Platzhalter werden neu geschrieben.
2. Den Ordner erneut hochladen.

## Zum Schlüssel in der Seite

In `index.html` steht der öffentliche Supabase-Schlüssel (`sb_publishable_…`). Er ist dafür gedacht, öffentlich zu sein. Er darf nur lesen, und nur:
- reine Rotes-Meer-Meldungen, ohne Textauszug
- Messsignale ohne Internet-Ausfälle
- Satelliten-Orte mit neutralem Text, und die Bilder
- Quellenliste
- die öffentlichen Eilmeldungen (Seevorfälle, starke Erdbeben)
