-- RLS: Web Push odbery a Stripe zákazníci; predplatné iba zo Stripe.
begin;
select plan(11);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, display_name, birth_date) values
  ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01'),
  ('00000000-0000-0000-0000-00000000000b', 'B', '1990-01-01');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('00000000-0000-0000-0000-00000000000b', 'https://push.example/b', 'key-b', 'auth-b');
insert into public.stripe_customers (user_id, customer_id) values
  ('00000000-0000-0000-0000-00000000000a', 'cus_A');

select throws_ok(
  $$ insert into public.subscriptions (user_id, product_id, store)
     values ('00000000-0000-0000-0000-00000000000a', 'x', 'app_store') $$,
  '23514', null, 'predplatné môže byť iba zo Stripe');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

-- push_subscriptions
select lives_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('00000000-0000-0000-0000-00000000000a', 'https://push.example/a', 'key-a', 'auth-a') $$,
  'A uloží vlastný push odber');
select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('00000000-0000-0000-0000-00000000000b', 'https://push.example/x', 'k', 'a') $$,
  '42501', null, 'A nemôže uložiť odber za B');
select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('00000000-0000-0000-0000-00000000000a', 'http://insecure.example', 'k', 'a') $$,
  '23514', null, 'endpoint musí byť https');
select is((select count(*)::int from public.push_subscriptions), 1, 'A vidí iba vlastný odber');
select throws_ok($$ update public.push_subscriptions set endpoint = 'https://evil.example' $$,
  '42501', null, 'odber nemožno upraviť');

delete from public.push_subscriptions where user_id = '00000000-0000-0000-0000-00000000000b';
reset role;
select is((select count(*)::int from public.push_subscriptions
            where user_id = '00000000-0000-0000-0000-00000000000b'), 1,
  'A nemôže zmazať odber B');

-- stripe_customers
set local role authenticated;
select throws_ok($$ select * from public.stripe_customers $$, '42501', null,
  'klient nevidí Stripe zákazníkov');
select throws_ok(
  $$ insert into public.stripe_customers (user_id, customer_id)
     values ('00000000-0000-0000-0000-00000000000a', 'cus_fake') $$,
  '42501', null, 'klient nemôže zapisovať Stripe zákazníkov');

-- zmazanie účtu zmaže aj odbery a Stripe mapovanie
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*)::int from public.push_subscriptions
            where user_id = '00000000-0000-0000-0000-00000000000a'), 0,
  'zmazanie účtu zmaže push odbery');
select is((select count(*)::int from public.stripe_customers
            where user_id = '00000000-0000-0000-0000-00000000000a'), 0,
  'zmazanie účtu zmaže Stripe mapovanie');

select * from finish();
rollback;
