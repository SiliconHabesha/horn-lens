-- Horn Lens: Stufe 1 (Tagesbericht Eritrea)
-- Tabellen: sources (Quellen), items (unveränderte Meldungen), reports (tägliche Fassung)

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Quellen ---------------------------------------------------------------
create table public.sources (
  id              text primary key,
  name            text not null,
  homepage        text not null,
  feed_url        text not null,
  kind            text not null check (kind in ('rss', 'gdelt')),
  source_type     text not null check (source_type in (
                    'government_er', 'government_et', 'exile', 'international',
                    'ethiopian_independent', 'un_ngo', 'aggregator')),
  stance_note     text not null,
  language        text not null default 'en',
  default_regions text[] not null default '{}',
  region_filter   boolean not null default true,  -- true: nur Meldungen mit Regions-Stichwort übernehmen
  active          boolean not null default true,
  last_fetch_at   timestamptz,
  last_ok_at      timestamptz,
  last_error      text,
  last_item_count int
);

-- Meldungen (Rohdaten, nie umgeschrieben) -------------------------------
create table public.items (
  id            bigint generated always as identity primary key,
  source_id     text not null references public.sources(id),
  url           text not null unique,
  title         text not null,
  snippet       text,                      -- nur intern (spätere Auswertung), wird nicht angezeigt
  published_at  timestamptz,               -- Veröffentlichungszeit laut Quelle
  fetched_at    timestamptz not null default now(),  -- Abrufzeit
  language      text,
  regions       text[] not null default '{}',
  origin_domain text                       -- bei GDELT: tatsächliches Medium
);
create index items_published_idx on public.items (coalesce(published_at, fetched_at) desc);
create index items_regions_idx on public.items using gin (regions);

-- Tagesberichte (feste Fassung pro Tag) ---------------------------------
create table public.reports (
  id            bigint generated always as identity primary key,
  report_date   date not null unique,
  generated_at  timestamptz not null default now(),
  window_start  timestamptz not null,
  window_end    timestamptz not null,
  payload       jsonb not null
);

-- Interner Schlüssel für den Abholer (nicht öffentlich lesbar) ----------
create schema if not exists private;
create table private.settings (key text primary key, value text not null);
insert into private.settings values ('ingest_key', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
revoke all on schema private from anon, authenticated;

-- Lesen öffentlich, Schreiben nur serverseitig --------------------------
alter table public.sources enable row level security;
alter table public.items   enable row level security;
alter table public.reports enable row level security;
create policy "read sources" on public.sources for select to anon, authenticated using (true);
create policy "read items"   on public.items   for select to anon, authenticated using (true);
create policy "read reports" on public.reports for select to anon, authenticated using (true);

-- Prüffunktion für den Abholer (läuft mit Service-Rechten) -------------
create or replace function public.check_ingest_key(k text)
returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from private.settings where key = 'ingest_key' and value = k);
$$;
revoke execute on function public.check_ingest_key(text) from public, anon, authenticated;

-- Tagesbericht bauen ----------------------------------------------------
-- Nimmt alle Meldungen der letzten 24 Stunden, gruppiert nach Region (Eritrea zuerst)
-- und hält fest, welche Quellen erreichbar waren. Fügt nichts hinzu, was nicht in items steht.
create or replace function public.build_daily_report(p_date date default (now() at time zone 'Europe/Berlin')::date)
returns bigint language plpgsql security definer set search_path = public as $$
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
            and coalesce(i.published_at, i.fetched_at) between w_start and w_end
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
    )
  ) into result;

  insert into reports (report_date, window_start, window_end, payload)
  values (p_date, w_start, w_end, result)
  on conflict (report_date) do update
    set generated_at = now(), window_start = excluded.window_start,
        window_end = excluded.window_end, payload = excluded.payload
  returning id into rid;
  return rid;
end $$;
revoke execute on function public.build_daily_report(date) from public, anon, authenticated;

-- Startquellen ----------------------------------------------------------
insert into public.sources (id, name, homepage, feed_url, kind, source_type, stance_note, language, default_regions, region_filter) values
('shabait', 'Shabait (Eritrean Ministry of Information)', 'https://shabait.com', 'https://shabait.com/feed/', 'rss',
  'government_er', 'Official voice of the Government of Eritrea. Party statement, not independent confirmation.', 'mixed', '{eritrea}', false),
('awate', 'Awate.com', 'https://awate.com', 'https://awate.com/feed/', 'rss',
  'exile', 'Diaspora outlet, close to the opposition. Valuable inside view, not independent confirmation on its own.', 'en', '{eritrea}', false),
('erena', 'Radio Erena', 'https://erena.org', 'https://erena.org/feed/', 'rss',
  'exile', 'Independent exile radio based in Paris with a correspondent network.', 'ti', '{eritrea}', false),
('aljazeera', 'Al Jazeera English', 'https://www.aljazeera.com', 'https://www.aljazeera.com/xml/rss/all.xml', 'rss',
  'international', 'International broadcaster; often carries Reuters and AP reporting.', 'en', '{}', true),
('africanews', 'Africanews', 'https://www.africanews.com', 'https://www.africanews.com/feed/rss', 'rss',
  'international', 'Pan-African news channel.', 'en', '{}', true),
('addisstandard', 'Addis Standard', 'https://addisstandard.com', 'https://addisstandard.com/feed/', 'rss',
  'ethiopian_independent', 'Independent Ethiopian outlet. Ethiopian perspective.', 'en', '{}', true),
('unnews', 'UN News – Africa', 'https://news.un.org', 'https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml', 'rss',
  'un_ngo', 'United Nations news service.', 'en', '{}', true),
('gdelt_eritrea', 'GDELT news search: Eritrea', 'https://www.gdeltproject.org',
  'https://api.gdeltproject.org/api/v2/doc/doc?query=(eritrea%20OR%20eritrean%20OR%20asmara%20OR%20massawa%20OR%20assab)&mode=ArtList&format=json&maxrecords=75&sort=DateDesc&timespan=24h',
  'gdelt', 'aggregator', 'Automatic worldwide news index. The actual outlet is shown per item and has not been rated yet.', 'mixed', '{eritrea}', true),
('gdelt_north', 'GDELT news search: Tigray, Afar, Red Sea', 'https://www.gdeltproject.org',
  'https://api.gdeltproject.org/api/v2/doc/doc?query=(tigray%20OR%20mekelle%20OR%20%22afar%20region%22%20OR%20%22bab%20el-mandeb%22%20OR%20ukmto)&mode=ArtList&format=json&maxrecords=75&sort=DateDesc&timespan=24h',
  'gdelt', 'aggregator', 'Automatic worldwide news index. The actual outlet is shown per item and has not been rated yet.', 'mixed', '{}', true);

-- Zeitplan: Abholer stündlich, Tagesbericht 05:15 UTC (07:15 Köln Sommerzeit, 06:15 Winterzeit)
-- (Abholer-Job wird nach dem Deploy der Edge Function angelegt, weil er die Projekt-URL braucht.)
select cron.schedule('hornlens-daily-report', '15 5 * * *', $$ select public.build_daily_report(); $$);
