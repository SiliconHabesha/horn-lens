-- Semay, 12.10.2026: Benachrichtigungen in der Sprache der App (de, en, ti).
-- Spalte lang an den Push-Kennungen; die App setzt sie mit app_push_lang(); push_next() liefert Kennung und Sprache.
alter table private.push_tokens add column if not exists lang text not null default 'de';
create or replace function public.app_push_lang(p_token text, p_lang text)
returns void language sql security definer set search_path = '' as $$
  update private.push_tokens set lang = case when p_lang in ('de','en','ti') then p_lang else 'de' end, updated_at = now() where token = p_token;
$$;
grant execute on function public.app_push_lang(text, text) to anon, authenticated;
-- push_next(): wie in 20261012_public_push.sql, aber tokens als [{to, lang}] (siehe Datenbank)
