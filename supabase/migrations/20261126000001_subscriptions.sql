-- =============================================================================
-- Yorky – predplatné (subscriptions)
--
-- Prehľad predplatných z RevenueCat (jeden riadok na používateľa a produkt).
-- Zapisuje IBA webhook revenuecat-webhook (service_role).
--
-- Zdrojom pravdy o prémiu ostáva public.entitlements (+ private.has_premium).
-- Z tejto tabuľky sa prémiový prístup NEodvodzuje (CLAUDE.md: entitlements,
-- nie ID produktov) – slúži na zobrazenie stavu predplatného a podporu.
-- Minimalizácia dát: žiadne ceny, transakcie ani platobné údaje.
-- =============================================================================

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null check (char_length(product_id) between 1 and 200),
  store text not null check (store in ('app_store', 'play_store', 'stripe', 'promotional', 'other')),
  period_type text check (period_type in ('normal', 'trial', 'intro', 'prepaid')),
  purchased_at timestamptz,
  expires_at timestamptz,
  will_renew boolean not null default true,
  has_billing_issue boolean not null default false,
  is_sandbox boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.subscriptions enable row level security;

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Oprávnenia a RLS politiky
-- -----------------------------------------------------------------------------

revoke all on public.subscriptions from anon;
revoke insert, update, delete on public.subscriptions from authenticated;

-- SELECT: iba vlastné predplatné.
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- INSERT / UPDATE / DELETE: žiadna politika – zapisuje iba webhook (service_role
-- obchádza RLS), mazanie zabezpečí ON DELETE CASCADE pri zmazaní účtu.
