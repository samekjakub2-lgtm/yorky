-- RPC get_my_stripe_customer_id: vracia iba vlastné Stripe customer id.
begin;
select plan(4);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.stripe_customers (user_id, customer_id) values
  ('00000000-0000-0000-0000-00000000000a', 'cus_A');

set local role anon;
select throws_ok($$ select public.get_my_stripe_customer_id() $$, '42501', null,
  'anon nemôže volať get_my_stripe_customer_id');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is(public.get_my_stripe_customer_id(), 'cus_A', 'A dostane vlastné customer id');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
select is(public.get_my_stripe_customer_id(), null, 'B bez zákazníka dostane null (nie cudzie id)');

select set_config('request.jwt.claims', '{}', true);
select throws_ok($$ select public.get_my_stripe_customer_id() $$, '42501', null,
  'bez prihlásenia funkcia zlyhá');

select * from finish();
rollback;
