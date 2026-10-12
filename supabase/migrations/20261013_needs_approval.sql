-- Semay, 13.10.2026: Teil der Umstellung, der bestehende Prüfregeln (CHECK) ersetzt und deshalb eine Freigabe braucht.
-- Es werden keine Daten gelöscht. Alte Stufen-Bezeichnungen bleiben in claim_events.legacy_status erhalten.
-- Bis diese Datei eingespielt ist, arbeiten App und Funktionen mit den alten Schlüsseln weiter (private.status_db).
alter table public.claims drop constraint claims_status_check;
alter table public.claim_events drop constraint claim_events_status_check;
alter table public.claims drop constraint claims_region_check;
alter table public.sources drop constraint sources_source_type_check;
update public.claim_events set legacy_status = status where legacy_status is null and status in ('confirmed','likely','unconfirmed','disputed','false');
update public.claim_events set status = private.status_new(status);
update public.claims set status = private.status_new(status);
alter table public.claims add constraint claims_status_check check (status in ('unverified','checking','partly','supported','conflicting','refuted','unverifiable'));
alter table public.claim_events add constraint claim_events_status_check check (status in ('unverified','checking','partly','supported','conflicting','refuted','unverifiable'));
alter table public.claim_events add constraint claim_events_direction_check check (direction is null or direction in ('supports','contradicts','context'));
alter table public.claims add constraint claims_region_check check (region in ('eritrea','tigray','afar','amhara','oromia','red_sea','ethiopia','somalia','djibouti','sudan','horn'));
alter table public.sources add constraint sources_origin_check check (origin is null or origin in ('primary','secondary','index','measurement'));
alter table public.sources add constraint sources_source_type_check check (source_type in ('government_er','government_et','progov_er','progov_et','exile','tigray',
  'international','ethiopian_independent','un_ngo','aggregator','measurement','maritime_authority','somali_media','sudanese_media'));
update public.sources set source_type = 'sudanese_media', active = true where id in ('dabanga', 'sudanwarmonitor');
update public.sources set source_type = 'somali_media', active = true where id in ('somaliguardian', 'horseed', 'somalilandstandard');
