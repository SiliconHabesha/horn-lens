-- Semay, 12.10.2026: deutsche Schlagzeilen (maschinell, Funktion „translate“). Leerer Text = nicht übersetzbar.
alter table public.items add column if not exists title_de text;
-- Nutzlast für die App: title_de bei jeder Meldung
do $$
declare d text;
begin
  select pg_get_functiondef('private.payload(boolean)'::regprocedure) into d;
  d := replace(d, 'select it.id, it.title, it.url,', 'select it.id, it.title, nullif(it.title_de, '''') as title_de, it.url,');
  execute d;
end $$;
