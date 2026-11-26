-- =============================================================================
-- Yorky – počiatočná schéma
--
-- Pravidlá (viď CLAUDE.md):
--   1. Presná poloha iných používateľov sa NIKDY nevracia. Poloha sa ukladá
--      zaokrúhlená na mriežku ~500 m v schéme `private`, vzdialenosť sa vracia
--      iba v pásmach.
--   2. Každá tabuľka má zapnuté RLS (kontroluje test supabase/tests/00_rls_enabled).
--   3. K údajom iných používateľov sa pristupuje iba cez SECURITY DEFINER RPC,
--      ktoré kontrolujú auth.uid() a blokovanie.
-- =============================================================================

create extension if not exists postgis with schema extensions;

-- Schéma `private` nie je vystavená cez PostgREST API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated; -- potrebné pre helpery v RLS politikách
alter default privileges in schema private revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Pomocné funkcie
-- -----------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Pásmo vzdialenosti v km: 0 = "< 1 km", 1–9 po 1 km, od 10 po 5 km.
create or replace function private.distance_bucket_km(meters double precision)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case
    when meters is null then null
    when meters < 1000 then 0
    when meters < 10000 then floor(meters / 1000)::smallint
    else (floor(meters / 5000) * 5)::smallint
  end;
$$;

-- Zaokrúhlenie bodu na mriežku ~500 m (krok v zemepisnej dĺžke sa koriguje o cos(lat)).
create or replace function private.snap_to_grid(lat double precision, lng double precision)
returns extensions.geography
language plpgsql
immutable
set search_path = ''
as $$
declare
  lat_step constant double precision := 0.0045; -- ~500 m
  lat_s double precision;
  lng_step double precision;
  lng_s double precision;
begin
  lat_s := round(lat / lat_step) * lat_step;
  lng_step := lat_step / greatest(cos(radians(lat_s)), 0.01);
  lng_s := round(lng / lng_step) * lng_step;
  return extensions.st_setsrid(extensions.st_makepoint(lng_s, lat_s), 4326)::extensions.geography;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tabuľky
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  birth_date date not null,
  bio text check (char_length(bio) <= 500),
  height_cm smallint check (height_cm between 120 and 230),
  locale text not null default 'sk' check (locale in ('sk', 'cs')),
  hide_distance boolean not null default false,
  is_incognito boolean not null default false,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0 check (position between 0 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, position)
);
alter table public.profile_photos enable row level security;

-- Poloha: iba zaokrúhlená, iba v privátnej schéme, žiadne politiky = žiadny prístup klientov.
create table private.user_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  location extensions.geography (point, 4326) not null,
  updated_at timestamptz not null default now()
);
alter table private.user_locations enable row level security;
create index user_locations_gix on private.user_locations using gist (location);

create table private.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (user_id, action)
);
alter table private.rate_limits enable row level security;

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
create index blocks_blocked_idx on public.blocks (blocked_id);

create type public.report_reason as enum (
  'fake_profile', 'harassment', 'spam', 'underage', 'inappropriate_content', 'other'
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
alter table public.reports enable row level security;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
alter table public.conversations enable row level security;
create index conversations_user_b_idx on public.conversations (user_b);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.messages enable row level security;
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);

-- Stav prémia zapisuje IBA Stripe webhook (service_role).
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Helpery pre politiky (SECURITY DEFINER, aby videli blokácie oboma smermi)
-- -----------------------------------------------------------------------------

create or replace function private.is_blocked_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = auth.uid())
  );
$$;

create or replace function private.is_conversation_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv
      and auth.uid() in (c.user_a, c.user_b)
      and not private.is_blocked_with(case when c.user_a = auth.uid() then c.user_b else c.user_a end)
  );
$$;

create or replace function private.has_premium(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select e.is_premium and (e.expires_at is null or e.expires_at > now())
    from public.entitlements e where e.user_id = uid
  ), false);
$$;

-- Jednoduchý rate limiter (fixné okno). Vyhodí chybu pri prekročení.
create or replace function private.check_rate_limit(p_action text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_hits integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into private.rate_limits as r (user_id, action, window_start, hits)
  values (uid, p_action, now(), 1)
  on conflict (user_id, action) do update
    set hits = case when r.window_start < now() - p_window then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - p_window then now() else r.window_start end
  returning hits into current_hits;

  if current_hits > p_max then
    raise exception 'rate limit exceeded' using errcode = 'P0429';
  end if;
end;
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_blocked_with(uuid) to authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;

-- Inkognito je prémiová funkcia – overuje sa na serveri, nie podľa klienta.
create or replace function private.enforce_premium_features()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_incognito and not private.has_premium(new.id) then
    raise exception 'incognito requires premium' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_premium_features before insert or update of is_incognito on public.profiles
  for each row execute function private.enforce_premium_features();

-- Overenie veku 18+ (CHECK nemôže použiť current_date).
create or replace function private.enforce_adult()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date > (current_date - interval '18 years') then
    raise exception 'user must be at least 18 years old' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger profiles_adult before insert or update of birth_date on public.profiles
  for each row execute function private.enforce_adult();

grant execute on function private.has_premium(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Oprávnenia a RLS politiky
-- Čo nie je výslovne povolené, je zakázané.
-- -----------------------------------------------------------------------------

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all tables in schema public from anon;

-- profiles: priamo iba vlastný riadok; cudzie profily iba cez RPC.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- delete: žiadna politika – mazanie účtu iba cez Edge Function delete-account.
-- Stĺpcové oprávnenia fungujú iba bez tabuľkového grantu, preto revoke + grant stĺpcov.
revoke update on public.profiles from authenticated;
grant update (display_name, birth_date, bio, height_cm, locale, hide_distance, is_incognito)
  on public.profiles to authenticated;

-- profile_photos
create policy profile_photos_select_own on public.profile_photos
  for select to authenticated using (user_id = auth.uid());
create policy profile_photos_insert_own on public.profile_photos
  for insert to authenticated
  with check (user_id = auth.uid() and storage_path like auth.uid()::text || '/%');
create policy profile_photos_update_own on public.profile_photos
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profile_photos_delete_own on public.profile_photos
  for delete to authenticated using (user_id = auth.uid());
revoke update on public.profile_photos from authenticated;
grant update (position) on public.profile_photos to authenticated;

-- blocks
create policy blocks_select_own on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy blocks_insert_own on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());
-- update: žiadna politika.

-- reports: iba vytvorenie a čítanie vlastných.
create policy reports_select_own on public.reports
  for select to authenticated using (reporter_id = auth.uid());
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- conversations: vytvára sa cez RPC start_conversation.
create policy conversations_select_member on public.conversations
  for select to authenticated using (private.is_conversation_member(id));

-- messages
create policy messages_select_member on public.messages
  for select to authenticated using (private.is_conversation_member(conversation_id));
create policy messages_insert_member on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and private.is_conversation_member(conversation_id));
create policy messages_update_recipient on public.messages
  for update to authenticated
  using (sender_id <> auth.uid() and private.is_conversation_member(conversation_id))
  with check (sender_id <> auth.uid() and private.is_conversation_member(conversation_id));
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- entitlements: iba čítanie vlastného stavu.
create policy entitlements_select_own on public.entitlements
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.entitlements from authenticated;

-- Pri novej správe aktualizuj čas poslednej správy v konverzácii.
create or replace function private.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation after insert on public.messages
  for each row execute function private.touch_conversation();

-- -----------------------------------------------------------------------------
-- RPC funkcie (verejné API)
-- -----------------------------------------------------------------------------

-- Uloží vlastnú polohu zaokrúhlenú na mriežku. Max 6× za 10 minút.
create or replace function public.update_my_location(lat double precision, lng double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if lat not between -90 and 90 or lng not between -180 and 180 then
    raise exception 'invalid coordinates' using errcode = '22023';
  end if;

  perform private.check_rate_limit('update_location', 6, interval '10 minutes');

  insert into private.user_locations (user_id, location, updated_at)
  values (uid, private.snap_to_grid(lat, lng), now())
  on conflict (user_id) do update
    set location = excluded.location, updated_at = excluded.updated_at;

  update public.profiles set last_active_at = now() where id = uid;
end;
$$;

-- Ľudia v okolí. Vracia iba pásmo vzdialenosti (nikdy súradnice ani presné metre).
-- Radenie podľa pásma, nie podľa presnej vzdialenosti, aby poradie neprezrádzalo viac.
create or replace function public.nearby_profiles(p_limit integer default 60, p_offset integer default 0)
returns table (
  id uuid,
  display_name text,
  age integer,
  distance_bucket_km smallint,
  primary_photo_path text,
  last_active_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  my_location extensions.geography;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select l.location into my_location from private.user_locations l where l.user_id = uid;
  if my_location is null then
    return;
  end if;

  return query
  with candidates as (
    select
      p.id,
      p.display_name,
      extract(year from age(p.birth_date))::integer as age,
      p.hide_distance,
      private.distance_bucket_km(extensions.st_distance(l.location, my_location)) as bucket,
      p.last_active_at
    from public.profiles p
    join private.user_locations l on l.user_id = p.id
    where p.id <> uid
      and not p.is_incognito
      and extensions.st_dwithin(l.location, my_location, 100000) -- max 100 km
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = uid and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = uid)
      )
  )
  select
    c.id,
    c.display_name,
    c.age,
    case when c.hide_distance then null else c.bucket end,
    (select ph.storage_path from public.profile_photos ph
      where ph.user_id = c.id order by ph.position limit 1),
    c.last_active_at
  from candidates c
  order by c.bucket, c.last_active_at desc, c.id
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

-- nearby_profiles je STABLE, preto rate limit kontroluje samostatný wrapper.
create or replace function public.discover_nearby(p_limit integer default 60, p_offset integer default 0)
returns table (
  id uuid,
  display_name text,
  age integer,
  distance_bucket_km smallint,
  primary_photo_path text,
  last_active_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  perform private.check_rate_limit('discover', 30, interval '1 minute');
  return query select * from public.nearby_profiles(p_limit, p_offset);
end;
$$;

-- Detail cudzieho profilu. Prázdny výsledok, ak je blokovaný alebo neexistuje.
create or replace function public.get_profile(p_user_id uuid)
returns table (
  id uuid,
  display_name text,
  age integer,
  bio text,
  height_cm smallint,
  distance_bucket_km smallint,
  photo_paths text[]
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
  if p_user_id <> uid and private.is_blocked_with(p_user_id) then
    return;
  end if;

  return query
  select
    p.id,
    p.display_name,
    extract(year from age(p.birth_date))::integer,
    p.bio,
    p.height_cm,
    case
      when p.hide_distance or p.id = uid then null
      else private.distance_bucket_km(extensions.st_distance(theirs.location, mine.location))
    end,
    coalesce(
      (select array_agg(ph.storage_path order by ph.position)
        from public.profile_photos ph where ph.user_id = p.id),
      '{}'::text[]
    )
  from public.profiles p
  left join private.user_locations theirs on theirs.user_id = p.id
  left join private.user_locations mine on mine.user_id = uid
  where p.id = p_user_id
    and (p.id = uid or not p.is_incognito);
end;
$$;

-- Začne (alebo vráti existujúcu) konverzáciu s iným používateľom.
create or replace function public.start_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  a uuid;
  b uuid;
  conv_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_other = uid then
    raise exception 'cannot start conversation with yourself' using errcode = '22023';
  end if;
  if private.is_blocked_with(p_other) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  perform private.check_rate_limit('start_conversation', 30, interval '1 hour');

  a := least(uid, p_other);
  b := greatest(uid, p_other);

  insert into public.conversations (user_a, user_b) values (a, b)
  on conflict (user_a, user_b) do nothing
  returning id into conv_id;

  if conv_id is null then
    select c.id into conv_id from public.conversations c where c.user_a = a and c.user_b = b;
  end if;
  return conv_id;
end;
$$;

revoke all on function public.update_my_location(double precision, double precision) from public, anon;
revoke all on function public.nearby_profiles(integer, integer) from public, anon, authenticated;
revoke all on function public.discover_nearby(integer, integer) from public, anon;
revoke all on function public.get_profile(uuid) from public, anon;
revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.update_my_location(double precision, double precision) to authenticated;
grant execute on function public.discover_nearby(integer, integer) to authenticated;
grant execute on function public.get_profile(uuid) to authenticated;
grant execute on function public.start_conversation(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: privátny bucket na fotky, cesta = "<user_id>/<uuid>.jpg"
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create or replace function private.can_view_photos_of(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (
      owner_id = auth.uid()
      or (
        not private.is_blocked_with(owner_id)
        and exists (select 1 from public.profiles p where p.id = owner_id and not p.is_incognito)
      )
    );
$$;
grant execute on function private.can_view_photos_of(uuid) to authenticated;

create policy profile_photos_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and private.can_view_photos_of(((storage.foldername(name))[1])::uuid)
  );
create policy profile_photos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_photos_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_photos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- Realtime: nové správy (Realtime rešpektuje RLS politiky messages)
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
