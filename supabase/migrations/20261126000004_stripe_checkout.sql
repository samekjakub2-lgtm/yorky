-- =============================================================================
-- Yorky – Stripe Checkout / Customer Portal
--
-- public.get_my_stripe_customer_id() vráti Stripe customer id PRIHLÁSENÉHO
-- používateľa (alebo null). Server Action ho potrebuje na Checkout (aby sa pre
-- jedného používateľa nevytváralo viac zákazníkov) a na Customer Portal.
-- Tabuľka public.stripe_customers ostáva pre klientov nedostupná; zapisuje ju
-- iba Stripe webhook (service_role). Funkcia vracia výhradne vlastný riadok.
-- =============================================================================

create or replace function public.get_my_stripe_customer_id()
returns text
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
  return (select c.customer_id from public.stripe_customers c where c.user_id = uid);
end;
$$;

revoke all on function public.get_my_stripe_customer_id() from public, anon;
grant execute on function public.get_my_stripe_customer_id() to authenticated;
