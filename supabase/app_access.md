# Datenbank-Teile für die App (eingespielt am 11. Oktober 2026)

Den genauen SQL-Wortlaut zeigt Supabase unter **Database → Migrations** (Namen unten). `app_de_texts.sql` in diesem Ordner wird von `app/scripts/sync.mjs` erzeugt.

| Migration | Was sie macht |
|---|---|
| `app_owner_access`, `app_owner_confirmed_email` | `private.is_owner()`: wahr nur für ein angemeldetes Konto mit **bestätigter** E-Mail aus der Liste (derzeit eine Adresse). `app_data()`, `app_report(datum)`, `app_claim_update/add/edit(p)`, `app_is_owner()`: prüfen das zuerst, sonst Fehler „not allowed“. Nur für angemeldete Konten aufrufbar, nie für anon. |
| `app_de_texts` | `private.de_texts()`: deutsche Fassungen der privaten Texte (Behauptungen, interne Ortstexte). `app_texts()` gibt sie nur dem Betreiber. So stehen sie nicht im öffentlichen App-Code. |
| `push_notifications` | Tabellen `private.push_tokens` und `private.push_sent`. `app_push_register(token, arten)` / `app_push_unregister(token)` für jedes Gerät. `push_next()` / `push_drop()` nur für die Funktion `notify` (service_role). |
| `harden_default_privileges` | Neue Tabellen und Funktionen im Schema `public` sind nicht mehr automatisch für anon/authenticated freigegeben. **Wichtig für später:** Jede neue Funktion braucht ein ausdrückliches `grant execute`, auch für `service_role`. |

**Weitere Person mit vollem Zugang:** in `private.is_owner()` die E-Mail-Adresse zur Liste hinzufügen (per Migration).

**Benachrichtigungen:** Edge Function `notify` (Zeitplan `hornlens-notify`, um :12 und :42 jeder Stunde). Verschickt neue Hinweise der letzten 3 Stunden und morgens den Tagesbericht über den Expo-Push-Dienst.
