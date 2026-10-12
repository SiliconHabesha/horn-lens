# Semay – Sicherheit und Datenschutz (Stand 13. Oktober 2026)

Ehrlich festgehalten: was geschützt ist, was offen ist und warum.

## Wer was darf
- **Lesen: alle, ohne Anmeldung.** Das hat der Inhaber am 12.10.2026 so entschieden. Die Web-Fassung ist öffentlich und für Suchmaschinen freigegeben. Gelesen wird nur über `app_public()`: Meldungen, Behauptungen, Messwerte, Satellitenbilder und Zustand der Quellen.
- **Schreiben und Tagesbericht: nur der Betreiber.** `app_data`, `app_report` und `app_claim_*` prüfen in der Datenbank `private.is_owner()`. Eine versteckte Adresse ist kein Schutz und wird auch nicht als solcher benutzt. Der Test `tests/sql/claim_rules.sql` prüft, dass Anlegen ohne Anmeldung mit „not allowed“ abgelehnt wird.
- **Abholer und Zeitpläne** rufen die Edge Functions nur mit einem internen Schlüssel auf (`x-ingest-key`). Dieser liegt in `private.settings` und ist von außen nicht lesbar.
- **Keine geheimen Schlüssel in der App.** In der App steht nur die öffentliche Supabase-Adresse mit dem öffentlichen Lese-Schlüssel (siehe `.env.example`).

## Ergebnisse der Supabase-Sicherheitsprüfung (Advisor, 13.10.2026)
- **„SECURITY DEFINER von außen aufrufbar“:** gewollt. Diese Funktionen sind die einzige Schnittstelle; jede prüft die Berechtigung selbst.
- **`ingest_runs` ohne Richtlinie:** gewollt. Die Tabelle ist von außen gesperrt und nur über `app_public()` zusammengefasst lesbar.
- **pg_net im Schema public:** Standard-Einrichtung von Supabase, kein Handlungsbedarf.
- **Offen beim Inhaber:**
  - Schutz vor geleakten Passwörtern einschalten (Supabase → Authentication → Passwords);
  - neue Anmeldungen abschalten;
  - Zwei-Faktor-Anmeldung für das Supabase- und das Vercel-Konto.

## Fremde Inhalte
- Schlagzeilen und Textauszüge aus Feeds gelten als nicht vertrauenswürdig. Die App stellt sie nur dar:
  - HTML wird beim Abholen entfernt.
  - Die App zeigt alles als reinen Text, es wird kein HTML eingefügt.
  - Links öffnen extern.
- **Keine KI verarbeitet Feed-Inhalte.** Damit gibt es keine Prompt-Injection-Fläche:
  - „Auf einen Blick“ und die Ereignisarten entstehen nach festen Regeln.
  - Übersetzt wird maschinell über MyMemory; dabei geht nur der Titel als Text an den Dienst, und die Antwort wird nur angezeigt.
- Feed-Inhalte können keine Aktionen auslösen. Gespeichert werden nur Titel, Link, Zeit und Regionen.

## Webseite (Vercel)
- Sicherheits-Header:
  - `X-Frame-Options: DENY` und CSP `frame-ancestors 'none'` (kein Einbetten);
  - HSTS;
  - `Referrer-Policy`.
- Es gibt keine Konten für Leser und keine Cookies zur Verfolgung.
- Datenschutzerklärung und Impressum: `app/public/datenschutz.html`, `impressum.html`.

## Bekannte Lücken
- Die Lese-Ausgabe ist absichtlich öffentlich. Wer eine rein private App möchte (wie im Master-Prompt), müsste `app_public` für `anon` sperren und die Website hinter eine Anmeldung legen.
- Datenverarbeitungsverträge mit Vercel, Expo und Supabase sowie eine rechtliche Prüfung stehen noch aus. Das ist Aufgabe des Inhabers.
- Push-Tokens (nur Handy-App) werden ohne Konto gespeichert. Sie lassen sich in der App jederzeit abmelden.
