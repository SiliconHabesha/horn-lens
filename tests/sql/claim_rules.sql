-- Prüft die Regeln für Behauptungen direkt in der Datenbank, ohne etwas zu speichern:
-- private.claim_check (Stufen, Belege, unabhängige Websites) und den Zugriffsschutz der Schreibfunktionen.
-- Die Hilfsfunktion liegt in pg_temp und verschwindet mit der Verbindung.
-- Aufruf: im SQL-Editor von Supabase ausführen. Ergebnis: eine Zeile je Fall; ok muss überall true sein.
create or replace function pg_temp.try(p jsonb) returns text language plpgsql as $$
begin perform private.claim_check(p); return null; exception when others then return sqlerrm; end $$;
create or replace function pg_temp.try_add(p jsonb) returns text language plpgsql as $$
begin perform public.app_claim_add(p); return 'saved?!'; exception when others then return sqlerrm; end $$;

with cases(name, p, expect) as (values
  ('neue Stufe ungeprüft mit Notiz', '{"status":"unverified","note":"neu gemeldet","sources":[]}'::jsonb, null),
  ('alte Bezeichnung wird umgedeutet', '{"status":"likely","note":"alte App","sources":[{"url":"https://a.org/1"}]}', null),
  ('unbekannte Stufe', '{"status":"maybe","note":"xxx","sources":[]}', 'unknown status'),
  ('Notiz fehlt', '{"status":"unverified","note":"","sources":[]}', 'a note is required'),
  ('gestützt: zwei Links, aber dieselbe Website (Abhängigkeit)', '{"status":"supported","note":"zwei Links","sources":[{"url":"https://www.reuters.com/a"},{"url":"https://reuters.com/b"}]}', 'supported needs two'),
  ('gestützt: zwei verschiedene Websites', '{"status":"supported","note":"zwei Links","sources":[{"url":"https://reuters.com/a"},{"url":"https://apnews.com/b"}]}', null),
  ('gestützt durch Eingeständnis mit Link', '{"status":"supported","note":"eingeräumt","admission":true,"sources":[{"url":"https://shabait.com/x"}]}', null),
  ('Eingeständnis ohne Link', '{"status":"supported","note":"eingeräumt","admission":true,"sources":[]}', 'an admission needs a link'),
  ('widerlegt ohne Beleg', '{"status":"refuted","note":"stimmt nicht","sources":[]}', 'refuted needs at least one source'),
  ('widerlegt bleibt, Nachtrag ohne Link', '{"status":"refuted","note":"Nachtrag","sources":[],"keep_sources":true}', null),
  ('Link ohne Website', '{"status":"partly","note":"x y z","sources":[{"url":"reuters"}]}', 'source links must start'),
  ('unbekannte Richtung des Belegs', '{"status":"partly","note":"x y z","direction":"maybe","sources":[]}', 'unknown evidence direction')
)
select name, coalesce(pg_temp.try(p), '–') as result,
  case when expect is null then pg_temp.try(p) is null else coalesce(pg_temp.try(p), '') like expect || '%' end as ok
from cases
union all
-- Zugriffsschutz: ohne Betreiber-Anmeldung lehnt die Datenbank Schreiben ab
select 'Zugriff: Anlegen ohne Anmeldung', pg_temp.try_add('{"statement":"x","claimant":"y","region":"eritrea","status":"unverified","note":"abc","sources":[{"url":"https://a.org"}]}'),
  pg_temp.try_add('{"statement":"x","claimant":"y","region":"eritrea","status":"unverified","note":"abc","sources":[{"url":"https://a.org"}]}') = 'not allowed';
