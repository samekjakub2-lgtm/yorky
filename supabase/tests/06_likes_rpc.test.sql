-- RPC list_matches / list_incoming_likes: prémium, blokovanie, žiadna poloha.
begin;
select plan(8);

-- A bežný, B prémium, C match s B, D lajkol B, ale B ho zablokoval
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');
insert into public.entitlements (user_id, is_premium) values ('00000000-0000-0000-0000-00000000000b', true);
insert into public.profiles (id, display_name, birth_date) values
  ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000b', 'B', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000c', 'C', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000d', 'D', '1990-01-01');
insert into public.blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d');
insert into public.likes (liker_id, likee_id) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000b');
insert into public.matches (user_a, user_b)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
select is((select count(*)::int from public.list_incoming_likes()), 1,
  'B vidí iba like od A (C je už match, D je zablokovaný)');
select is((select user_id from public.list_incoming_likes()), '00000000-0000-0000-0000-00000000000a'::uuid,
  'prichádzajúci like je od A');
select is((select count(*)::int from public.list_matches()), 1, 'B má jeden match');
select is((select display_name from public.list_matches()), 'C', 'match je s C');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select throws_ok($$ select * from public.list_incoming_likes() $$,
  '42501', null, 'bez prémia nemožno vidieť, kto ťa lajkol');
select is((select count(*)::int from public.list_matches()), 0, 'A nevidí cudzie matche');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);
select is((select count(*)::int from public.list_matches()), 0, 'zablokovaný D nevidí žiadny match');

reset role;
set local role anon;
select throws_ok($$ select * from public.list_matches() $$, '42501', null, 'anonym nemôže volať list_matches');

select * from finish();
rollback;
