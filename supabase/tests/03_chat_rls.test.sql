-- RLS: konverzácie a správy vrátane blokovania.
begin;
select plan(11);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, display_name, birth_date) values
  ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000b', 'B', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000c', 'C', '1990-01-01');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

create temp table conv on commit drop as
  select public.start_conversation('00000000-0000-0000-0000-00000000000b') as id;
select isnt((select id from conv), null, 'A začne konverzáciu s B');
select is(public.start_conversation('00000000-0000-0000-0000-00000000000b'), (select id from conv),
  'opakované volanie vráti tú istú konverzáciu');
select throws_ok(
  $$ insert into public.conversations (user_a, user_b)
     values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'konverzáciu nemožno vložiť priamo');

select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select id, '00000000-0000-0000-0000-00000000000a', 'Ahoj' from conv $$,
  'A pošle správu');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select id, '00000000-0000-0000-0000-00000000000b', 'podvrh' from conv $$,
  '42501', null, 'A nemôže poslať správu v mene B');
select throws_ok($$ update public.messages set body = 'zmenené' $$,
  '42501', null, 'obsah správy nemožno upraviť');

-- C nie je členom
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select is((select count(*)::int from public.messages), 0, 'C nevidí cudzie správy');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     select id, '00000000-0000-0000-0000-00000000000c', 'hi' from conv $$,
  '42501', null, 'C nemôže písať do cudzej konverzácie');

-- B zablokuje A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
insert into public.blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is((select count(*)::int from public.messages), 0, 'po blokovaní A nevidí správy');
select is((select count(*)::int from public.blocks), 0, 'A nevidí, kto ho zablokoval');
select throws_ok($$ select public.start_conversation('00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'A nemôže začať konverzáciu s B po blokovaní');

select * from finish();
rollback;
