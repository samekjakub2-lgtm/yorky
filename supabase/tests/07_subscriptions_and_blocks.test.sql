-- RLS: predplatné a blokovanie v OBOCH smeroch (profily, fotky, správy).
begin;
select plan(16);

-- A a B majú konverzáciu so správou, potom B zablokuje A. C je nezávislý.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, display_name, birth_date) values
  ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000b', 'B', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000c', 'C', '1990-01-01');
insert into public.subscriptions (user_id, product_id, store, expires_at) values
  ('00000000-0000-0000-0000-00000000000a', 'yorky_premium_month', 'app_store', now() + interval '30 days'),
  ('00000000-0000-0000-0000-00000000000b', 'yorky_premium_year', 'play_store', now() + interval '1 year');
insert into public.conversations (id, user_a, user_b) values
  ('00000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
insert into public.messages (conversation_id, sender_id, body) values
  ('00000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-00000000000a', 'Ahoj');
insert into storage.objects (bucket_id, name) values
  ('profile-photos', '00000000-0000-0000-0000-00000000000a/1.jpg'),
  ('profile-photos', '00000000-0000-0000-0000-00000000000b/1.jpg');
insert into public.blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');

set local role authenticated;

-- Predplatné ----------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is((select count(*)::int from public.subscriptions), 1, 'A vidí iba svoje predplatné');
select is((select product_id from public.subscriptions), 'yorky_premium_month', 'A vidí svoj produkt');
select throws_ok(
  $$ insert into public.subscriptions (user_id, product_id, store)
     values ('00000000-0000-0000-0000-00000000000a', 'fake', 'other') $$,
  '42501', null, 'klient si nemôže vložiť predplatné');
select throws_ok($$ update public.subscriptions set expires_at = now() + interval '10 years' $$,
  '42501', null, 'klient si nemôže predĺžiť predplatné');
select throws_ok($$ delete from public.subscriptions $$,
  '42501', null, 'klient nemôže mazať predplatné');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select is((select count(*)::int from public.subscriptions), 0, 'C nevidí cudzie predplatné');

-- Blokovanie: zablokovaný A nevidí blokujúceho B ----------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is((select count(*)::int from public.get_profile('00000000-0000-0000-0000-00000000000b')), 0,
  'zablokovaný A nevidí profil B');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-00000000000b/%'), 0,
  'zablokovaný A nevidí fotky B');
select is((select count(*)::int from public.messages), 0, 'zablokovaný A nevidí správy s B');
select throws_ok($$ select public.start_conversation('00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'zablokovaný A nezačne konverzáciu s B');

-- ...a ani blokujúci B nevidí A ------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
select is((select count(*)::int from public.get_profile('00000000-0000-0000-0000-00000000000a')), 0,
  'blokujúci B nevidí profil A');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-00000000000a/%'), 0,
  'blokujúci B nevidí fotky A');
select is((select count(*)::int from public.messages), 0, 'blokujúci B nevidí správy s A');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('00000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-00000000000b', 'hej') $$,
  '42501', null, 'blokujúci B nenapíše A');

-- C (bez bloku) vidí oboch ---------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select is((select count(*)::int from public.get_profile('00000000-0000-0000-0000-00000000000a')), 1,
  'C bez bloku vidí profil A');

reset role;
set local role anon;
select throws_ok($$ select * from public.subscriptions $$, '42501', null, 'anonym nevidí predplatné');

select * from finish();
rollback;
