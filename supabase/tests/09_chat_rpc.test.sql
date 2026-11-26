-- RPC list_conversations: iba vlastné konverzácie, blokovanie oboma smermi, neprečítané, žiadna poloha.
begin;
select plan(10);

-- A píše s B aj s C; C zablokoval A; D nemá žiadnu konverzáciu.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d');
insert into public.profiles (id, display_name, birth_date) values
  ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000b', 'B', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000c', 'C', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000d', 'D', '1990-01-01');
insert into public.conversations (id, user_a, user_b) values
  ('10000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-0000000000ac', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c');
insert into public.messages (conversation_id, sender_id, body, created_at) values
  ('10000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-00000000000a', 'ahoj', now() - interval '2 minutes'),
  ('10000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-00000000000b', 'čau', now() - interval '1 minute'),
  ('10000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-00000000000b', 'ako sa máš?', now()),
  ('10000000-0000-0000-0000-0000000000ac', '00000000-0000-0000-0000-00000000000c', 'hej', now());
insert into public.blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is((select count(*)::int from public.list_conversations()), 1,
  'A vidí iba konverzáciu s B (C ho zablokoval)');
select is((select display_name from public.list_conversations()), 'B', 'druhá strana je B');
select is((select last_message_body from public.list_conversations()), 'ako sa máš?',
  'náhľad je posledná správa');
select is((select last_message_from_me from public.list_conversations()), false,
  'posledná správa je od B');
select is((select unread_count from public.list_conversations()), 2, 'A má 2 neprečítané od B');
select is(
  (select count(*)::int from public.list_conversations('10000000-0000-0000-0000-0000000000ac')), 0,
  'A nedostane ani hlavičku blokovanej konverzácie');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
select is((select unread_count from public.list_conversations()), 1,
  'B má 1 neprečítanú; vlastné správy sa nepočítajú');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);
select is((select count(*)::int from public.list_conversations()), 0, 'D nevidí cudzie konverzácie');
select is(
  (select count(*)::int from public.list_conversations('10000000-0000-0000-0000-0000000000ab')), 0,
  'D nedostane hlavičku cudzej konverzácie ani podľa id');

reset role;
set local role anon;
select throws_ok($$ select * from public.list_conversations() $$, '42501', null,
  'anonym nemôže volať list_conversations');

select * from finish();
rollback;
