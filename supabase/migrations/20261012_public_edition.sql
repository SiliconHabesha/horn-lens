-- Horn Lens, 12.10.2026: offene Ausgabe für alle (Entscheidung des Inhabers).
-- Alle lesen ohne Konto: Meldungen, Geschichten, Behauptungen, Messwerte, Karte, Satellit.
-- Nur der Betreiber: Tagesbericht und alle Schreibfunktionen.
-- Der Inhalt von app_data steckt jetzt in private.payload(); app_data und app_public rufen es auf.

create or replace function private.payload(p_reports boolean)
returns json language plpgsql stable security definer set search_path = '' as $$
declare r json;
begin
  select json_build_object(
  'now', now(),
  'sources', (select coalesce(json_agg(s order by s.name), '[]'::json) from (
     select s0.id, s0.name, s0.kind, s0.source_type, s0.homepage, s0.stance_note, s0.last_ok_at, s0.last_fetch_at, s0.last_error, s0.last_item_count,
       (select max(coalesce(i.published_at, i.fetched_at)) from public.items i where i.source_id = s0.id and cardinality(i.regions) > 0) as newest_item_at
     from public.sources s0 where s0.active) s),
  'reports', case when p_reports then (select coalesce(json_agg(r0 order by r0.report_date desc), '[]'::json) from (
     select report_date, generated_at, summary is not null as has_summary from public.reports order by report_date desc limit 60) r0)
     else '[]'::json end,
  'items', (select coalesce(json_agg(i order by coalesce(i.published_at, i.fetched_at) desc), '[]'::json) from (
     select it.id, it.title, it.url, it.language, it.regions, it.origin_domain, it.published_at, it.fetched_at,
            s.id as source_id, s.name as source_name, s.source_type
     from public.items it join public.sources s on s.id = it.source_id
     where coalesce(it.published_at, it.fetched_at) > now() - interval '72 hours' and cardinality(it.regions) > 0) i),
  'signals', json_build_object(
    'quakes', (select coalesce(json_agg(json_build_object('t', occurred_at, 'lat', lat, 'lon', lon, 'title', title,
                'mag', (detail->>'magnitude')::numeric, 'url', url) order by occurred_at desc), '[]'::json)
              from public.signals where kind = 'quake' and occurred_at > now() - interval '7 days'),
    'maritime', (select coalesce(json_agg(json_build_object('t', occurred_at, 'lat', lat, 'lon', lon, 'title', title,
                'url', url) order by occurred_at desc), '[]'::json)
              from public.signals where kind = 'maritime' and occurred_at > now() - interval '30 days'),
    'outages', (select coalesce(json_agg(json_build_object('t', occurred_at, 'title', title,
                'country', detail->>'country', 'level', detail->>'level', 'url', url) order by occurred_at desc), '[]'::json)
              from public.signals where kind = 'outage' and occurred_at > now() - interval '48 hours'),
    'fires_total', (select count(*) from public.signals where kind = 'fire' and occurred_at > now() - interval '24 hours' and public.in_fire_box(lat, lon)),
    'fires', (select coalesce(json_agg(json_build_array(round(lat::numeric, 3), round(lon::numeric, 3),
        extract(epoch from occurred_at)::bigint, detail->>'satellite', detail->'frp_mw')), '[]'::json)
      from (select lat, lon, occurred_at, detail from public.signals where kind = 'fire' and occurred_at > now() - interval '24 hours'
            and public.in_fire_box(lat, lon) order by (detail->>'frp_mw')::numeric desc nulls last limit 1500) f)),
  'alerts', public.current_alerts(),
  'claims', (select coalesce(json_agg(c order by (c.region = 'eritrea') desc, c.updated_at desc), '[]'::json) from (
     select cl.id, cl.statement, cl.claimant, cl.disputed_by, cl.region, cl.status, cl.party_claim, cl.first_reported, cl.updated_at,
       (select coalesce(json_agg(json_build_object('at', e.at, 'status', e.status, 'note', e.note, 'source_title', e.source_title,
          'source_url', e.source_url, 'extra', e.extra_sources, 'admission', e.admission) order by e.at desc, e.id desc), '[]'::json)
        from public.claim_events e where e.claim_id = cl.id) as events
     from public.claims cl where cl.active) c),
  'sat', (select coalesce(json_agg(json_build_object('id', p.id, 'name', p.name, 'country', p.country, 'why', p.why,
      'lat', p.lat, 'lon', p.lon, 'half_km', p.half_km, 'images', (select coalesce(json_agg(json_build_array(i.id,
      extract(epoch from i.captured_at)::bigint, i.cloud_pct, i.item_id, i.bytes) order by i.captured_at desc), '[]'::json)
      from public.sat_images i where i.place_id = p.id)) order by p.sort), '[]'::json)
      from public.sat_places p where p.active)
  ) into r;
  return r;
end $$;
revoke all on function private.payload(boolean) from public, anon, authenticated;

create or replace function public.app_data()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_owner() then raise exception 'not allowed'; end if;
  return private.payload(true);
end $$;

create or replace function public.app_public()
returns json language sql stable security definer set search_path = '' as $$ select private.payload(false); $$;
revoke all on function public.app_public() from public;
grant execute on function public.app_public() to anon, authenticated;

-- Deutsche Texte für alle (die Inhalte sind jetzt öffentlich)
create or replace function public.app_texts()
returns jsonb language sql stable security definer set search_path = '' as $$ select private.de_texts(); $$;
grant execute on function public.app_texts() to anon, authenticated;
