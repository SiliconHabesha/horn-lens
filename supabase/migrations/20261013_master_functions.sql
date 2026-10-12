-- Semay, 13.10.2026: Funktionen zu den Ergänzungen nach dem Master-Prompt.
-- Neue Prüfstufen (Schlüssel): unverified, checking, partly, supported, conflicting, refuted, unverifiable.
-- Alte Schlüssel: confirmed→supported, likely→partly, unconfirmed→unverified, disputed→conflicting, false→refuted.
-- Solange die alten Prüfregeln (CHECK) noch gelten, speichert private.status_db() die alte Entsprechung;
-- Ausgabe an die App: der gespeicherte Schlüssel (alt oder neu); die App bildet alte Schlüssel selbst ab (normStatus),
-- damit auch eine noch nicht aktualisierte App-Fassung die Stufen weiter versteht. So funktioniert die App vor und nach der Umstellung.

create or replace function private.status_new(k text) returns text language sql immutable set search_path = '' as $$
  select case k when 'confirmed' then 'supported' when 'likely' then 'partly' when 'unconfirmed' then 'unverified'
    when 'disputed' then 'conflicting' when 'false' then 'refuted' else k end $$;

create or replace function private.status_db(k text) returns text language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from pg_constraint where conname = 'claims_status_check' and pg_get_constraintdef(oid) like '%supported%') then return k; end if;
  return case k when 'supported' then 'confirmed' when 'partly' then 'likely' when 'unverified' then 'unconfirmed'
    when 'conflicting' then 'disputed' when 'refuted' then 'false'
    else (case when k in ('checking', 'unverifiable') then null else k end) end;
end $$;

create or replace function private.claim_check(p jsonb) returns void language plpgsql set search_path = '' as $$
declare s jsonb; n int := 0; h text; hosts text[] := array[]::text[]; st text := private.status_new(p->>'status');
begin
  if coalesce(st, '') not in ('unverified', 'checking', 'partly', 'supported', 'conflicting', 'refuted', 'unverifiable') then
    raise exception 'unknown status %', p->>'status';
  end if;
  if private.status_db(st) is null then raise exception 'this status needs the database update of 13 Oct 2026'; end if;
  if length(trim(coalesce(p->>'note',''))) < 3 then raise exception 'a note is required'; end if;
  if coalesce(p->>'direction', '') not in ('', 'supports', 'contradicts', 'context') then raise exception 'unknown evidence direction'; end if;
  if jsonb_typeof(coalesce(p->'sources','[]'::jsonb)) <> 'array' then raise exception 'sources must be a list'; end if;
  for s in select * from jsonb_array_elements(coalesce(p->'sources','[]'::jsonb)) loop
    if coalesce(s->>'url','') !~ '^https?://[^/\s?#]+\.[^/\s?#]+' then
      raise exception 'source links must start with http(s):// and name a website';
    end if;
    h := regexp_replace(lower(substring(s->>'url' from '^https?://([^/:?#]+)')), '^www\.', '');
    if not (h = any(hosts)) then hosts := array_append(hosts, h); end if;
    n := n + 1;
  end loop;
  if st = 'supported' then
    if coalesce((p->>'admission')::boolean, false) then
      if n < 1 then raise exception 'an admission needs a link to where it was made'; end if;
    elsif cardinality(hosts) < 2 then
      raise exception 'supported needs two independent sources on two different websites, or an admission by the side concerned';
    end if;
  end if;
  if st = 'refuted' and n < 1 and not coalesce((p->>'keep_sources')::boolean, false) then
    raise exception 'refuted needs at least one source that shows it';
  end if;
end $$;

create or replace function public.claim_add_v2(p jsonb) returns integer language plpgsql security definer set search_path = '' as $$
declare cid int; src jsonb := coalesce(p->'sources','[]'::jsonb); st text := private.status_new(p->>'status');
begin
  perform private.claim_check(p);
  if jsonb_array_length(src) < 1 then raise exception 'a new claim needs at least one source'; end if;
  insert into public.claims (statement, claimant, disputed_by, region, status, party_claim, first_reported,
                             event_time, open_questions, rationale, dependencies, checked_at)
  values (trim(p->>'statement'), trim(p->>'claimant'), nullif(trim(coalesce(p->>'disputed_by','')), ''), p->>'region', private.status_db(st),
          coalesce((p->>'party')::boolean, false), (p->>'first_reported')::date,
          nullif(trim(coalesce(p->>'event_time','')), ''), nullif(trim(coalesce(p->>'open_questions','')), ''),
          nullif(trim(coalesce(p->>'rationale','')), ''), nullif(trim(coalesce(p->>'dependencies','')), ''), now())
  returning id into cid;
  insert into public.claim_events (claim_id, status, note, source_title, source_url, extra_sources, admission, direction)
  values (cid, private.status_db(st), trim(p->>'note'), nullif(src->0->>'title',''), nullif(src->0->>'url',''),
          case when jsonb_array_length(src) > 1 then src - 0 else '[]'::jsonb end, coalesce((p->>'admission')::boolean, false),
          nullif(p->>'direction', ''));
  return cid;
end $$;

create or replace function public.claim_update_v2(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare src jsonb := coalesce(p->'sources','[]'::jsonb); st text := private.status_new(p->>'status');
begin
  if not exists (select 1 from public.claims where id = (p->>'id')::int) then raise exception 'unknown claim'; end if;
  -- Bleibt die Stufe „Widerlegt“, darf ein Nachtrag ohne neuen Link kommen; beim Wechsel dorthin nicht
  perform private.claim_check(p || jsonb_build_object('keep_sources',
    (select private.status_new(c.status) = st from public.claims c where c.id = (p->>'id')::int)));
  insert into public.claim_events (claim_id, status, note, source_title, source_url, extra_sources, admission, direction)
  values ((p->>'id')::int, private.status_db(st), trim(p->>'note'), nullif(src->0->>'title',''), nullif(src->0->>'url',''),
          case when jsonb_array_length(src) > 1 then src - 0 else '[]'::jsonb end, coalesce((p->>'admission')::boolean, false),
          case when jsonb_array_length(src) > 0 then nullif(p->>'direction', '') end);
  update public.claims set status = private.status_db(st), updated_at = now(), checked_at = now(),
    rationale = case when p ? 'rationale' then nullif(trim(p->>'rationale'), '') else rationale end,
    open_questions = case when p ? 'open_questions' then nullif(trim(p->>'open_questions'), '') else open_questions end
  where id = (p->>'id')::int;
end $$;

create or replace function public.claim_edit_v2(p jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare c public.claims; changes text[] := array[]::text[]; n text := nullif(trim(coalesce(p->>'note','')), '');
        old_text text; new_text text := nullif(trim(coalesce(p->>'statement','')), '');
        new_claimant text := nullif(trim(coalesce(p->>'claimant','')), ''); new_first date := nullif(p->>'first_reported','')::date;
        f text; label text;
begin
  select * into c from public.claims where id = (p->>'id')::int;
  if not found then raise exception 'unknown claim'; end if;
  if new_text is not null and new_text <> c.statement then changes := array_append(changes, 'wording'); old_text := c.statement; end if;
  if new_claimant is not null and new_claimant <> c.claimant then changes := array_append(changes, 'who says it'); end if;
  if p ? 'disputed_by' and coalesce(nullif(trim(p->>'disputed_by'),''),'') <> coalesce(c.disputed_by,'') then changes := array_append(changes, 'who denies it'); end if;
  if new_first is not null and new_first <> c.first_reported then changes := array_append(changes, 'first reported date'); end if;
  if p ? 'party' and (p->>'party')::boolean <> c.party_claim then changes := array_append(changes, 'party label'); end if;
  foreach f in array array['event_time', 'open_questions', 'rationale', 'dependencies'] loop
    label := case f when 'event_time' then 'claimed event time' when 'open_questions' then 'open questions'
      when 'rationale' then 'rationale' else 'source dependencies' end;
    if p ? f and coalesce(nullif(trim(p->>f), ''), '') <> coalesce(to_jsonb(c)->>f, '') then changes := array_append(changes, label); end if;
  end loop;
  if cardinality(changes) = 0 then return; end if;
  if old_text is not null and private.status_new(c.status) in ('supported', 'partly') and n is null then
    raise exception 'say why the wording of a supported or partly supported claim changes';
  end if;
  update public.claims set
    statement = coalesce(new_text, statement),
    claimant = coalesce(new_claimant, claimant),
    disputed_by = case when p ? 'disputed_by' then nullif(trim(p->>'disputed_by'),'') else disputed_by end,
    first_reported = coalesce(new_first, first_reported),
    party_claim = coalesce((p->>'party')::boolean, party_claim),
    event_time = case when p ? 'event_time' then nullif(trim(p->>'event_time'), '') else event_time end,
    open_questions = case when p ? 'open_questions' then nullif(trim(p->>'open_questions'), '') else open_questions end,
    rationale = case when p ? 'rationale' then nullif(trim(p->>'rationale'), '') else rationale end,
    dependencies = case when p ? 'dependencies' then nullif(trim(p->>'dependencies'), '') else dependencies end
  where id = c.id;
  insert into public.claim_events (claim_id, status, note)
  values (c.id, c.status, 'Corrected: ' || array_to_string(changes, ', ') || '.'
    || coalesce(' Previous wording: "' || old_text || '".', '')
    || coalesce(' ' || rtrim(n, '.') || '.', ''));
end $$;

create or replace function private.payload(p_reports boolean) returns json language plpgsql stable security definer set search_path = '' as $$
declare r json;
begin
  select json_build_object(
  'now', now(),
  'sources', (select coalesce(json_agg(s order by s.name), '[]'::json) from (
     select s0.id, s0.name, s0.kind, s0.source_type, s0.homepage, s0.stance_note, s0.last_ok_at, s0.last_fetch_at, s0.last_error, s0.last_item_count,
       s0.language, s0.publisher, s0.origin, s0.focus, s0.limitations, s0.failing_since,
       (select max(coalesce(i.published_at, i.fetched_at)) from public.items i where i.source_id = s0.id and cardinality(i.regions) > 0) as newest_item_at,
       (select json_build_object('n', count(*), 'failed', count(*) filter (where not r0.ok), 'found', sum(r0.found), 'kept', sum(r0.kept),
          'new', sum(r0.inserted), 'dupes', sum(r0.duplicates))
        from public.ingest_runs r0 where r0.source_id = s0.id and r0.finished_at > now() - interval '24 hours') as runs,
       (select json_build_object('start', r1.started_at, 'end', r1.finished_at, 'ok', r1.ok, 'found', r1.found, 'kept', r1.kept,
          'new', r1.inserted, 'dupes', r1.duplicates, 'error', r1.error)
        from public.ingest_runs r1 where r1.source_id = s0.id order by r1.finished_at desc limit 1) as last_run
     from public.sources s0 where s0.active) s),
  -- Abgeschaltete Quellen mit Grund, damit die App „abgeschaltet“ statt „nichts gefunden“ zeigen kann
  'sources_off', (select coalesce(json_agg(json_build_object('id', id, 'name', name, 'kind', kind, 'source_type', source_type,
      'homepage', homepage, 'stance_note', stance_note, 'last_error', last_error, 'last_ok_at', last_ok_at) order by name), '[]'::json)
     from public.sources where not active),
  'reports', case when p_reports then (select coalesce(json_agg(r0 order by r0.report_date desc), '[]'::json) from (
     select report_date, generated_at, summary is not null as has_summary from public.reports order by report_date desc limit 60) r0)
     else '[]'::json end,
  -- 7 Tage, damit die Lage auch für 72 Stunden und 7 Tage zusammengefasst werden kann
  'items', (select coalesce(json_agg(i order by coalesce(i.published_at, i.fetched_at) desc), '[]'::json) from (
     select it.id, it.title, nullif(it.title_de, '') as title_de, nullif(it.title_en, '') as title_en, nullif(it.title_ti, '') as title_ti, it.url, it.language, it.regions, it.origin_domain, it.published_at, it.fetched_at,
            s.id as source_id, s.name as source_name, s.source_type
     from public.items it join public.sources s on s.id = it.source_id
     where coalesce(it.published_at, it.fetched_at) > now() - interval '7 days' and cardinality(it.regions) > 0) i),
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
       cl.event_time, cl.open_questions, cl.rationale, cl.dependencies, cl.checked_at,
       (select coalesce(json_agg(json_build_object('at', e.at, 'status', e.status, 'note', e.note, 'source_title', e.source_title,
          'source_url', e.source_url, 'extra', e.extra_sources, 'admission', e.admission, 'direction', e.direction, 'legacy', e.legacy_status) order by e.at desc, e.id desc), '[]'::json)
        from public.claim_events e where e.claim_id = cl.id) as events
     from public.claims cl where cl.active) c),
  'sat', (select coalesce(json_agg(json_build_object('id', p.id, 'name', p.name, 'country', p.country, 'why', p.why,
      'lat', p.lat, 'lon', p.lon, 'half_km', p.half_km, 'images', (select coalesce(json_agg(json_build_array(i.id,
      extract(epoch from i.captured_at)::bigint, i.cloud_pct, i.item_id, i.bytes, extract(epoch from i.fetched_at)::bigint) order by i.captured_at desc), '[]'::json)
      from public.sat_images i where i.place_id = p.id)) order by p.sort), '[]'::json)
      from public.sat_places p where p.active)
  ) into r;
  return r;
end $$;
