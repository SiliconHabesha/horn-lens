-- Horn Lens, 12.10.2026: alle Inhalte sind öffentlich, also auch alle Hinweise als Benachrichtigung für alle.
-- Der Tagesbericht bleibt beim Betreiber. Push-Kennungen nur im Format des Expo-Dienstes.
create or replace function public.push_next()
returns json language plpgsql security definer set search_path = '' as $$
declare out json; rep record;
begin
  create temp table _a on commit drop as
    select a->>'kind' as kind, (a->>'t')::timestamptz as t, a->>'title' as title, a->>'note' as note, a->>'url' as url,
           'alert:' || (a->>'kind') || ':' || (a->>'t') || ':' || md5(a->>'title') as key
    from json_array_elements(public.current_alerts()) a;
  create temp table _n on commit drop as
    select * from _a where not exists (select 1 from private.push_sent s where s.key = _a.key) and t > now() - interval '3 hours';
  insert into private.push_sent (key) select key from _a on conflict do nothing;
  select report_date, generated_at into rep from public.reports order by report_date desc limit 1;
  out := json_build_object(
    'alerts', (select coalesce(json_agg(json_build_object('kind', kind, 't', t, 'title', title, 'note', note, 'url', url, 'tokens',
        (select coalesce(json_agg(p.token), '[]'::json) from private.push_tokens p where 'alerts' = any(p.kinds)))), '[]'::json) from _n),
    'report', case when rep.report_date is not null and rep.generated_at > now() - interval '3 hours'
                   and not exists (select 1 from private.push_sent where key = 'report:' || rep.report_date)
              then json_build_object('date', rep.report_date, 'tokens',
                   (select coalesce(json_agg(p.token), '[]'::json) from private.push_tokens p where p.owner and 'report' = any(p.kinds))) end);
  if rep.report_date is not null and rep.generated_at > now() - interval '3 hours' then
    insert into private.push_sent (key) values ('report:' || rep.report_date) on conflict do nothing;
  end if;
  return out;
end $$;

create or replace function public.app_push_register(p_token text, p_kinds text[] default '{alerts,report}'::text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,80}\]$' then raise exception 'bad token'; end if;
  insert into private.push_tokens (token, owner, kinds)
  values (p_token, private.is_owner(), coalesce(array(select k from unnest(p_kinds) k where k in ('alerts','report')), '{}'))
  on conflict (token) do update set owner = excluded.owner, kinds = excluded.kinds, updated_at = now();
end $$;
