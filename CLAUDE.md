# Yorky

Mobilná zoznamka pre gay, bi a queer mužov na Slovensku a v Česku.
Progresívna webová aplikácia (PWA), neskôr prípadne natívny obal cez Capacitor.

## Produkt

- **Profil** – fotky, krátky popis, voliteľné údaje (vek, výška, záujmy, čo hľadám).
- **Discovery** – mriežka ľudí v okolí zoradená podľa vzdialenosti (zobrazuje sa len pásmo vzdialenosti).
- **Chat** – 1:1 správy v reálnom čase, odosielanie fotiek.
- **Bezpečnosť** – blokovanie, nahlasovanie, skrytie vzdialenosti, inkognito režim (prémium).
- **Prémium** – predplatné cez Stripe (napr. neobmedzené prehliadanie, inkognito, filtre).

### Citlivosť dát
Sexuálna orientácia je **osobitná kategória osobných údajov (čl. 9 GDPR)**. Únik dát môže viesť k
nedobrovoľnému outingu, vydieraniu alebo fyzickému ohrozeniu. Preto:
- minimalizácia dát – nezbierame nič, čo nevyhnutne nepotrebujeme,
- používateľ musí mať možnosť exportu dát a úplného zmazania účtu (vrátane fotiek, správ a predplatného),
- pri každom rozhodnutí má súkromie prednosť pred pohodlím či metrikami.

## Stack

| Oblasť | Technológia |
|---|---|
| Aplikácia | Next.js (App Router), TypeScript `strict`, Tailwind CSS |
| Backend | Supabase – Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions |
| Auth v Next.js | `@supabase/ssr` (session v cookies, obnova v `middleware.ts`) |
| i18n | `next-intl` – jazyky `sk`, `cs` |
| PWA | Web App Manifest (`src/app/manifest.ts`), service worker (Serwist), Web Push (VAPID) |
| Platby | Stripe Checkout + Customer Portal, webhook → tabuľka `entitlements` |
| Client state | TanStack Query (dáta v klientských komponentoch, Realtime) |
| Validácia | Zod (formuláre, Server Actions, Route Handlers, Edge Functions) |
| Testy | Vitest (unit), Playwright (e2e na mobilnom viewporte), pgTAP (DB) |
| Nasadenie | Vercel (aplikácia), Supabase Cloud (DB, Edge Functions) |
| Neskôr | Capacitor (natívny obal pre iOS/Android) |

## Štruktúra priečinkov

```
src/
  app/
    (auth)/sign-in/         # prihlásenie e-mailovým OTP kódom
    (app)/                  # chránená časť: discover, likes, chat, chat/[id], profile, premium
    api/stripe/webhook/     # Route Handler pre Stripe webhook
    manifest.ts             # Web App Manifest
    sw.ts                   # zdroj service workera (Serwist)
  components/               # znovupoužiteľné UI komponenty (bez dátovej logiky)
  features/                 # doménová logika podľa funkcie
    auth/ discovery/ likes/ profile/ chat/ premium/ safety/ push/
  lib/
    supabase/
      client.ts             # prehliadačový klient (publishable key)
      server.ts             # serverový klient s cookies používateľa
      admin.ts              # service_role – `import 'server-only'`, iba webhooky/admin úlohy
    stripe.ts               # `import 'server-only'`
    platform/               # geolokácia, push, fotoaparát – rozhranie pre neskorší Capacitor
  i18n/                     # konfigurácia next-intl (request.ts, routing)
  types/database.ts         # GENEROVANÉ: `npm run db:types`
messages/
  sk.json  cs.json          # preklady (namespace = kľúč na najvyššej úrovni)
public/icons/               # ikony PWA
supabase/
  migrations/               # SQL migrácie – jediný zdroj pravdy pre schému
  functions/                # Edge Functions (Deno): delete-account, send-push
  tests/                    # pgTAP testy (RLS politiky, RPC funkcie)
e2e/                        # Playwright testy
scripts/db/                 # lokálne DB testy bez Dockeru
middleware.ts               # obnova Supabase session, ochrana rout
```

## Príkazy

```bash
npm run dev              # vývojový server
npm run check            # lint + typecheck + Vitest – musí prejsť pred commitom
npm run test:e2e         # Playwright (mobilný viewport)
npm run test:db          # pgTAP testy (potrebuje `npx supabase start`)
npm run test:db:local    # pgTAP testy bez Dockeru
npm run db:types         # po každej migrácii
```

## Konvencie kódu

- TypeScript `strict`, **žiadne `any`** (ak treba, `unknown` + Zod parse).
- Súbory `kebab-case.ts(x)`, komponenty `PascalCase`, hooky `useXxx`.
- Named exporty; default export iba tam, kde ho vyžaduje Next.js (`page.tsx`, `layout.tsx`, …).
- Predvolene Server Components; `'use client'` iba tam, kde treba interakciu, Realtime alebo API prehliadača.
- Stránky v `src/app/` sú tenké – logika patrí do `src/features/*`.
- Import cez alias `@/` (= `src/`).
- Zápisy cez Server Actions alebo Route Handlers so Zod validáciou; čítanie v Server Components
  alebo cez TanStack Query hooky v `features/*/api.ts`. Žiadne volania Supabase priamo v JSX komponentoch.
- Typy DB sa nepíšu ručne – po každej migrácii spusti `npm run db:types`.
- Schéma DB sa mení **iba cez migrácie** v `supabase/migrations/`, nikdy ručne v dashboarde.
- Prémiový prístup overuje **server** podľa tabuľky `entitlements` (plní ju Stripe webhook), nikdy podľa tvrdenia klienta.
- Kód pre API prehliadača (poloha, push, fotoaparát) iba cez `src/lib/platform/`, aby sa dal neskôr nahradiť Capacitor pluginmi.
- Commity podľa Conventional Commits (`feat:`, `fix:`, `chore:`…).

## ⛔ Nepreklenuteľné pravidlá

### 1. Poloha – nikdy presná GPS iných používateľov
- Klient **nikdy** nedostane súradnice iného používateľa – ani v odpovedi API, ani v Realtime evente, ani v HTML zo servera, ani v logu.
- Polohu získavame iba v popredí (Geolocation API), klient ju pred odoslaním zaokrúhli na 3 desatinné miesta a nikde ju neukladá (ani localStorage, ani cache service workera).
- Server ju uloží **zaokrúhlenú na mriežku ~500 m** do tabuľky v schéme `private`, ktorú cez RLS klienti nečítajú; pristupujú k nej iba `SECURITY DEFINER` RPC funkcie.
- Vzdialenosť počíta **iba server** (PostGIS) a vracia ju v pásmach: `< 1 km`, 1–10 km po 1 km, nad 10 km po 5 km.
- Ochrana proti trilaterácii: minimálne pásmo `< 1 km`, žiadne desatinné čísla, radenie podľa pásma, rate limit na aktualizáciu polohy aj na discovery.
- Používateľ môže zobrazenie svojej vzdialenosti úplne vypnúť.
- Z fotiek sa pred uploadom odstraňujú EXIF metadáta (prekódovanie cez canvas v prehliadači; Storage prijíma iba JPEG/WebP).

Implementácia: `private.user_locations`, `private.snap_to_grid`, `private.distance_bucket_km`,
RPC `update_my_location` / `discover_nearby` / `get_profile`. Nové RPC nesmú vracať stĺpce
s polohou – stráži to `supabase/tests/01_location_privacy.test.sql`.

### 2. RLS na všetkých tabuľkách
- Každá nová tabuľka má `ALTER TABLE … ENABLE ROW LEVEL SECURITY` **v tej istej migrácii**, kde vzniká.
- Ku každej tabuľke explicitné politiky pre `select / insert / update / delete` – čo nie je povolené, je zakázané.
- Blokovanie sa vynucuje na úrovni RLS: zablokovaní používatelia sa navzájom nevidia v discovery ani v chate.
- Každá politika má pgTAP test; test `00_rls_enabled` zlyhá pri tabuľke bez RLS.
- K údajom **iných** používateľov (profily, fotky) sa pristupuje iba cez RPC, nie priamym SELECT-om.
- `service_role` (admin klient) obchádza RLS – smie sa použiť iba v `src/lib/supabase/admin.ts` (Stripe webhook) a v Edge Functions, nikdy na čítanie dát pre bežnú požiadavku používateľa.
- Stĺpcové `GRANT/REVOKE` platia iba bez tabuľkového grantu (najprv `revoke update on …`).
- Žiadne `SECURITY DEFINER` funkcie bez explicitnej kontroly `auth.uid()` a nastaveného `search_path`.

### 3. Všetky UI texty v slovenčine a češtine
- **Žiadne natvrdo napísané texty v UI** – všetko cez `next-intl` (`useTranslations` / `getTranslations`).
  Stráži to ESLint pravidlo `i18next/no-literal-string` pre JSX.
- Každý kľúč musí existovať v `messages/sk.json` aj `messages/cs.json` – kontroluje test parity; kľúče sú typovo kontrolované.
- Platí aj pre `<title>`, metadata, manifest, e-maily, texty notifikácií a chybové hlášky.
- Množné čísla cez ICU syntax (`{count, plural, one {…} few {…} other {…}}`) – SK aj CZ majú tvar pre 2–4.
- Jazyk: cookie → `Accept-Language` → fallback `sk`. URL bez jazykového prefixu.
- Dátumy a čísla cez formátovače `next-intl` podľa aktívneho jazyka.

### 4. Žiadne tajné kľúče v repe
- Tajomstvá (Supabase `service_role`, Stripe secret a webhook secret, VAPID private key) iba
  v nastaveniach prostredia Vercel / Supabase secrets a v lokálnom `.env.local` (v `.gitignore`).
- Prefix `NEXT_PUBLIC_` majú **iba** verejné hodnoty (Supabase URL, publishable key, Stripe publishable key, VAPID public key).
- Moduly s tajomstvami začínajú `import 'server-only'`.
- `.env.example` obsahuje iba názvy premenných, nikdy hodnoty.

### 5. Mobile-first dizajn
- Štýly sa píšu najprv pre mobil (šírka 360–430 px); `sm:`/`md:` breakpointy iba rozširujú.
- Dotykové ciele min. 44 × 44 px, rešpektovať `env(safe-area-inset-*)`, ovládanie palcom v spodnej časti.
- Primárna navigácia = spodná lišta; žiadne hover-only interakcie.
- Každá obrazovka musí fungovať v nainštalovanej PWA (standalone) aj v prehliadači; e2e testy bežia na mobilnom viewporte.

### 6. Notifikácie nikdy neobsahujú text správ ani mená
- Payload Web Push obsahuje iba typ udalosti (napr. `{ "type": "message" }`) – žiadny text, meno, fotku ani ID používateľa.
- Text notifikácie skladá service worker z prekladov (napr. „Nová správa“ / „Nová zpráva“).
- Ikona a názov notifikácie sú neutrálne. Po kliknutí sa otvorí aplikácia, obsah sa načíta až po prihlásení.

### 7. Nikdy nelogovať osobné údaje
- Do `console`, logov Vercelu/Supabase, chybových hlásení ani analytiky nesmie ísť: poloha, obsah správ,
  mená, e-mail, fotky či ich URL, údaje profilu, tokeny ani ID predplatiteľa v kombinácii s identitou.
- Logujeme iba technické údaje (kód chyby, názov operácie, trvanie). Chyby pred odoslaním do monitoringu očisti.
- Žiadne analytické ani reklamné skripty tretích strán bez schválenia.

## Databáza

Schéma je iba v `supabase/migrations/` (poradie podľa časovej pečiatky v názve), testy v `supabase/tests/`.

| Tabuľka | Obsah | Kto číta | Kto zapisuje |
|---|---|---|---|
| `public.profiles` | profil (meno, dátum narodenia, bio, výška, jazyk, skrytie vzdialenosti, inkognito) | vlastník priamo; ostatní **iba cez RPC** `discover_nearby`, `get_profile`, `list_matches`, `list_incoming_likes` | vlastník (len povolené stĺpce); mazanie cez `delete-account` |
| `public.profile_photos` | metadáta fotiek (cesta v bucketi `profile-photos`, poradie) | vlastník; súbory ostatných cez Storage politiku `private.can_view_photos_of` | vlastník, cesta musí začínať `<user_id>/` |
| `private.user_locations` | poloha zaokrúhlená na ~500 m | nikto z klientov, iba RPC | RPC `update_my_location` |
| `private.rate_limits` | počítadlá rate limitov | nikto z klientov | `private.check_rate_limit` |
| `public.likes` | like `liker_id → likee_id` | odoslané vlastník; prijaté iba s prémiom | iba RPC `like_profile`; unlike = `DELETE` vlastného |
| `public.matches` | vzájomný like (`user_a < user_b`) | účastníci bez bloku | iba server (`like_profile`, triggery pri unlike/bloku) |
| `public.conversations` | 1:1 konverzácia (`user_a < user_b`), chat je otvorený aj bez matchu | účastníci bez bloku | iba RPC `start_conversation` |
| `public.messages` | správy v konverzácii | účastníci konverzácie bez bloku | odosielateľ v mene seba; príjemca mení iba `read_at` |
| `public.blocks` | blok `blocker_id → blocked_id` | iba blokujúci | blokujúci (insert/delete) |
| `public.reports` | nahlásenie používateľa | iba nahlasujúci | nahlasujúci (insert); riešenie cez service_role |
| `public.entitlements` | **zdroj pravdy o prémiu** (`is_premium`, `expires_at`) | vlastník | iba Stripe webhook (service_role) |
| `public.subscriptions` | prehľad predplatných (produkt, expirácia, obnova) – len na zobrazenie | vlastník | iba Stripe webhook (service_role) |

Pravidlá pre ďalšie kroky:
- Nová tabuľka = nová migrácia s `enable row level security`, politikami pre select/insert/update/delete
  (alebo komentárom, prečo politika chýba) a pgTAP testom v novom súbore `supabase/tests/NN_*.test.sql`.
- Blokovanie platí **oboma smermi** – používaj `private.is_blocked_with(other)` v politikách aj RPC.
- Údaje iných používateľov vracaj iba cez `SECURITY DEFINER` RPC s kontrolou `auth.uid()`, blokovania
  a inkognita; nikdy nevracaj polohu (stráži `01_location_privacy`).
- Zápisy, ktoré musí overiť server (match, konverzácia, like), idú cez RPC, nie priamy `INSERT`.
- Prémium overuj iba cez `private.has_premium(uid)` / `entitlements`, nikdy cez `subscriptions` ani ID produktu.
- Nové dáta naviaž na `profiles`/`auth.users` cez `on delete cascade`, aby zmazanie účtu zmazalo všetko;
  súbory v Storage maže Edge Function `delete-account`.
- Po každej migrácii pregeneruj typy (`npm run db:types` lokálne s Dockerom; na vetve ich vygeneruje
  a commitne workflow `DB types`, CI na PR kontroluje, že sedia). `src/types/database.ts` needituj ručne.
- DB testy: `npm run test:db` (Docker) alebo `npm run test:db:local`; CI ich spúšťa na každom PR.

## Ďalšie pravidlá súkromia a bezpečnosti
- Fotky v **privátnom** Storage buckete, prístup iba cez podpísané URL s krátkou platnosťou.
- Service worker cachuje iba statické súbory aplikácie – **nikdy** odpovede API, stránky s osobnými údajmi ani podpísané URL fotiek.
- Bezpečnostné hlavičky: CSP, `Referrer-Policy: no-referrer`, `Permissions-Policy` (geolokácia iba pre vlastnú doménu).
- Zmazanie účtu skutočne maže dáta (vrátane Storage) a zruší predplatné v Stripe; nie iba soft-delete.
- Stripe webhook overuje podpis; stav predplatného berie zo Stripe API, nie z tela udalosti.
- Web Push na iOS funguje iba v PWA pridanej na plochu (iOS 16.4+) – UI to musí vysvetliť.

## 🧹 Prechod z pôvodného Expo plánu (dočasné – po dokončení sekciu zmaž)

Zmazať:
- [ ] `app.json`, `AGENTS.md`, `.claude/settings.json` (Expo plugin), `native-locales/`, `assets/` (ikony Expo)
- [ ] `src/app/*` (Expo Router obrazovky vrátane `(tabs)/likes.tsx`), `src/components/*`, `src/constants/`, `src/hooks/`, `src/providers/`
- [ ] `src/lib/revenuecat.ts`, `src/lib/secure-storage.ts` + jeho test
- [ ] `supabase/functions/revenuecat-webhook/`
- [ ] lokálny súbor `yorky.bundle`
- [ ] závislosti: `expo*`, `@expo/*`, `react-native*`, `react-native-purchases`, `jest`, `jest-expo`,
      `@testing-library/react-native`, `eslint-config-expo`

Prepísať:
- [ ] `package.json`, `tsconfig.json`, `eslint.config.js` (eslint-config-next), `.gitignore` (`.next/`, `.vercel/`), `.prettierrc.json` (tailwind plugin)
- [ ] `src/lib/supabase.ts` a `src/lib/env.ts` → `src/lib/supabase/{client,server,admin}.ts` a env pre `NEXT_PUBLIC_*`
- [ ] `src/locales/*` → `messages/sk.json`, `messages/cs.json` (ICU plurály), `src/types/i18next.d.ts` → typy next-intl
- [ ] `src/features/*` vrátane `likes/` → webové verzie (logiku `distance.ts`, zaokrúhlenie polohy a dotazy v `api.ts` zachovať; `person-row.tsx` prepísať na HTML + Tailwind)
- [ ] `src/__tests__/*` → Vitest (zachovať testy parity prekladov, plurálov a pásiem vzdialenosti)
- [ ] `.env.example`, `README.md`, `.github/workflows/ci.yml` (job aplikácie: Next build + Vitest + Playwright)
- [ ] migrácie: komentáre o RevenueCat → Stripe (`..._init.sql`, `..._subscriptions.sql`); v `subscriptions` zúžiť `store` a stĺpce na Stripe;
      pridať `stripe_customer_id` (do schémy `private`) a tabuľku `push_subscriptions` (RLS + testy)
- [ ] `supabase/functions/delete-account` → pridať zrušenie Stripe predplatného a zmazanie push odberov

Zachovať bez zmeny:
- [ ] `supabase/migrations/` (schéma, RLS, PostGIS, rate limity, likes/matches), `supabase/tests/`, `scripts/db/`,
      CI job pre databázu a workflow `.github/workflows/db-types.yml`
