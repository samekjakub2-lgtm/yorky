-- =============================================================================
-- Yorky – like-y a matche
--
-- Like je doplnok k otvorenému chatu: písať sa dá naďalej komukoľvek
-- (start_conversation), vzájomný like vytvorí match.
--
-- Pravidlá (viď CLAUDE.md):
--   * Každá tabuľka má RLS zapnuté v tejto migrácii.
--   * Like sa vytvára iba cez RPC like_profile (kontrola blokovania, inkognita,
--     rate limit) – priamy INSERT je zakázaný.
--   * Match zapisuje iba server (like_profile, triggery) – klient ho len číta.
--   * Blokovanie zmaže like-y aj match medzi dvojicou (skutočné mazanie, nie
--     soft-delete) a RLS ich navyše skrýva.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabuľky
-- -----------------------------------------------------------------------------

create table public.likes (
  liker_id uuid not null references public.profiles (id) on delete cascade,
  likee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, likee_id),
  check (liker_id <> likee_id)
);
alter table public.likes enable row level security;
create index likes_likee_idx on public.likes (likee_id, created_at desc);

-- Neorientovaná dvojica: user_a < user_b, jeden riadok na pár (rovnako ako conversations).
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
alter table public.matches enable row level security;
create index matches_user_b_idx on public.matches (user_b);

-- -----------------------------------------------------------------------------
-- Oprávnenia a RLS politiky
-- Čo nie je výslovne povolené, je zakázané.
-- -----------------------------------------------------------------------------

revoke all on public.likes, public.matches from anon;
-- Zápis iba cez RPC/triggery; klient smie like-y len čítať a mazať (unlike).
revoke insert, update on public.likes from authenticated;
revoke insert, update, delete on public.matches from authenticated;

-- likes: SELECT – like-y, ktoré som dal ja.
create policy likes_select_outgoing on public.likes
  for select to authenticated
  using (liker_id = auth.uid());

-- likes: SELECT – kto lajkol mňa. Prémiová funkcia (stav z webhooku RevenueCat),
-- a nikdy nie od niekoho, s kým je blok.
create policy likes_select_incoming_premium on public.likes
  for select to authenticated
  using (
    likee_id = auth.uid()
    and private.has_premium(auth.uid())
    and not private.is_blocked_with(liker_id)
  );

-- likes: INSERT – žiadna politika, iba cez RPC like_profile.
-- likes: UPDATE – žiadna politika (like sa nemení).

-- likes: DELETE – vlastný like môžem vziať späť (zruší aj prípadný match, viď trigger).
create policy likes_delete_own on public.likes
  for delete to authenticated
  using (liker_id = auth.uid());

-- matches: SELECT – iba moje matche a iba bez blokovania.
create policy matches_select_member on public.matches
  for select to authenticated
  using (
    auth.uid() in (user_a, user_b)
    and not private.is_blocked_with(case when user_a = auth.uid() then user_b else user_a end)
  );

-- matches: INSERT / UPDATE / DELETE – žiadna politika. Match vytvára like_profile,
-- ruší ho unlike (DELETE na likes) alebo blokovanie.

-- -----------------------------------------------------------------------------
-- Triggery
-- -----------------------------------------------------------------------------

-- Unlike => match medzi dvojicou zanikne.
create or replace function private.delete_match_on_unlike()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.matches m
   where m.user_a = least(old.liker_id, old.likee_id)
     and m.user_b = greatest(old.liker_id, old.likee_id);
  return old;
end;
$$;

create trigger likes_delete_match after delete on public.likes
  for each row execute function private.delete_match_on_unlike();

-- Blokovanie => zmaž like-y oboma smermi aj match.
create or replace function private.cleanup_likes_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.likes l
   where (l.liker_id = new.blocker_id and l.likee_id = new.blocked_id)
      or (l.liker_id = new.blocked_id and l.likee_id = new.blocker_id);
  delete from public.matches m
   where m.user_a = least(new.blocker_id, new.blocked_id)
     and m.user_b = greatest(new.blocker_id, new.blocked_id);
  return new;
end;
$$;

create trigger blocks_cleanup_likes after insert on public.blocks
  for each row execute function private.cleanup_likes_on_block();

revoke all on function private.delete_match_on_unlike() from public, anon, authenticated;
revoke all on function private.cleanup_likes_on_block() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------

-- Lajkne profil. Vráti id matchu, ak je like vzájomný, inak null.
-- Cieľ nesmie byť blokovaný ani inkognito – okrem prípadu, keď ma už lajkol
-- on (like späť musí fungovať aj voči inkognito používateľovi).
create or replace function public.like_profile(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  a uuid;
  b uuid;
  match_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_user_id = uid then
    raise exception 'cannot like yourself' using errcode = '22023';
  end if;
  if private.is_blocked_with(p_user_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and (
        not p.is_incognito
        or exists (select 1 from public.likes l where l.liker_id = p_user_id and l.likee_id = uid)
      )
  ) then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  perform private.check_rate_limit('like', 200, interval '1 hour');

  insert into public.likes (liker_id, likee_id) values (uid, p_user_id)
  on conflict do nothing;

  if not exists (select 1 from public.likes l where l.liker_id = p_user_id and l.likee_id = uid) then
    return null;
  end if;

  a := least(uid, p_user_id);
  b := greatest(uid, p_user_id);
  insert into public.matches (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do nothing
  returning id into match_id;

  if match_id is null then
    select m.id into match_id from public.matches m where m.user_a = a and m.user_b = b;
  end if;
  return match_id;
end;
$$;

revoke all on function public.like_profile(uuid) from public, anon;
grant execute on function public.like_profile(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: nový match (Realtime rešpektuje RLS politiky matches)
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.matches;
  end if;
end;
$$;
