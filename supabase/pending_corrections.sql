-- Horn Lens – Korrekturen aus der Datenprüfung vom 9./10. Oktober 2026
-- ERLEDIGT: am 11. Oktober im Supabase-Dashboard ausgeführt und geprüft. Nicht noch einmal nötig.
-- Die Berichtigungen bei den Behauptungen sind bereits eingespielt (über die Funktionen der Seite).
-- Diese Datei enthält den Rest. Die Supabase-Verbindung in Claude bricht solche Änderungen ab,
-- deshalb einmal im Supabase-Dashboard ausführen:
--   https://supabase.com/dashboard/project/mkcaioabbzccawjmtndw/sql/new
--   gesamten Inhalt dieser Datei einfügen, "Run" klicken, eine Warnung zu "destructive operation" bestätigen.
-- Danach ordnet die stündliche Abholung (Funktion ingest) die Meldungen der letzten 72 Stunden automatisch neu ein.

-- 1) Ortsbeschreibungen: neutrale Texte für die öffentliche Fassung, zwei Korrekturen intern
update public.sat_places p set why_public = v.t from (values
  ('assab-airfield', 'Airport near Assab on Eritrea''s southern Red Sea coast, with a large airfield and pier complex next to it.'),
  ('assab-port', 'Eritrea''s southern port, near the Bab el-Mandeb strait.'),
  ('massawa', 'Eritrea''s main port on the Red Sea.'),
  ('asmara', 'Eritrea''s capital and its international airport.'),
  ('sawa', 'Eritrea''s national service training centre in the west of the country.'),
  ('zalambessa', 'Main road crossing between Serha (Eritrea) and Zalambessa (Ethiopia).'),
  ('tsorona', 'Border area south of Asmara.'),
  ('badme', 'Village on the Eritrea–Ethiopia border.'),
  ('omhajer', 'Eritrean border town on the Setit river, opposite Humera.'),
  ('tesseney', 'Town in western Eritrea near the Sudan border.'),
  ('humera', 'Town in western Tigray at the Eritrean and Sudanese borders.'),
  ('adigrat', 'Town in Tigray about 25 km from the Eritrean border.'),
  ('mekelle', 'Capital of the Tigray region of Ethiopia.'),
  ('bure', 'Ethiopian border town on the road to Assab.'),
  ('perim', 'Yemeni island in the Bab el-Mandeb strait, the southern entrance to the Red Sea.')
) v(id, t) where p.id = v.id;
update public.sat_places set why = 'Tigray town about 25 km from the Eritrean border. In October 2026 eyewitnesses told Reuters that Eritrean soldiers drove through it; Eritrea rejects such reports. See the claims list for the current status.' where id = 'adigrat';
update public.sat_places set why = 'Yemeni island in the Bab el-Mandeb strait, the southern entrance to the Red Sea, between Yemen and Djibouti and about 30 km from Eritrea''s southern tip.' where id = 'perim';

-- 2) Quellenbeschreibungen: gleiche Maßstäbe für alle Seiten
update public.sources s set stance_note = v.t from (values
  ('shabait', 'Website of Eritrea''s Ministry of Information. States the government''s position; not independent confirmation.'),
  ('awate', 'Eritrean diaspora news and opinion site, critical of the government. Has sources inside the country; not independent confirmation on its own.'),
  ('asmarino', 'Eritrean diaspora news site, critical of the government. No new articles since 2021, so switched off.'),
  ('erena', 'Eritrean exile radio based in Paris, critical of the government, with contacts inside the country. Not independent confirmation on its own.'),
  ('tghat', 'Tigrayan news and opinion site. Treat its conflict reporting like a party statement.'),
  ('aljazeera', 'Qatar-based, state-funded international broadcaster; often carries Reuters and AP reporting.'),
  ('dw', 'Germany''s publicly funded international broadcaster.'),
  ('france24', 'France''s state-owned international broadcaster; often carries AFP reporting.')
) v(id, t) where s.id = v.id;

-- 3) Guardian-Themenseiten: Meldungen nur nach Inhalt einordnen (bisher wurde jede automatisch Eritrea bzw. Äthiopien)
update public.sources set default_regions = '{}', region_filter = true where id in ('guardian_er', 'guardian_et');

-- 4) Asmarino: die Seite hat seit 2021 nichts Neues veröffentlicht
update public.sources set active = false where id = 'asmarino';

-- 5) Sprachangaben und Tracking-Zusätze in Links
update public.items set language = case when title ~ '[ሀ-፿]' then 'ti' else 'en' end where source_id = 'shabait' and language is null;
update public.items set language = 'en' where id = 189;
update public.items i set url = c.clean
from (select id, regexp_replace(regexp_replace(url, '([?&])(traffic_source|maca)=[^&]*&?', '\1'), '[?&]$', '') as clean
      from public.items where url ~ '[?&](traffic_source|maca)=') c
where i.id = c.id and not exists (select 1 from public.items j where j.url = c.clean);

-- 6) Bezeichnung einer Quelle im Verlauf von Behauptung 1 (gleicher Link, nur der Name)
update public.claim_events set extra_sources = jsonb_set(extra_sources, '{0,title}', '"AP via MyMotherLode.com, 9 Oct 2026"')
where id = 11 and extra_sources->0->>'url' like 'https://mymotherlode.com/%';

-- 7) Alte Funktionen ohne Prüfung der Bestätigungs-Regel (seit 10. Oktober gesperrt)
drop function if exists public.claim_add(text, text, text, text, text, boolean, date, text, text, text);
drop function if exists public.claim_update(integer, text, text, text, text);

-- Kontrolle: sollte 15 / false / 0 / 0 zeigen
select (select count(*) from public.sat_places where why_public is not null) as orte_mit_text,
       (select active from public.sources where id = 'asmarino') as asmarino_aktiv,
       (select count(*) from public.items where url ~ '[?&](traffic_source|maca)=') as links_mit_zusatz,
       (select count(*) from pg_proc where proname in ('claim_add', 'claim_update') and pronamespace = 'public'::regnamespace) as alte_funktionen;
