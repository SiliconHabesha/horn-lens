# Horn Lens in den App Store und Play Store bringen

Diese Anleitung ist für dich, Schritt für Schritt. Wo ein Befehl steht, kannst du auch Claude Code auf deinem Mac bitten: „Führe Schritt X aus STORE.md im Ordner app aus.“ Passwörter tippst du immer selbst.

## Was schon fertig ist

- Die App selbst (iPhone, Android und Web aus einem Code), Icon, Startbild, deutsche Texte, dunkler Modus.
- Anmeldung, Benachrichtigungen (Hinweise und Tagesbericht), Offline-Zwischenspeicher.
- Impressum und Datenschutzerklärung als Entwurf (`public/impressum.html`, `public/datenschutz.html`): **die gelben Stellen musst du ausfüllen.**
- Store-Texte (unten in dieser Datei).

## Was du brauchst

| Konto | Kosten | Wofür |
|---|---|---|
| Expo (expo.dev) | kostenlos | baut die App in der Cloud, ohne Mac-Programme |
| Google Play Console | 25 $ einmalig | Android-App im Play Store |
| Apple Developer Program | 99 $ pro Jahr | iPhone-App (TestFlight und App Store) |
| Firebase (console.firebase.google.com) | kostenlos | nur für Benachrichtigungen auf Android |

**Tipp zum Sparen:** Android kannst du ohne Store und ohne Kosten nutzen. Schritt 3 erzeugt eine Installationsdatei (APK), die du direkt aufs Handy lädst. Für das iPhone gibt es keinen kostenlosen Weg; mindestens TestFlight (Teil des 99-$-Programms) ist nötig.

## Schritt 1: Expo-Konto und Projekt

1. Konto anlegen auf https://expo.dev (E-Mail, Passwort).
2. Im Ordner `app`:
   ```
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   `init` trägt eine Projekt-Kennung (`extra.eas.projectId`) in `app.json` ein. Erst damit funktionieren Benachrichtigungen.

## Schritt 2: Benachrichtigungen auf Android (Firebase)

1. Auf https://console.firebase.google.com ein Projekt „Horn Lens“ anlegen (Google Analytics: aus).
2. Android-App hinzufügen, Paketname: `app.beles.hornlens`.
3. Die Datei `google-services.json` herunterladen und in den Ordner `app` legen.
4. In `app.json` unter `android` ergänzen: `"googleServicesFile": "./google-services.json"`.
5. In Firebase: Projekteinstellungen → Dienstkonten → „Neuen privaten Schlüssel generieren“. Diese Datei **nicht** in den Projektordner legen.
6. `npx eas-cli@latest credentials` → Android → production → „Google Service Account“ → „FCM V1“ → die Schlüsseldatei aus Punkt 5 hochladen.

Für das iPhone erledigt EAS die Benachrichtigungs-Schlüssel beim ersten Build selbst (es fragt nach deinem Apple-Login).

## Schritt 3: Android zum Ausprobieren (kostenlos)

```
npx eas-cli@latest build --platform android --profile preview
```
Nach etwa 15 Minuten gibt es einen Link. Auf dem Android-Handy öffnen, APK installieren (einmal „Installation aus unbekannten Quellen“ erlauben).

## Schritt 4: iPhone über TestFlight (nur für dich, ohne App-Prüfung)

1. Apple Developer Program beitreten (developer.apple.com, 99 $).
2. ```
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios
   ```
3. In App Store Connect → TestFlight dich selbst als internen Tester eintragen. Die App kommt über die TestFlight-App aufs iPhone. Interne Tests brauchen keine App-Prüfung.

## Schritt 5: Öffentlich in die Stores (wenn du so weit bist)

Vorher erledigen:
- Impressum und Datenschutz ausfüllen und online stellen (sie liegen mit der Web-Fassung unter `/impressum.html` und `/datenschutz.html`).
- In `app/src/app/_layout.tsx` entscheiden, ob die Web-Fassung privat bleibt (`WEB_PRIVATE`). Die Handy-App zeigt ohne Anmeldung ohnehin die offene Ausgabe.
- In Supabase → Authentication → „Allow new users to sign up“ ausschalten, sobald dein eigenes Konto angelegt ist. Dann kann sich niemand sonst registrieren.

Dann:
```
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform android
npx eas-cli@latest submit --platform ios
```
Für die Play-Einreichung braucht EAS einmal einen Google-Service-Account-Schlüssel der Play Console (EAS führt dich durch).

### Angaben für die Prüfung (App Review / Play Console)

**Hinweis an Apple (Review Notes), auf Englisch:**
> Horn Lens is a free, ad-free situation monitor for the Horn of Africa. Without signing in, the app shows its public edition: measured signals (NASA FIRMS heat detections, USGS earthquakes, UKMTO maritime incidents), Sentinel-2 satellite images with before/after comparison, and Red Sea shipping headlines that link to the original publishers. The sign-in is only for the app's operator to curate content; the app does not offer account registration. No account is required to review the app.

**Datenschutz-Angaben (App Store „App-Datenschutz“ / Play „Datensicherheit“):**
- Kein Tracking, keine Werbung, keine Analyse.
- Erhoben: E-Mail-Adresse (nur Betreiber-Konto, App-Funktion, nicht verknüpft mit Tracking); Geräte-Kennung für Benachrichtigungen (App-Funktion).
- Play Console: News-App-Erklärung ausfüllen (Herausgeber und Kontakt wie im Impressum).

**Altersfreigabe:** Fragebogen ehrlich ausfüllen; die App enthält Nachrichten zu bewaffneten Konflikten (Text, keine Bilder von Gewalt).

## Store-Texte

**Name:** Horn Lens
**Untertitel (iOS, max. 30 Zeichen):** Lagebild Eritrea & Rotes Meer
**Kurzbeschreibung (Play, max. 80 Zeichen):** Messwerte, Satellitenbilder und Meldungen zu Eritrea und dem Roten Meer.
**Kategorie:** Nachrichten
**Schlüsselwörter (iOS):** Eritrea,Rotes Meer,Horn von Afrika,Äthiopien,Satellit,Lagebild,Nachrichten,Tigray,Afar

**Beschreibung:**
> Horn Lens zeigt die Lage am Horn von Afrika, mit Eritrea an erster Stelle: ruhig, nachprüfbar und ohne Lärm.
>
> • Messwerte statt Gerüchte: Hitzepunkte von NASA-Satelliten, Erdbeben (USGS) und Vorfälle auf See (UKMTO). Wo eine Quelle nicht antwortet, steht „keine Daten“, nie eine erfundene Zahl.
> • Satellitenbilder mit Aufnahmedatum: Häfen, Flugplätze und Grenzübergänge, Vorher und Nachher mit dem Finger vergleichen.
> • Meldungen mit Herkunft: Jede Schlagzeile zeigt, wer berichtet und welche Art Quelle das ist, mit Link zum Original.
> • Karte zum Antippen: Was ist das, wann wurde es gemessen, woher stammt es?
> • Benachrichtigungen bei neuen Vorfällen auf See und starken Erdbeben.
>
> Keine Werbung, kein Tracking, kein Konto nötig. Powered by BELES.

**Screenshots:** Die Bildschirmfotos aus `tests/app_test.py` zeigen die Testdaten. Für den Store besser echte Bildschirmfotos vom eigenen Handy (Lage, Karte, Satellit, Meldungen), Größe 6,9 Zoll (iPhone) bzw. Telefon (Play).
