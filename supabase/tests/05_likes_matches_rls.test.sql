-- RLS a RPC: like-y a matche vrátane blokovania, inkognita a prémia.
begin;
select plan(22);

-- A bežný, B prémium, C bežný, D blokuje A, E inkognito (prémium)
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-00000000000e');
insert into public.entitlements (user_id, is_premium) values
  ('00000000-0000-0000-0000-00000000000b', true),
  ('00000000-0000-0000-0000-00000000000e', true);
insert into public.profiles (id, display_name, birth_date, is_incognito) values
  ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01', false),
  ('00000000-0000-0000-0000-00000000000b', 'B', '1990-01-01', false),
  ('00000000-0000-0000-0000-00000000000c', 'C', '1990-01-01', false),
  ('00000000-0000-0000-0000-00000000000d', 'D', '1990-01-01', false),
  ('00000000-0000-0000-0000-00000000000e', 'E', '1990-01-01', true);
insert into public.blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000a');

set local role authenticated;

-- A ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

select is(public.like_profile('00000000-0000-0000-0000-00000000000b'), null::uuid,
  'A lajkne B – zatiaľ bez matchu');
select is((select count(*)::int from public.likes where liker_id = '00000000-0000-0000-0000-00000000000a'), 1,
  'A vidí svoj odoslaný like');
select throws_ok(
  $$ insert into public.likes (liker_id, likee_id)
     values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'like nemožno vložiť priamo (iba cez like_profile)');
select throws_ok($$ select public.like_profile('00000000-0000-0000-0000-00000000000a') $$,
  '22023', null, 'nemožno lajknúť sám seba');
select throws_ok($$ select public.like_profile('00000000-0000-0000-0000-00000000000d') $$,
  '42501', null, 'A nemôže lajknúť D, ktorý ho zablokoval');
select throws_ok($$ select public.like_profile('00000000-0000-0000-0000-00000000000e') $$,
  'P0002', null, 'inkognito profil nemožno lajknúť (kým on nelajkne teba)');

-- C lajkne A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select is(public.like_profile('00000000-0000-0000-0000-00000000000a'), null::uuid, 'C lajkne A');
select is((select count(*)::int from public.likes where liker_id = '00000000-0000-0000-0000-00000000000a'), 0,
  'C nevidí cudzie like-y (A → B)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is((select count(*)::int from public.likes where likee_id = '00000000-0000-0000-0000-00000000000a'), 0,
  'A bez prémia nevidí, kto ho lajkol');

-- B (prémium) -------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
select is((select count(*)::int from public.likes where likee_id = '00000000-0000-0000-0000-00000000000b'), 1,
  'B s prémiom vidí, že ho lajkol A');
select isnt(public.like_profile('00000000-0000-0000-0000-00000000000a'), null::uuid,
  'vzájomný like B → A vytvorí match');
select is((select count(*)::int from public.matches), 1, 'B vidí svoj match s A');
select throws_ok(
  $$ insert into public.matches (user_a, user_b)
     values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'match nemožno vložiť priamo');
select throws_ok($$ delete from public.matches $$,
  '42501', null, 'match nemožno zmazať priamo');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select is((select count(*)::int from public.matches), 0, 'C nevidí cudzí match A–B');

-- Inkognito E lajkne A, A môže lajknúť späť -------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', true);
select public.like_profile('00000000-0000-0000-0000-00000000000a');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select isnt(public.like_profile('00000000-0000-0000-0000-00000000000e'), null::uuid,
  'A lajkne späť inkognito E, ktorý ho lajkol – match');

-- A nemôže zmazať cudzí like
delete from public.likes where liker_id = '00000000-0000-0000-0000-00000000000b';
reset role;
select is((select count(*)::int from public.likes where liker_id = '00000000-0000-0000-0000-00000000000b'), 1,
  'A nemôže zmazať like od B');

-- Unlike zruší match ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select lives_ok(
  $$ delete from public.likes where likee_id = '00000000-0000-0000-0000-00000000000b' $$,
  'A vezme like pre B späť');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
select is((select count(*)::int from public.matches), 0, 'po unlike match A–B zanikol');

-- Blokovanie zmaže like-y aj match ---------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
insert into public.blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000e');
reset role;
select is(
  (select count(*)::int from public.likes
    where (liker_id, likee_id) in (('00000000-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0000-00000000000e'::uuid),
                                   ('00000000-0000-0000-0000-00000000000e'::uuid, '00000000-0000-0000-0000-00000000000a'::uuid))),
  0, 'blokovanie zmaže like-y oboma smermi');
select is(
  (select count(*)::int from public.matches
    where user_a = '00000000-0000-0000-0000-00000000000a' and user_b = '00000000-0000-0000-0000-00000000000e'),
  0, 'blokovanie zmaže match');

-- Anonym -------------------------------------------------------------------------
set local role anon;
select throws_ok($$ select * from public.likes $$, '42501', null, 'anonym nemá prístup k like-om');

select * from finish();
rollback;
