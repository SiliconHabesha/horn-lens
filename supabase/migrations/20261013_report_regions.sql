-- Semay, 13.10.2026: Tagesbericht mit den neuen Regionen (Stufen wie gespeichert; die App bildet alte Schlüssel ab).
CREATE OR REPLACE FUNCTION public.build_daily_report(p_date date DEFAULT ((now() AT TIME ZONE 'Europe/Berlin'::text))::date)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  w_end   timestamptz := now();
  w_start timestamptz := now() - interval '24 hours';
  regs    text[] := array['eritrea','tigray','afar','amhara','oromia','ethiopia','red_sea','djibouti','somalia','sudan','horn'];
  result  jsonb;
  rid     bigint;
begin
  select jsonb_build_object(
    'regions', (
      select jsonb_agg(jsonb_build_object(
        'region', r,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'id', i.id, 'title', i.title, 'url', i.url,
                   'source_id', s.id, 'source_name', s.name, 'source_type', s.source_type,
                   'origin_domain', i.origin_domain, 'language', i.language,
                   'published_at', i.published_at, 'fetched_at', i.fetched_at)
                 order by coalesce(i.published_at, i.fetched_at) desc)
          from items i join sources s on s.id = i.source_id
          where r = any(i.regions)
            and (coalesce(i.published_at, i.fetched_at) between w_start and w_end
                 or (i.fetched_at between w_start and w_end and i.published_at > w_start - interval '48 hours'))
        ), '[]'::jsonb)
      ) order by array_position(regs, r))
      from unnest(regs) r
    ),
    'sources', (
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'source_type', source_type,
        'last_ok_at', last_ok_at, 'last_fetch_at', last_fetch_at, 'last_error', last_error)
        order by name)
      from sources where active
    ),
    'claims', (
      select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'statement', c.statement, 'status', c.status,
        'region', c.region, 'party_claim', c.party_claim) order by (c.region = 'eritrea') desc, c.updated_at desc), '[]'::jsonb)
      from claims c where c.active
    ),
    'changes', (
      select coalesce(jsonb_agg(jsonb_build_object('claim_id', e.claim_id, 'statement', c.statement, 'at', e.at,
        'status', e.status, 'note', e.note, 'source_title', e.source_title, 'source_url', e.source_url)
        order by e.at desc), '[]'::jsonb)
      from claim_events e join claims c on c.id = e.claim_id
      where e.at between w_start and w_end
    ),
    'signals', jsonb_build_object(
      'fires_24h', (select count(*) from signals where kind = 'fire' and occurred_at between w_start and w_end and public.in_fire_box(lat, lon)),
      'quakes_7d', (select count(*) from signals where kind = 'quake' and occurred_at between w_end - interval '7 days' and w_end),
      'maritime_30d', (select count(*) from signals where kind = 'maritime' and occurred_at between w_end - interval '30 days' and w_end),
      'outages_48h', (select count(*) from signals where kind = 'outage' and occurred_at between w_end - interval '48 hours' and w_end)
    ),
    'alerts', public.current_alerts()::jsonb
  ) into result;

  insert into reports (report_date, window_start, window_end, payload)
  values (p_date, w_start, w_end, result)
  on conflict (report_date) do update
    set generated_at = now(), window_start = excluded.window_start,
        window_end = excluded.window_end, payload = excluded.payload
  returning id into rid;
  return rid;
end $function$;
