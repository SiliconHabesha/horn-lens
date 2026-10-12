-- Horn Lens – Datenbank, wie sie läuft (Stand 11. Oktober 2026, nach der unabhängigen Prüfung)
-- Projekt: mkcaioabbzccawjmtndw (Supabase, Organisation "Horn Lens", Gratis-Tarif)
-- Diese Datei beschreibt den Ist-Zustand vollständig. Auf einem leeren Supabase-Projekt ausgeführt,
-- entsteht dieselbe Datenbank (ohne Inhalte). migrations/ ist die frühe Geschichte.
-- Die Korrekturen aus pending_corrections.sql sind seit 11. Oktober eingespielt und stehen am Ende dieser Datei.
-- Nachtrag 11. Oktober (App): Zugang für die App und Benachrichtigungen kamen als Migrationen dazu, siehe
-- supabase/app_access.md. Ihr genauer Wortlaut liegt in Supabase unter Database → Migrations.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists private;

-- ---------------------------------------------------------------- Tabellen
create table public.sources (
  id text primary key,
  name text not null,
  homepage text not null,
  feed_url text not null,
  kind text not null check (kind in ('rss','gdelt','firms','usgs','ioda','ukmto','sentinel2')),
  source_type text not null check (source_type in ('government_er','government_et','progov_er','progov_et','exile','tigray',
    'international','ethiopian_independent','un_ngo','aggregator','measurement','maritime_authority')),
  stance_note text not null,
  language text not null default 'en',
  default_regions text[] not null default '{}',
  region_filter boolean not null default true,
  active boolean not null default true,
  last_fetch_at timestamptz,
  last_ok_at timestamptz,
  last_error text,                                  -- bei Messquellen auch ein Hinweis auf teilweisen Ausfall
  last_item_count integer,
  strict boolean not null default false,            -- nur Kernregionen oder Konfliktbezug behalten
  failing_since timestamptz                         -- seit wann die Quelle ablehnt (für Rückzug auf 6 h)
);

create table public.items (
  id bigint generated always as identity primary key,
  source_id text not null references public.sources(id),
  url text not null unique,
  title text not null,
  snippet text,                                     -- nur intern für die Regionenzuordnung, wird nie angezeigt
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  language text,
  regions text[] not null default '{}',
  origin_domain text
);
create index items_published_idx on public.items (coalesce(published_at, fetched_at) desc);
create index items_regions_idx on public.items using gin (regions);
create index items_source_idx on public.items (source_id);

create table public.reports (
  id bigint generated always as identity primary key,
  report_date date not null unique,
  generated_at timestamptz not null default now(),
  window_start timestamptz not null,
  window_end timestamptz not null,
  payload jsonb not null,
  summary jsonb                                     -- gespeicherte KI-Zusammenfassung mit Belegen
);

create table public.signals (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('fire','quake','outage','maritime')),
  source_id text not null references public.sources(id),
  external_id text not null unique,
  occurred_at timestamptz not null,
  lat double precision,
  lon double precision,
  title text not null,
  detail jsonb not null default '{}',
  url text,
  fetched_at timestamptz not null default now()
);
create index signals_kind_time_idx on public.signals (kind, occurred_at desc);
create index signals_source_idx on public.signals (source_id);

create table public.sat_places (
  id text primary key,
  name text not null,
  country text not null,
  lat double precision not null,
  lon double precision not null,
  half_km real not null,
  why text not null,                                -- intern, darf aktuelle Lage nennen
  sort int not null,
  active boolean not null default true,
  why_public text                                   -- neutral, für die öffentliche Fassung
);

create table public.sat_images (
  id bigserial primary key,
  place_id text not null references public.sat_places(id),
  item_id text not null,
  captured_at timestamptz not null,
  platform text,
  tile text,
  cloud_pct real not null,
  valid_pct real not null,
  width int not null,
  height int not null,
  mime text not null,
  bytes int not null,
  image bytea not null,
  kind text not null check (kind in ('recent','monthly','yearly')),
  fetched_at timestamptz not null default now(),
  unique (place_id, item_id)
);
create index sat_images_place_time on public.sat_images (place_id, captured_at desc);

create table public.claims (
  id serial primary key,
  statement text not null,
  claimant text not null,
  disputed_by text,
  region text not null check (region in ('eritrea','tigray','afar','red_sea','ethiopia','horn')),
  status text not null check (status in ('confirmed','likely','unconfirmed','disputed','false')),
  party_claim boolean not null default false,
  first_reported date not null,
  updated_at timestamptz not null default now(),
  active boolean not null default true
);

create table public.claim_events (
  id serial primary key,
  claim_id int not null references public.claims(id),
  at timestamptz not null default now(),
  status text not null check (status in ('confirmed','likely','unconfirmed','disputed','false')),
  note text not null,
  source_title text,
  source_url text check (source_url is null or source_url ~ '^https?://'),
  extra_sources jsonb not null default '[]',
  admission boolean not null default false
);
create index claim_events_claim on public.claim_events (claim_id, at desc);

create table private.settings (key text primary key, value text not null);
create table private.sat_checked (
  place_id text not null, item_id text not null, cloud_pct real, valid_pct real, ok boolean not null,
  checked_at timestamptz not null default now(), primary key (place_id, item_id));
create table private.sat_windows (
  place_id text not null, window_key text not null, found boolean not null,
  checked_at timestamptz not null default now(), primary key (place_id, window_key));

-- Interner Schlüssel für die Abholer (Header x-ingest-key)
insert into private.settings (key, value)
values ('ingest_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- ---------------------------------------------------------------- Rechte
-- Die private Seite liest und schreibt als Eigentümer (über die Supabase-Verbindung), die Abholer als service_role.
-- Der öffentliche Schlüssel (anon) darf nur lesen, und nur das, was die öffentliche Fassung zeigt.
alter table public.sources enable row level security;
alter table public.items enable row level security;
alter table public.reports enable row level security;
alter table public.signals enable row level security;
alter table public.sat_places enable row level security;
alter table public.sat_images enable row level security;
alter table public.claims enable row level security;
alter table public.claim_events enable row level security;
create policy "read sources" on public.sources for select to anon, authenticated using (true);
create policy "read items" on public.items for select to anon, authenticated using (regions = array['red_sea']::text[]);
create policy "read reports" on public.reports for select to anon, authenticated using (true);
create policy "read signals" on public.signals for select to anon, authenticated using (kind <> 'outage');
create policy "public read" on public.sat_places for select using (true);
create policy "public read" on public.sat_images for select using (true);
create policy "public read" on public.claims for select using (true);
create policy "public read" on public.claim_events for select using (true);

-- Supabase gibt anon/authenticated sonst alle Rechte; hier nur Lesen, und nicht alles
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.sources, public.signals, public.sat_images to anon, authenticated;
grant select (id, source_id, url, title, published_at, fetched_at, language, regions, origin_domain) on public.items to anon, authenticated;
grant select (id, name, country, lat, lon, half_km, why_public, sort, active) on public.sat_places to anon, authenticated;
-- claims, claim_events, reports: kein Zugriff mit dem öffentlichen Schlüssel
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------- Funktionen
create or replace function public.check_ingest_key(k text)
returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from private.settings where key = 'ingest_key' and value = k);
$$;

-- Gebiet der Hitzepunkte: Eritrea, Tigray, Afar und Grenzgebiete (wie FIRE_BOX in der Funktion "signals")
create or replace function public.in_fire_box(lat double precision, lon double precision)
returns boolean language sql immutable set search_path = '' as $$
  select lat between 11.5 and 18.1 and lon between 36.3 and 43.6 and not (lon > 42.4 and lat > 14.0);
$$;

-- Eilmeldungen intern: feste Regeln über Messsignale und Meldungen
create or replace function public.current_alerts()
returns json language sql stable security invoker set search_path = '' as $f$
  select coalesce(json_agg(a order by a.t desc), '[]'::json) from (
    select 'outage' as kind, occurred_at as t,
           case when drop_pct >= 30 then 'Major internet drop in ' else 'Internet connectivity dip in ' end
             || case detail->>'country' when 'ER' then 'Eritrea' else 'Ethiopia' end as title,
           'IODA (' || coalesce(detail->>'datasource','signal') || ') measured '
             || coalesce(round((detail->>'value')::numeric)::text, '?') || ' against a usual '
             || coalesce(round((detail->>'history_value')::numeric)::text, '?')
             || coalesce(' (−' || drop_pct || '%)', '')
             || '. A measured drop is not proof of a deliberate shutdown.' as note,
           url, 'IODA' as source
    from (select *, case when (detail->>'history_value')::numeric > 0
                 then round(100 * (1 - (detail->>'value')::numeric / (detail->>'history_value')::numeric)) end as drop_pct
          from public.signals where kind = 'outage' and occurred_at > now() - interval '12 hours') o
    where coalesce(drop_pct, 100) >= 10
    union all
    select 'maritime', occurred_at, title,
           'Reported by UKMTO, the UK navy''s shipping desk. UKMTO does not say who was responsible.', url, 'UKMTO'
    from public.signals where kind = 'maritime' and occurred_at > now() - interval '72 hours'
    union all
    select 'quake', occurred_at, title, 'Measured by USGS.', url, 'USGS'
    from public.signals where kind = 'quake' and occurred_at > now() - interval '48 hours'
      and (detail->>'magnitude')::numeric >= 4.5
    union all
    select 'surge', max(coalesce(i.published_at, i.fetched_at)),
           count(*) || ' reports on Eritrea from '
             || count(distinct coalesce(i.origin_domain, regexp_replace(s.homepage, '^https?://(www\.)?([^/]+).*$', '\2')))
             || ' outlets in 6 hours',
           'At least four different outlets reported on Eritrea in the last 6 hours. This alert only counts reports; it does not say what happened.',
           null, 'Horn Lens count'
    from public.items i join public.sources s on s.id = i.source_id
    where 'eritrea' = any(i.regions) and coalesce(i.published_at, i.fetched_at) > now() - interval '6 hours'
    having count(distinct coalesce(i.origin_domain, regexp_replace(s.homepage, '^https?://(www\.)?([^/]+).*$', '\2'))) >= 4
  ) a;
$f$;

-- Eilmeldungen öffentlich: nur Seevorfälle und starke Erdbeben
create or replace function public.public_alerts()
returns json language sql stable security invoker set search_path = '' as $f$
  select coalesce(json_agg(a order by a.t desc), '[]'::json) from (
    select 'maritime' as kind, occurred_at as t, title,
           'Reported by UKMTO, the UK navy''s shipping desk. UKMTO does not say who was responsible.' as note, url, 'UKMTO' as source
    from public.signals where kind = 'maritime' and occurred_at > now() - interval '72 hours'
    union all
    select 'quake', occurred_at, title, 'Measured by USGS.', url, 'USGS'
    from public.signals where kind = 'quake' and occurred_at > now() - interval '48 hours'
      and (detail->>'magnitude')::numeric >= 4.5
  ) a;
$f$;

-- Tagesbericht: Meldungen je Region (auch verspätet eingetroffene, höchstens 2 Tage alt), Stand der
-- Behauptungen, Änderungen, Messsignale, Eilmeldungen
create or replace function public.build_daily_report(p_date date default ((now() at time zone 'Europe/Berlin'))::date)
returns bigint language plpgsql security definer set search_path to 'public' as $function$
declare
  w_end   timestamptz := now();
  w_start timestamptz := now() - interval '24 hours';
  regs    text[] := array['eritrea','tigray','afar','red_sea','ethiopia','horn'];
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

-- Gespeicherte KI-Zusammenfassung: jeder Satz mit Text und Belegen, jeder Beleg eine Meldung dieses Tagesberichts
create or replace function public.report_save_summary(p_date date, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare s jsonb; c jsonb; urls text[];
begin
  if coalesce(jsonb_typeof(p->'sentences'), '') <> 'array' or jsonb_array_length(p->'sentences') = 0 then raise exception 'no sentences'; end if;
  select coalesce(array_agg(it->>'url'), '{}') into urls
  from public.reports r,
       jsonb_array_elements(coalesce(r.payload->'regions', '[]'::jsonb)) reg,
       jsonb_array_elements(coalesce(reg->'items', '[]'::jsonb)) it
  where r.report_date = p_date;
  if cardinality(urls) = 0 then raise exception 'no daily report with reports for that date'; end if;
  for s in select * from jsonb_array_elements(p->'sentences') loop
    if length(trim(coalesce(s->>'text', ''))) = 0 then raise exception 'empty sentence'; end if;
    if coalesce(jsonb_typeof(s->'cites'), '') <> 'array' or jsonb_array_length(s->'cites') = 0 then raise exception 'every sentence needs a source'; end if;
    for c in select * from jsonb_array_elements(s->'cites') loop
      if c->>'url' is null or not (c->>'url' = any(urls)) then raise exception 'every source must be a report in this daily report'; end if;
    end loop;
  end loop;
  update public.reports set summary = p || jsonb_build_object('saved_at', now()) where report_date = p_date;
  if not found then raise exception 'no report for that date'; end if;
end $$;

-- Satellitenbilder: Prüflisten und Einfügen (nur für die Funktion "satellite")
create or replace function public.sat_state()
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'checked', coalesce((select jsonb_agg(place_id || '|' || item_id) from private.sat_checked), '[]'::jsonb),
    'windows', coalesce((select jsonb_agg(place_id || '|' || window_key) from private.sat_windows), '[]'::jsonb));
$$;
create or replace function public.sat_mark(p_checked jsonb, p_windows jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into private.sat_checked (place_id, item_id, cloud_pct, valid_pct, ok)
  select x->>'place_id', x->>'item_id', (x->>'cloud_pct')::real, (x->>'valid_pct')::real, (x->>'ok')::boolean
  from jsonb_array_elements(coalesce(p_checked, '[]'::jsonb)) x
  on conflict do nothing;
  insert into private.sat_windows (place_id, window_key, found)
  select x->>'place_id', x->>'window_key', (x->>'found')::boolean
  from jsonb_array_elements(coalesce(p_windows, '[]'::jsonb)) x
  on conflict do nothing;
end $$;
create or replace function public.sat_insert(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.sat_images (place_id, item_id, captured_at, platform, tile, cloud_pct, valid_pct, width, height, mime, bytes, image, kind)
  values (p->>'place_id', p->>'item_id', (p->>'captured_at')::timestamptz, p->>'platform', p->>'tile',
          (p->>'cloud_pct')::real, (p->>'valid_pct')::real, (p->>'width')::int, (p->>'height')::int, p->>'mime',
          (p->>'bytes')::int, decode(p->>'b64', 'base64'), p->>'kind')
  on conflict (place_id, item_id) do nothing;
end $$;

-- Behauptungen: Regel prüfen ("bestätigt" = zwei verschiedene Websites oder ein Eingeständnis mit Beleg),
-- anlegen, neuer Stand, berichtigen. Der Verlauf bleibt immer erhalten, auch der alte Wortlaut.
create or replace function private.claim_check(p jsonb)
returns void language plpgsql set search_path = '' as $$
declare s jsonb; n int := 0; h text; hosts text[] := array[]::text[];
begin
  if coalesce(p->>'status','') not in ('confirmed','likely','unconfirmed','disputed','false') then
    raise exception 'unknown status %', p->>'status';
  end if;
  if length(trim(coalesce(p->>'note',''))) < 3 then raise exception 'a note is required'; end if;
  if jsonb_typeof(coalesce(p->'sources','[]'::jsonb)) <> 'array' then raise exception 'sources must be a list'; end if;
  for s in select * from jsonb_array_elements(coalesce(p->'sources','[]'::jsonb)) loop
    if coalesce(s->>'url','') !~ '^https?://[^/\s?#]+\.[^/\s?#]+' then
      raise exception 'source links must start with http(s):// and name a website';
    end if;
    h := regexp_replace(lower(substring(s->>'url' from '^https?://([^/:?#]+)')), '^www\.', '');
    if not (h = any(hosts)) then hosts := array_append(hosts, h); end if;
    n := n + 1;
  end loop;
  if p->>'status' = 'confirmed' then
    if coalesce((p->>'admission')::boolean, false) then
      if n < 1 then raise exception 'an admission needs a link to where it was made'; end if;
    elsif cardinality(hosts) < 2 then
      raise exception 'confirmed needs two independent sources on two different websites, or an admission by the side concerned';
    end if;
  end if;
end $$;

create or replace function public.claim_update_v2(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare src jsonb := coalesce(p->'sources','[]'::jsonb);
begin
  perform private.claim_check(p);
  if not exists (select 1 from public.claims where id = (p->>'id')::int) then raise exception 'unknown claim'; end if;
  insert into public.claim_events (claim_id, status, note, source_title, source_url, extra_sources, admission)
  values ((p->>'id')::int, p->>'status', trim(p->>'note'), nullif(src->0->>'title',''), nullif(src->0->>'url',''),
          case when jsonb_array_length(src) > 1 then src - 0 else '[]'::jsonb end, coalesce((p->>'admission')::boolean, false));
  update public.claims set status = p->>'status', updated_at = now() where id = (p->>'id')::int;
end $$;

create or replace function public.claim_add_v2(p jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare cid int; src jsonb := coalesce(p->'sources','[]'::jsonb);
begin
  perform private.claim_check(p);
  if jsonb_array_length(src) < 1 then raise exception 'a new claim needs at least one source'; end if;
  insert into public.claims (statement, claimant, disputed_by, region, status, party_claim, first_reported)
  values (trim(p->>'statement'), trim(p->>'claimant'), nullif(trim(coalesce(p->>'disputed_by','')), ''), p->>'region', p->>'status',
          coalesce((p->>'party')::boolean, false), (p->>'first_reported')::date)
  returning id into cid;
  insert into public.claim_events (claim_id, status, note, source_title, source_url, extra_sources, admission)
  values (cid, p->>'status', trim(p->>'note'), nullif(src->0->>'title',''), nullif(src->0->>'url',''),
          case when jsonb_array_length(src) > 1 then src - 0 else '[]'::jsonb end, coalesce((p->>'admission')::boolean, false));
  return cid;
end $$;

create or replace function public.claim_edit_v2(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.claims; changes text[] := array[]::text[]; n text := nullif(trim(coalesce(p->>'note','')), '');
        old_text text; new_text text := nullif(trim(coalesce(p->>'statement','')), '');
        new_claimant text := nullif(trim(coalesce(p->>'claimant','')), ''); new_first date := nullif(p->>'first_reported','')::date;
begin
  select * into c from public.claims where id = (p->>'id')::int;
  if not found then raise exception 'unknown claim'; end if;
  if new_text is not null and new_text <> c.statement then changes := array_append(changes, 'wording'); old_text := c.statement; end if;
  if new_claimant is not null and new_claimant <> c.claimant then changes := array_append(changes, 'who says it'); end if;
  if p ? 'disputed_by' and coalesce(nullif(trim(p->>'disputed_by'),''),'') <> coalesce(c.disputed_by,'') then changes := array_append(changes, 'who denies it'); end if;
  if new_first is not null and new_first <> c.first_reported then changes := array_append(changes, 'first reported date'); end if;
  if p ? 'party' and (p->>'party')::boolean <> c.party_claim then changes := array_append(changes, 'party label'); end if;
  if cardinality(changes) = 0 then return; end if;
  if old_text is not null and c.status in ('confirmed','likely') and n is null then
    raise exception 'say why the wording of a confirmed or likely claim changes';
  end if;
  update public.claims set
    statement = coalesce(new_text, statement),
    claimant = coalesce(new_claimant, claimant),
    disputed_by = case when p ? 'disputed_by' then nullif(trim(p->>'disputed_by'),'') else disputed_by end,
    first_reported = coalesce(new_first, first_reported),
    party_claim = coalesce((p->>'party')::boolean, party_claim)
  where id = c.id;
  insert into public.claim_events (claim_id, status, note)
  values (c.id, c.status, 'Corrected: ' || array_to_string(changes, ', ') || '.'
    || coalesce(' Previous wording: "' || old_text || '".', '')
    || coalesce(' ' || rtrim(n, '.') || '.', ''));
end $$;

-- Funktionsrechte: nur service_role und Eigentümer; öffentlich nur die beiden Lesefunktionen
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on function private.claim_check(jsonb) from public, anon, authenticated;
grant execute on function public.public_alerts() to anon, authenticated;
grant execute on function public.in_fire_box(double precision, double precision) to anon, authenticated;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------- Zeitplan (pg_cron)
-- <PROJECT_URL> durch https://<projekt>.supabase.co ersetzen
select cron.schedule('hornlens-ingest', '7 * * * *', $$
  select net.http_post(url := '<PROJECT_URL>/functions/v1/ingest',
    headers := jsonb_build_object('Content-Type','application/json','x-ingest-key', (select value from private.settings where key = 'ingest_key')),
    body := '{}'::jsonb, timeout_milliseconds := 120000); $$);
select cron.schedule('hornlens-signals', '37 * * * *', $$
  select net.http_post(url := '<PROJECT_URL>/functions/v1/signals',
    headers := jsonb_build_object('Content-Type','application/json','x-ingest-key', (select value from private.settings where key = 'ingest_key')),
    body := '{}'::jsonb, timeout_milliseconds := 150000); $$);
select cron.schedule('hornlens-satellite', '52 * * * *', $$
  select net.http_post(url := '<PROJECT_URL>/functions/v1/satellite',
    headers := jsonb_build_object('Content-Type','application/json','x-ingest-key', (select value from private.settings where key = 'ingest_key')),
    body := '{}'::jsonb, timeout_milliseconds := 150000); $$);
-- Tagesbericht um 07:15 deutscher Zeit, auch über die Zeitumstellung hinweg (cron läuft in UTC)
select cron.schedule('hornlens-daily-report', '15 5,6 * * *',
  $$ select public.build_daily_report() where extract(hour from now() at time zone 'Europe/Berlin') = 7; $$);

-- ---------------------------------------------------------------- Quellen
insert into public.sources (id, name, homepage, feed_url, kind, source_type, stance_note, language, default_regions, region_filter, strict, active) values
 ('shabait', 'Shabait (Eritrean Ministry of Information)', 'https://shabait.com', 'https://shabait.com/feed/', 'rss', 'government_er', 'Official voice of the Government of Eritrea. Party statement, not independent confirmation.', 'mixed', '{eritrea}', false, false, true),
 ('awate', 'Awate.com', 'https://awate.com', 'https://awate.com/feed/', 'rss', 'exile', 'Diaspora outlet, close to the opposition. Valuable inside view, not independent confirmation on its own.', 'en', '{eritrea}', false, false, true),
 ('asmarino', 'Asmarino Independent', 'https://asmarino.com', 'https://asmarino.com/?format=feed&type=rss', 'rss', 'exile', 'Eritrean diaspora outlet critical of the government. Valuable inside view, not independent confirmation on its own.', 'mixed', '{eritrea}', false, false, true),
 ('erena', 'Radio Erena', 'https://erena.org', 'https://erena.org/feed/', 'rss', 'exile', 'Independent exile radio based in Paris with a correspondent network.', 'ti', '{eritrea}', false, false, true),
 ('eritreafocus', 'Eritrea Focus', 'https://eritrea-focus.org', 'https://eritrea-focus.org/feed/', 'rss', 'exile', 'UK-based advocacy group critical of the Eritrean government. Switched off by default.', 'en', '{eritrea}', false, false, false),
 ('aljazeera', 'Al Jazeera English', 'https://www.aljazeera.com', 'https://www.aljazeera.com/xml/rss/all.xml', 'rss', 'international', 'International broadcaster; often carries Reuters and AP reporting.', 'en', '{}', true, false, true),
 ('africanews', 'Africanews', 'https://www.africanews.com', 'https://www.africanews.com/feed/rss', 'rss', 'international', 'Pan-African news channel.', 'en', '{}', true, false, true),
 ('france24', 'France 24 – Africa', 'https://www.france24.com/en/africa/', 'https://www.france24.com/en/africa/rss', 'rss', 'international', 'French international broadcaster; often carries AFP reporting.', 'en', '{}', true, false, true),
 ('dw', 'DW – Africa', 'https://www.dw.com/en/africa/s-12756', 'https://rss.dw.com/xml/rss-en-africa', 'rss', 'international', 'German international broadcaster.', 'en', '{}', true, false, true),
 ('guardian_er', 'The Guardian – Eritrea', 'https://www.theguardian.com/world/eritrea', 'https://www.theguardian.com/world/eritrea/rss', 'rss', 'international', 'British newspaper, its Eritrea topic page.', 'en', '{eritrea}', false, false, true),
 ('guardian_et', 'The Guardian – Ethiopia', 'https://www.theguardian.com/world/ethiopia', 'https://www.theguardian.com/world/ethiopia/rss', 'rss', 'international', 'British newspaper, its Ethiopia topic page.', 'en', '{ethiopia}', false, false, true),
 ('tnh', 'The New Humanitarian', 'https://www.thenewhumanitarian.org', 'https://www.thenewhumanitarian.org/rss.xml', 'rss', 'international', 'Independent newsroom reporting on crises and aid.', 'en', '{}', true, false, true),
 ('theeastafrican', 'The EastAfrican', 'https://www.theeastafrican.co.ke', 'https://www.theeastafrican.co.ke/rss.xml', 'rss', 'international', 'Regional weekly from Kenya''s Nation Media Group.', 'en', '{}', true, false, true),
 ('gcaptain', 'gCaptain', 'https://gcaptain.com', 'https://gcaptain.com/feed/', 'rss', 'international', 'Shipping trade press.', 'en', '{}', true, false, true),
 ('maritimeexec', 'The Maritime Executive', 'https://maritime-executive.com', 'https://maritime-executive.com/articles.rss', 'rss', 'international', 'Shipping trade press.', 'en', '{}', true, false, true),
 ('splash247', 'Splash247', 'https://splash247.com', 'https://splash247.com/feed/', 'rss', 'international', 'Shipping trade press.', 'en', '{}', true, false, true),
 ('unnews', 'UN News – Africa', 'https://news.un.org', 'https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml', 'rss', 'un_ngo', 'United Nations news service.', 'en', '{}', true, false, true),
 ('hrw', 'Human Rights Watch', 'https://www.hrw.org', 'https://www.hrw.org/rss/news', 'rss', 'un_ngo', 'International human rights organisation.', 'en', '{}', true, false, true),
 ('amnesty', 'Amnesty International', 'https://www.amnesty.org', 'https://www.amnesty.org/en/feed/', 'rss', 'un_ngo', 'International human rights organisation.', 'en', '{}', true, false, true),
 ('bbc_tigrinya', 'BBC News Tigrinya', 'https://www.bbc.com/tigrinya', 'https://feeds.bbci.co.uk/tigrinya/rss.xml', 'rss', 'international', 'Tigrinya service of the BBC, the UK''s publicly funded broadcaster.', 'ti', '{}', true, false, true),
 ('bbc_amharic', 'BBC News Amharic', 'https://www.bbc.com/amharic', 'https://feeds.bbci.co.uk/amharic/rss.xml', 'rss', 'international', 'Amharic service of the BBC, the UK''s publicly funded broadcaster. Only items about Eritrea, Tigray, Afar or the Red Sea.', 'am', '{}', true, true, true),
 ('ethiopiaobserver', 'Ethiopia Observer', 'https://www.ethiopiaobserver.com', 'https://www.ethiopiaobserver.com/feed/', 'rss', 'ethiopian_independent', 'Independent Ethiopian news site, in English and Amharic.', 'mixed', '{}', true, true, true),
 ('hrce', 'Human Rights Concern – Eritrea', 'https://hrc-eritrea.org', 'https://hrc-eritrea.org/feed/', 'rss', 'exile', 'Eritrean diaspora human rights group, critical of the government. Not independent confirmation on its own.', 'en', '{eritrea}', false, false, true),
 ('crisisgroup', 'International Crisis Group', 'https://www.crisisgroup.org', 'https://www.crisisgroup.org/rss.xml', 'rss', 'un_ngo', 'Independent conflict-analysis organisation.', 'en', '{}', true, false, true),
 ('addisstandard', 'Addis Standard', 'https://addisstandard.com', 'https://addisstandard.com/feed/', 'rss', 'ethiopian_independent', 'Independent Ethiopian outlet. Ethiopian perspective.', 'en', '{}', true, false, true),
 ('ethiopiainsight', 'Ethiopia Insight', 'https://www.ethiopia-insight.com', 'https://www.ethiopia-insight.com/feed/', 'rss', 'ethiopian_independent', 'Independent analysis and reporting on Ethiopia.', 'en', '{}', true, false, true),
 ('wazema', 'Wazema', 'https://wazemaradio.com', 'https://wazemaradio.com/feed/', 'rss', 'ethiopian_independent', 'Independent Ethiopian media.', 'mixed', '{}', true, true, true),
 ('reporter', 'The Reporter (Ethiopia)', 'https://www.thereporterethiopia.com', 'https://www.thereporterethiopia.com/feed/?v=2', 'rss', 'ethiopian_independent', 'Independent Ethiopian weekly.', 'en', '{}', true, true, true),
 ('addisfortune', 'Addis Fortune', 'https://addisfortune.news', 'https://addisfortune.news/feed/', 'rss', 'ethiopian_independent', 'Independent Ethiopian business weekly. Switched off by default.', 'en', '{}', true, false, false),
 ('capitalethiopia', 'Capital (Ethiopia)', 'https://www.capitalethiopia.com', 'https://www.capitalethiopia.com/feed/', 'rss', 'ethiopian_independent', 'Ethiopian business weekly. Switched off by default.', 'en', '{}', true, false, false),
 ('fana', 'Fana Broadcasting (English)', 'https://www.fanamc.com/english/', 'https://www.fanamc.com/english/feed/', 'rss', 'progov_et', 'Ethiopian broadcaster close to the ruling party. Treat its conflict reporting like a party statement.', 'en', '{}', true, true, true),
 ('tghat', 'Tghat', 'https://www.tghat.com', 'https://www.tghat.com/feed/', 'rss', 'tigray', 'Tigrayan outlet close to the TPLF. Treat its conflict reporting like a party statement.', 'mixed', '{}', true, false, true),
 ('gdelt_eritrea', 'GDELT news search: Eritrea', 'https://www.gdeltproject.org', 'https://api.gdeltproject.org/api/v2/doc/doc?query=(eritrea%20OR%20eritrean%20OR%20asmara%20OR%20massawa%20OR%20assab)&mode=ArtList&format=json&maxrecords=75&sort=DateDesc&timespan=24h', 'gdelt', 'aggregator', 'Automatic worldwide news index. Switched off: GDELT refuses requests from our server (HTTP 429).', 'mixed', '{eritrea}', true, false, false),
 ('gdelt_north', 'GDELT news search: Tigray, Afar, Red Sea', 'https://www.gdeltproject.org', 'https://api.gdeltproject.org/api/v2/doc/doc?query=(tigray%20OR%20mekelle%20OR%20%22afar%20region%22%20OR%20%22bab%20el-mandeb%22%20OR%20ukmto)&mode=ArtList&format=json&maxrecords=75&sort=DateDesc&timespan=24h', 'gdelt', 'aggregator', 'Automatic worldwide news index. Switched off: GDELT refuses requests from our server (HTTP 429).', 'mixed', '{}', true, false, false),
 ('firms', 'NASA FIRMS (VIIRS fire detections)', 'https://firms.modaps.eosdis.nasa.gov', 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/', 'firms', 'measurement', 'Satellite heat detections. Shows that something was hot at a place and time, not what caused it.', 'en', '{}', true, false, true),
 ('usgs', 'USGS earthquakes', 'https://earthquake.usgs.gov', 'https://earthquake.usgs.gov/fdsnws/event/1/query', 'usgs', 'measurement', 'Seismic measurements, magnitude 2.5 and above.', 'en', '{}', true, false, true),
 ('ioda', 'IODA internet outage detection (Georgia Tech)', 'https://ioda.inetintel.cc.gatech.edu', 'https://api.ioda.inetintel.cc.gatech.edu/v2/outages/alerts', 'ioda', 'measurement', 'Measures connectivity drops per country. Says nothing about the cause.', 'en', '{}', true, false, true),
 ('ukmto', 'UKMTO maritime incidents', 'https://www.ukmto.org/recent-incidents', 'https://sccd.royalnavy.mod.uk/api/ukmto/all', 'ukmto', 'maritime_authority', 'UK Maritime Trade Operations. Usually the first official confirmation of an incident at sea; does not attribute blame.', 'en', '{red_sea}', true, false, true),
 ('sentinel2', 'Copernicus Sentinel-2', 'https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a', 'https://planetarycomputer.microsoft.com/api/stac/v1', 'sentinel2', 'measurement', 'Optical satellite images, 10 m per pixel, via Microsoft Planetary Computer.', 'en', '{}', false, false, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- Satelliten-Orte (Koordinaten geprüft, siehe README)
insert into public.sat_places (id, name, country, lat, lon, half_km, why, sort) values
 ('assab-airfield', 'Assab airfield', 'Eritrea', 13.070, 42.645, 4.5, 'Airport and the former UAE military base next to it, with its own pier.', 1),
 ('assab-port', 'Assab port', 'Eritrea', 13.010, 42.735, 4.0, 'Eritrea''s southern port, near the Ethiopian border and the Bab el-Mandeb strait.', 2),
 ('massawa', 'Massawa port', 'Eritrea', 15.610, 39.450, 4.0, 'Eritrea''s main port on the Red Sea.', 3),
 ('asmara', 'Asmara and airport', 'Eritrea', 15.305, 38.920, 4.5, 'The capital and its international airport.', 4),
 ('sawa', 'Sawa training centre', 'Eritrea', 15.6989, 36.9737, 4.5, 'Eritrea''s national service and military training centre.', 5),
 ('zalambessa', 'Zalambessa–Serha crossing', 'Eritrea / Ethiopia', 14.517, 39.383, 4.0, 'Main road crossing between Serha (Eritrea) and Zalambessa (Tigray).', 6),
 ('tsorona', 'Tsorona', 'Eritrea', 14.6213, 39.1950, 4.0, 'Border area south of Asmara; a front line in 1998–2000 and in 2016.', 7),
 ('badme', 'Badme', 'Eritrea / Ethiopia', 14.7261, 37.8033, 4.0, 'Border village at the centre of the 1998–2000 war.', 8),
 ('omhajer', 'Om Hajer', 'Eritrea', 14.3231, 36.6527, 4.0, 'Eritrean border town on the Setit river, opposite Humera.', 9),
 ('tesseney', 'Tesseney', 'Eritrea', 15.110, 36.657, 4.0, 'Western Eritrea near the Sudan border.', 10),
 ('humera', 'Humera', 'Ethiopia (Tigray)', 14.297, 36.617, 4.0, 'Western Tigray at the Eritrea and Sudan borders.', 11),
 ('adigrat', 'Adigrat', 'Ethiopia (Tigray)', 14.2769, 39.4619, 4.0, 'Tigray town about 25 km from the border; eyewitnesses told Reuters they saw Eritrean troops there in October 2026.', 12),
 ('mekelle', 'Mekelle', 'Ethiopia (Tigray)', 13.497, 39.475, 4.5, 'Capital of Tigray.', 13),
 ('bure', 'Bure', 'Ethiopia (Afar)', 12.6010, 42.2698, 4.5, 'Ethiopian border town on the road to Assab.', 14),
 ('perim', 'Perim island', 'Yemen (Bab el-Mandeb)', 12.655, 43.418, 4.0, 'Island in the Bab el-Mandeb strait, the entrance to the Red Sea opposite Eritrea''s southern coast.', 15)
on conflict (id) do nothing;

-- Korrekturen aus der Datenprüfung (eingespielt am 11. Oktober 2026)
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

-- 7) Alte Funktionen ohne Prüfung der Bestätigungs-Regel (seit 10. Oktober gesperrt)
drop function if exists public.claim_add(text, text, text, text, text, boolean, date, text, text, text);
drop function if exists public.claim_update(integer, text, text, text, text);
