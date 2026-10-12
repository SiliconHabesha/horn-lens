-- Semay, 12.10.2026: App auf Deutsch, Englisch und Tigrinya. Schlagzeilen auch auf Englisch und Tigrinya (maschinell, Funktion „translate“).
-- Leerer Text = nicht nötig (Originalsprache) oder nicht übersetzbar; die App zeigt dann das Original.
alter table public.items add column if not exists title_en text, add column if not exists title_ti text;
do $$
declare d text;
begin
  select pg_get_functiondef('private.payload(boolean)'::regprocedure) into d;
  d := replace(d, 'nullif(it.title_de, '''') as title_de,', 'nullif(it.title_de, '''') as title_de, nullif(it.title_en, '''') as title_en, nullif(it.title_ti, '''') as title_ti,');
  execute d;
end $$;
