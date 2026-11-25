-- RLS: prémium, nahlasovanie, Storage a anonymný prístup.
begin;
select plan(9);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, display_name, birth_date) values
  ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000b', 'B', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000c', 'C', '1990-01-01');
insert into public.blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');
insert into storage.objects (bucket_id, name) values
  ('profile-photos', '00000000-0000-0000-0000-00000000000b/1.jpg'),
  ('profile-photos', '00000000-0000-0000-0000-00000000000c/1.jpg');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

select throws_ok(
  $$ insert into public.entitlements (user_id, is_premium) values ('00000000-0000-0000-0000-00000000000a', true) $$,
  '42501', null, 'klient si nemôže sám zapnúť prémium');

select lives_ok(
  $$ insert into public.reports (reporter_id, reported_id, reason)
     values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'spam') $$,
  'A nahlási B');
select throws_ok(
  $$ insert into public.reports (reporter_id, reported_id, reason)
     values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'spam') $$,
  '42501', null, 'nemožno nahlasovať v mene iného');

select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-00000000000b/%'), 1,
  'A vidí fotky B');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-00000000000c/%'), 0,
  'A nevidí fotky C, ktorý ho zablokoval');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('profile-photos', '00000000-0000-0000-0000-00000000000a/1.jpg') $$,
  'A nahrá fotku do vlastného priečinka');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('profile-photos', '00000000-0000-0000-0000-00000000000b/2.jpg') $$,
  '42501', null, 'A nemôže nahrať fotku do priečinka B');

reset role;
set local role anon;
select throws_ok($$ select public.discover_nearby() $$, '42501', null, 'anonym nemôže volať discovery');
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anonym nemá prístup k profilom');

select * from finish();
rollback;
