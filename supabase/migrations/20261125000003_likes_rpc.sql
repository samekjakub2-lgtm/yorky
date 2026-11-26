-- =============================================================================
-- Yorky – RPC pre obrazovku Lajky
--
-- Údaje iných používateľov (meno, vek, fotka) sa podľa CLAUDE.md čítajú iba cez
-- SECURITY DEFINER RPC. Žiadna z funkcií nevracia polohu ani vzdialenosť.
-- =============================================================================

-- Moje matche s menom, vekom a hlavnou fotkou druhej strany. Bez blokovaných.
create or replace function public.list_matches()
returns table (
  match_id uuid,
  user_id uuid,
  display_name text,
  age integer,
  primary_photo_path text,
  matched_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return query
  select
    m.id,
    p.id,
    p.display_name,
    extract(year from age(p.birth_date))::integer,
    (select ph.storage_path from public.profile_photos ph
      where ph.user_id = p.id order by ph.position limit 1),
    m.created_at
  from public.matches m
  join public.profiles p on p.id = case when m.user_a = uid then m.user_b else m.user_a end
  where uid in (m.user_a, m.user_b)
    and not private.is_blocked_with(p.id)
  order by m.created_at desc
  limit 200;
end;
$$;

-- Kto ma lajkol (a ešte nie je match). Prémiová funkcia – stav zo Stripe webhooku.
create or replace function public.list_incoming_likes()
returns table (
  user_id uuid,
  display_name text,
  age integer,
  primary_photo_path text,
  liked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not private.has_premium(uid) then
    raise exception 'premium required' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.display_name,
    extract(year from age(p.birth_date))::integer,
    (select ph.storage_path from public.profile_photos ph
      where ph.user_id = p.id order by ph.position limit 1),
    l.created_at
  from public.likes l
  join public.profiles p on p.id = l.liker_id
  where l.likee_id = uid
    and not private.is_blocked_with(p.id)
    and not exists (
      select 1 from public.likes back where back.liker_id = uid and back.likee_id = l.liker_id
    )
  order by l.created_at desc
  limit 200;
end;
$$;

revoke all on function public.list_matches() from public, anon;
revoke all on function public.list_incoming_likes() from public, anon;
grant execute on function public.list_matches() to authenticated;
grant execute on function public.list_incoming_likes() to authenticated;
