-- RLS: profily, fotky, prémiové funkcie, overenie veku.
begin;
select plan(10);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, display_name, birth_date) values
  ('00000000-0000-0000-0000-00000000000b', 'B', '1990-01-01');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

select throws_ok(
  $$ insert into public.profiles (id, display_name, birth_date)
     values ('00000000-0000-0000-0000-00000000000a', 'A', current_date - interval '17 years') $$,
  '23514', null, 'neplnoletý používateľ nemôže vytvoriť profil');
select lives_ok(
  $$ insert into public.profiles (id, display_name, birth_date)
     values ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01') $$,
  'A vytvorí vlastný profil');
select throws_ok(
  $$ insert into public.profiles (id, display_name, birth_date)
     values (gen_random_uuid(), 'X', '1990-01-01') $$,
  '42501', null, 'nemožno vytvoriť profil za iného používateľa');

select is((select count(*)::int from public.profiles), 1, 'A priamo vidí iba vlastný profil');

update public.profiles set display_name = 'hack' where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'B', 'A nemôže upraviť cudzí profil');

set local role authenticated;
select throws_ok($$ update public.profiles set last_active_at = now() - interval '1 year' $$,
  '42501', null, 'systémové stĺpce nie sú upraviteľné klientom');
select throws_ok($$ update public.profiles set is_incognito = true $$,
  '42501', null, 'inkognito bez prémia je zamietnuté');
delete from public.profiles;
reset role;
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 1,
  'profil nemožno zmazať priamo (iba cez delete-account)');
set local role authenticated;

select throws_ok(
  $$ insert into public.profile_photos (user_id, storage_path)
     values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b/x.jpg') $$,
  '42501', null, 'fotka musí ležať vo vlastnom priečinku');
select lives_ok(
  $$ insert into public.profile_photos (user_id, storage_path)
     values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a/x.jpg') $$,
  'A pridá fotku do vlastného priečinka');

select * from finish();
rollback;
