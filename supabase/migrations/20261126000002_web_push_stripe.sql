-- =============================================================================
-- Yorky – prechod na PWA: Web Push odbery a Stripe zákazníci
--
-- 1. public.push_subscriptions – Web Push odbery (endpoint + kľúče) prihláseného
--    používateľa. Payload notifikácie nikdy neobsahuje text správy ani mená
--    (CLAUDE.md, pravidlo 6) – tabuľka preto drží iba technické údaje odberu.
-- 2. public.stripe_customers – mapovanie user_id → Stripe customer id. Klienti k nej
--    nemajú žiadny prístup; číta/zapisuje iba service_role (Stripe webhook,
--    delete-account). Je v public, lebo service_role pristupuje cez PostgREST.
-- 3. public.subscriptions – zdrojom sú odteraz iba Stripe udalosti.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Web Push odbery
-- -----------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

revoke all on public.push_subscriptions from anon;
revoke update on public.push_subscriptions from authenticated;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
-- UPDATE: žiadna politika – zmenený odber sa zmaže a vloží nanovo.

-- -----------------------------------------------------------------------------
-- 2. Stripe zákazníci (bez prístupu klientov)
-- -----------------------------------------------------------------------------

create table public.stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  customer_id text not null unique check (customer_id ~ '^cus_'),
  created_at timestamptz not null default now()
);
alter table public.stripe_customers enable row level security;
revoke all on public.stripe_customers from anon, authenticated;
-- Žiadne politiky: select/insert/update/delete iba service_role (obchádza RLS).

-- -----------------------------------------------------------------------------
-- 3. Predplatné iba zo Stripe
-- -----------------------------------------------------------------------------

alter table public.subscriptions drop constraint subscriptions_store_check;
alter table public.subscriptions
  add constraint subscriptions_store_check check (store in ('stripe', 'promotional'));

comment on table public.subscriptions is
  'Prehľad predplatných zo Stripe (len na zobrazenie). Zdroj pravdy o prémiu je public.entitlements.';
comment on table public.entitlements is
  'Zdroj pravdy o prémiu. Zapisuje iba Stripe webhook (service_role).';
