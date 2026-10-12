-- Semay, 13.10.2026: Ergänzungen nach dem Master-Prompt (Abnahme siehe docs/ABNAHME.md). Nur Hinzufügen, nichts gelöscht.
-- 1. Quellenregister: Herausgeber, Primär-/Sekundärquelle, geografischer Schwerpunkt, bekannte Grenzen.
-- 2. Abruf-Protokoll (ingest_runs): jeder Abruf jeder Quelle mit Zeit, Erfolg, Zahlen und Fehler, 14 Tage lang.
-- 3. Behauptungen: Beleg-Richtung (stützt/widerspricht), behaupteter Zeitpunkt, offene Fragen, Begründung,
--    Quellenabhängigkeiten, Datum der letzten Prüfung. Die neuen Prüfstufen selbst: 20261013_needs_approval.sql.
alter table public.sources
  add column if not exists publisher text,
  add column if not exists origin text,           -- primary | secondary | index | measurement
  add column if not exists focus text[] not null default '{}',
  add column if not exists limitations text;

create table if not exists public.ingest_runs (
  id bigint generated always as identity primary key,
  source_id text not null references public.sources(id),
  started_at timestamptz,
  finished_at timestamptz not null,
  ok boolean not null,
  found integer,       -- Einträge im Feed
  kept integer,        -- davon zu unseren Regionen
  inserted integer,    -- davon neu gespeichert
  duplicates integer,  -- schon vorhanden oder doppelt im Feed
  error text
);
create index if not exists ingest_runs_source_time on public.ingest_runs (source_id, finished_at desc);
create index if not exists ingest_runs_time on public.ingest_runs (finished_at desc);
alter table public.ingest_runs enable row level security;  -- keine Richtlinien: nur über private.payload lesbar

-- Jede Abfrage einer Quelle (alle Abholer setzen last_fetch_at) wird protokolliert. Der Nachrichten-Abholer
-- ergänzt danach Startzeit und Zählwerte in derselben Zeile. Einträge älter als 14 Tage werden gelegentlich entfernt.
create or replace function private.log_run() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.last_fetch_at is null or new.last_fetch_at is not distinct from old.last_fetch_at then return new; end if;
  insert into public.ingest_runs (source_id, finished_at, ok, kept, error)
  values (new.id, new.last_fetch_at, new.last_ok_at is not distinct from new.last_fetch_at,
          case when new.last_ok_at is not distinct from new.last_fetch_at then new.last_item_count end,
          case when new.last_ok_at is distinct from new.last_fetch_at then new.last_error end);
  if random() < 0.05 then delete from public.ingest_runs where finished_at < now() - interval '14 days'; end if;
  return new;
end $$;
create trigger sources_log_run after update of last_fetch_at on public.sources for each row execute function private.log_run();

alter table public.claim_events add column if not exists legacy_status text;
alter table public.claim_events add column if not exists direction text;
alter table public.claims
  add column if not exists event_time text,
  add column if not exists open_questions text,
  add column if not exists rationale text,
  add column if not exists dependencies text,
  add column if not exists checked_at timestamptz;
update public.claims c set checked_at = coalesce(c.checked_at, (select max(e.at) from public.claim_events e where e.claim_id = c.id), c.updated_at);
