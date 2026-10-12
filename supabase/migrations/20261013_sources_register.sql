-- Semay, 13.10.2026: Quellenregister ausgefüllt und neue Quellen für Somalia, Somaliland und Sudan.
-- Die Quellen aus Somalia, Somaliland und Sudan bleiben aus, bis 20261013_needs_approval.sql ihre eigene Quellenart
-- (somali_media, sudanese_media) erlaubt und sie einschaltet. Bis dahin steht dort vorläufig „international“.
-- Alle neuen Feeds wurden vorher über die Funktion probe abgerufen (gültiges RSS, Einträge vorhanden).
-- origin: primary = eigene Berichte oder eigene Erklärungen; secondary = fasst überwiegend Berichte anderer zusammen;
-- index = automatische Nachrichtensuche; measurement = Messung von Satelliten oder Sensoren.
-- publisher: nur, was die Quelle selbst über sich sagt (Name und Sitz); nichts geschätzt.

insert into public.sources (id, name, homepage, feed_url, kind, source_type, stance_note, language, default_regions, region_filter, strict, active,
                            publisher, origin, focus, limitations) values
 ('dabanga', 'Radio Dabanga', 'https://www.dabangasudan.org/en', 'https://www.dabangasudan.org/en/feed', 'rss', 'international',
  'Sudanese news station based in the Netherlands, with reporters in Sudan. Not a party to the war; like any single source, not independent confirmation on its own.',
  'en', '{sudan}', false, true, false, 'Radio Dabanga, Amsterdam', 'primary', '{sudan}', null),
 ('sudanwarmonitor', 'Sudan War Monitor', 'https://sudanwarmonitor.com', 'https://sudanwarmonitor.com/feed', 'rss', 'international',
  'Independent news and open-source monitoring of the war in Sudan.',
  'en', '{sudan}', false, true, false, 'Sudan War Monitor', 'primary', '{sudan}', 'Often relies on videos and posts from the warring parties, which it tries to verify.'),
 ('somaliguardian', 'Somali Guardian', 'https://www.somaliguardian.com', 'https://www.somaliguardian.com/feed/', 'rss', 'international',
  'Somali news site based in Mogadishu.',
  'en', '{somalia}', false, true, false, 'Somali Guardian, Mogadishu', 'primary', '{somalia}', null),
 ('horseed', 'Horseed Media', 'https://horseedmedia.net', 'https://www.horseedmedia.net/feed/', 'rss', 'international',
  'Somali news site.',
  'en', '{somalia}', false, true, false, 'Horseed Media', 'primary', '{somalia}', null),
 ('somalilandstandard', 'Somaliland Standard', 'https://www.somalilandstandard.com', 'https://www.somalilandstandard.com/feed/', 'rss', 'international',
  'News site from Somaliland.',
  'en', '{somalia}', false, true, false, 'Somaliland Standard, Hargeisa', 'primary', '{somalia}', null),
 ('theafricareport', 'The Africa Report', 'https://www.theafricareport.com', 'https://www.theafricareport.com/feed/', 'rss', 'international',
  'Pan-African news magazine based in Paris.',
  'en', '{}', true, false, true, 'The Africa Report, Paris', 'primary', '{horn}', 'Its feed covers all of Africa; only items naming our regions are kept.'),
 ('voaafrica', 'Voice of America – Africa', 'https://www.voaafrica.com', 'https://www.voaafrica.com/api/', 'rss', 'international',
  'International broadcaster funded by the US government.',
  'en', '{}', true, false, true, 'Voice of America, Washington', 'primary', '{horn}', 'Its feed covers all of Africa; only items naming our regions are kept.')
on conflict (id) do nothing;

-- Register für die bestehenden Quellen
update public.sources s set publisher = v.publisher, origin = v.origin, focus = v.focus::text[], limitations = v.limitations
from (values
 ('addisfortune', 'Addis Fortune, Addis Ababa', 'primary', '{ethiopia}', null),
 ('addisstandard', 'Addis Standard, Addis Ababa', 'primary', '{ethiopia,tigray,amhara,oromia}', 'Blocks automated requests from our server (HTTP 403), so it cannot be read at the moment.'),
 ('africanews', 'Africanews', 'primary', '{horn}', 'Its feed covers all of Africa; only items naming our regions are kept.'),
 ('aljazeera', 'Al Jazeera Media Network, Doha', 'primary', '{red_sea,sudan,horn}', 'Its feed covers the whole world; only items naming our regions are kept.'),
 ('amnesty', 'Amnesty International, London', 'primary', '{}', 'Publishes research weeks or months after events.'),
 ('asmarino', 'Asmarino Independent', 'primary', '{eritrea}', 'No new articles since 2021.'),
 ('awate', 'Awate.com', 'primary', '{eritrea}', null),
 ('bbc_amharic', 'BBC World Service, London', 'primary', '{ethiopia,amhara,tigray,eritrea}', 'Only items about Eritrea, Tigray, Afar or the Red Sea, or clearly about conflict, are kept.'),
 ('bbc_tigrinya', 'BBC World Service, London', 'primary', '{eritrea,tigray}', null),
 ('capitalethiopia', 'Capital, Addis Ababa', 'primary', '{ethiopia}', null),
 ('crisisgroup', 'International Crisis Group, Brussels', 'primary', '{}', 'Analysis and reports rather than breaking news.'),
 ('dw', 'Deutsche Welle, Bonn', 'primary', '{horn}', 'Its feed covers all of Africa; only items naming our regions are kept.'),
 ('erena', 'Radio Erena, Paris', 'primary', '{eritrea}', 'Its website currently does not deliver a readable feed.'),
 ('eritreafocus', 'Eritrea Focus, London', 'secondary', '{eritrea}', null),
 ('ethiopiainsight', 'Ethiopia Insight', 'primary', '{ethiopia,tigray,amhara,oromia}', null),
 ('ethiopiaobserver', 'Ethiopia Observer', 'primary', '{ethiopia}', 'Only items about our core regions, or clearly about conflict, are kept.'),
 ('fana', 'Fana Media Corporation, Addis Ababa', 'primary', '{ethiopia}', 'Only items about our core regions, or clearly about conflict, are kept.'),
 ('firms', 'NASA, Fire Information for Resource Management System', 'measurement', '{}', 'Detects heat, not its cause. Clouds and smoke can hide fires. Positions are accurate to about 375 m.'),
 ('france24', 'France Médias Monde, Paris', 'primary', '{horn}', 'Its feed covers all of Africa; only items naming our regions are kept.'),
 ('gcaptain', 'gCaptain', 'secondary', '{red_sea}', 'Shipping news worldwide; only items naming our regions are kept.'),
 ('gdelt_eritrea', 'The GDELT Project', 'index', '{eritrea}', 'Refuses requests from our shared server address (HTTP 429), so it is switched off.'),
 ('gdelt_north', 'The GDELT Project', 'index', '{tigray,afar,red_sea}', 'Refuses requests from our shared server address (HTTP 429), so it is switched off.'),
 ('guardian_er', 'Guardian News & Media, London', 'primary', '{eritrea}', null),
 ('guardian_et', 'Guardian News & Media, London', 'primary', '{ethiopia}', null),
 ('hrce', 'Human Rights Concern – Eritrea', 'primary', '{eritrea}', null),
 ('hrw', 'Human Rights Watch, New York', 'primary', '{}', 'Publishes research weeks or months after events.'),
 ('ioda', 'Georgia Tech, Internet Intelligence Lab', 'measurement', '{eritrea,ethiopia,djibouti,somalia,sudan}', 'The signal for Eritrea is weak: short outages can go unnoticed. Says nothing about the cause.'),
 ('maritimeexec', 'The Maritime Executive', 'secondary', '{red_sea}', 'Shipping news worldwide; only items naming our regions are kept.'),
 ('reporter', 'The Reporter, Addis Ababa', 'primary', '{ethiopia}', 'Only items about our core regions, or clearly about conflict, are kept.'),
 ('sentinel2', 'ESA / EU Copernicus, via Microsoft Planetary Computer', 'measurement', '{}', '10 m per pixel. Clouds block the view. A new image every few days, not live.'),
 ('shabait', 'Ministry of Information of Eritrea, Asmara', 'primary', '{eritrea}', null),
 ('splash247', 'Splash247', 'secondary', '{red_sea}', 'Shipping news worldwide; only items naming our regions are kept.'),
 ('tghat', 'Tghat', 'primary', '{tigray}', null),
 ('theeastafrican', 'Nation Media Group, Nairobi', 'primary', '{horn}', null),
 ('tnh', 'The New Humanitarian, Geneva', 'primary', '{}', null),
 ('ukmto', 'UK Maritime Trade Operations, Royal Navy', 'primary', '{red_sea}', 'Positions are approximate. Only incidents reported to UKMTO appear.'),
 ('unnews', 'United Nations, New York', 'primary', '{}', null),
 ('usgs', 'U.S. Geological Survey', 'measurement', '{}', 'Smaller earthquakes in this region are recorded incompletely.'),
 ('wazema', 'Wazema, Addis Ababa', 'primary', '{ethiopia}', 'Only items about our core regions, or clearly about conflict, are kept.')
) as v(id, publisher, origin, focus, limitations)
where s.id = v.id;
