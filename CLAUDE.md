# Yorky

Mobilná zoznamka pre gay, bi a queer mužov na Slovensku a v Česku (iOS + Android).

## Produkt

- **Profil** – fotky, krátky popis, voliteľné údaje (vek, výška, záujmy, čo hľadám).
- **Discovery** – mriežka ľudí v okolí zoradená podľa vzdialenosti (zobrazuje sa len zaokrúhlená vzdialenosť).
- **Chat** – 1:1 správy v reálnom čase, odosielanie fotiek.
- **Bezpečnosť** – blokovanie, nahlasovanie, skrytie vzdialenosti, inkognito režim (prémium).
- **Prémium** – predplatné cez RevenueCat (napr. neobmedzené prehliadanie, inkognito, filtre).

### Citlivosť dát
Sexuálna orientácia je **osobitná kategória osobných údajov (čl. 9 GDPR)**. Únik dát môže viesť k
nedobrovoľnému outingu, vydieraniu alebo fyzickému ohrozeniu. Preto:
- minimalizácia dát – nezbierame nič, čo nevyhnutne nepotrebujeme,
- používateľ musí mať možnosť exportu dát a úplného zmazania účtu (vrátane fotiek a správ),
- pri každom rozhodnutí má súkromie prednosť pred pohodlím či metrikami.

## Stack

| Oblasť | Technológia |
|---|---|
| Aplikácia | Expo (managed workflow), TypeScript `strict`, Expo Router |
| Backend | Supabase – Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions |
| Platby | RevenueCat (`react-native-purchases`) + webhook do Edge Function |
| Server state | TanStack Query |
| Client state | Zustand |
| Validácia | Zod (formuláre, odpovede API, vstupy Edge Functions) |
| i18n | `i18next`, `react-i18next`, `expo-localization` |

## Štruktúra priečinkov

```
src/
  app/                  # Expo Router – iba obrazovky a layouty (tenké)
    (auth)/             # prihlásenie e-mailovým OTP kódom
    (tabs)/             # index = discovery, chat, profile
  components/           # znovupoužiteľné UI komponenty (bez dátovej logiky)
  features/             # doménová logika podľa funkcie
    auth/               # session store (Zustand), OTP prihlásenie
    discovery/          # poloha, pásma vzdialenosti, ľudia v okolí
    profile/            # môj profil, cudzí profil cez RPC, upload fotiek bez EXIF
    chat/               # konverzácie, správy, Realtime
    paywall/            # stav prémia zo servera
    safety/             # blokovanie, nahlasovanie
  lib/                  # supabase.ts, revenuecat.ts, i18n.ts, env.ts, secure-storage.ts
  locales/sk|cs/        # JSON preklady podľa namespace (common, auth, discovery…)
  providers/            # AppProviders (i18n, TanStack Query, auth listener)
  types/database.ts     # GENEROVANÉ: `npm run db:types`
  __tests__/            # Jest testy
supabase/
  migrations/           # SQL migrácie – jediný zdroj pravdy pre schému
  functions/            # Edge Functions (Deno): revenuecat-webhook, delete-account
  tests/                # pgTAP testy (RLS politiky, RPC funkcie)
native-locales/         # systémové texty iOS (povolenia) v sk/cs
scripts/db/             # lokálne DB testy bez Dockeru
```

## Príkazy

```bash
npm run check            # lint + typecheck + Jest – musí prejsť pred commitom
npm run test:db          # pgTAP testy (potrebuje `npx supabase start`)
npm run test:db:local    # pgTAP testy bez Dockeru (Postgres + PostGIS + pgTAP lokálne)
npm run db:types         # po každej migrácii
npx expo install <pkg>   # vždy namiesto npm install pre Expo/RN balíčky
```

Expo-špecifické pokyny (verzované dokumentácie, EAS, CNG) sú v @AGENTS.md.

## Konvencie kódu

- TypeScript `strict`, **žiadne `any`** (ak treba, `unknown` + Zod parse).
- Súbory `kebab-case.ts(x)`, komponenty `PascalCase`, hooky `useXxx`.
- Named exporty; default export iba tam, kde ho vyžaduje Expo Router (`src/app/`).
- Obrazovky v `src/app/` sú tenké – logika patrí do `src/features/*`.
- Import cez alias `@/` (= `src/`).
- Dáta zo servera iba cez TanStack Query hooky v `features/*/api.ts`; žiadne volania Supabase priamo z komponentov.
- Typy DB sa nepíšu ručne – po každej migrácii spusti `npm run db:types`.
- Schéma DB sa mení **iba cez migrácie** v `supabase/migrations/`, nikdy ručne v dashboarde.
- `service_role` kľúč **nikdy** v aplikácii – iba v Edge Functions.
- Prémiový prístup kontroluj cez RevenueCat **entitlements**, nie cez ID produktov. Serverovo chránené prémiové funkcie overuj podľa stavu uloženého z webhooku, nie podľa tvrdenia klienta.
- Commity podľa Conventional Commits (`feat:`, `fix:`, `chore:`…).
- Pred commitom musí prejsť: lint, typecheck, testy.

## ⛔ Nepreklenuteľné pravidlá

### 1. Poloha – nikdy presná GPS iných používateľov
- Klient **nikdy** nedostane súradnice iného používateľa – ani v API odpovedi, ani v Realtime evente, ani v logu.
- Vlastnú polohu ukladáme **zaokrúhlenú na mriežku ~500 m** (snap na grid na serveri, nie na klientovi).
- Tabuľka s polohou je cez RLS nečitateľná pre klientov; pristupujú k nej iba `SECURITY DEFINER` RPC funkcie.
- Vzdialenosť počíta **iba server** (PostGIS) a vracia ju zaokrúhlenú do pásiem:
  - `< 1 km`
  - 1–10 km po 1 km
  - nad 10 km po 5 km
- Ochrana proti trilaterácii: minimálne pásmo `< 1 km`, žiadne desatinné čísla, rate limit na aktualizáciu polohy aj na discovery dotazy.
- Používateľ môže zobrazenie svojej vzdialenosti úplne vypnúť.
- Z nahraných fotiek sa pred uploadom odstraňujú EXIF metadáta (vrátane GPS).
- Klient pred odoslaním zaokrúhli súradnice na 3 desatinné miesta a nikde ich neloguje ani neukladá.

Implementácia: `private.user_locations`, `private.snap_to_grid`, `private.distance_bucket_km`,
RPC `update_my_location` / `discover_nearby` / `get_profile` (migrácia `..._init.sql`);
klient `src/features/discovery/location.ts` a `distance.ts`. Nové RPC nesmú vracať stĺpce
s polohou – stráži to test `supabase/tests/01_location_privacy.test.sql`.

### 2. RLS na všetkých tabuľkách
- Každá nová tabuľka má `ALTER TABLE … ENABLE ROW LEVEL SECURITY` **v tej istej migrácii**, kde vzniká.
- Ku každej tabuľke explicitné politiky pre `select / insert / update / delete` – čo nie je povolené, je zakázané.
- Blokovanie sa vynucuje na úrovni RLS: zablokovaní používatelia sa navzájom nevidia v discovery ani v chate.
- Každá politika má pgTAP test v `supabase/tests/`; test `00_rls_enabled` zlyhá pri tabuľke bez RLS.
- K údajom **iných** používateľov (profily, fotky) sa pristupuje iba cez RPC, nie priamym SELECT-om.
- Pozor: stĺpcové `GRANT/REVOKE` platia iba bez tabuľkového grantu (najprv `revoke update on …`).
- Žiadne `SECURITY DEFINER` funkcie bez explicitnej kontroly `auth.uid()` a nastaveného `search_path`.

### 3. UI texty v slovenčine a češtine cez i18n
- **Žiadne natvrdo napísané texty v UI** – všetko cez `t('namespace:key')`. Stráži to ESLint pravidlo `i18next/no-literal-string`.
- Každý kľúč musí existovať v `sk` aj `cs` – kontroluje `src/__tests__/i18n-parity.test.ts`. Kľúče sú typovo kontrolované (`src/types/i18next.d.ts`).
- Nový namespace pridaj do `src/locales/index.ts` pre oba jazyky.
- Systémové texty povolení (iOS) sú v `native-locales/`.
- Množné čísla cez i18next plurály (`_one`, `_few`, `_other`) – SK aj CZ majú tvar pre 2–4.
- Jazyk sa berie zo zariadenia (`expo-localization`), fallback `sk`.
- Dátumy a čísla formátuj cez `Intl` podľa aktívneho jazyka.

## Ďalšie pravidlá súkromia a bezpečnosti
- Fotky v **privátnom** Storage buckete, prístup iba cez podpísané URL s krátkou platnosťou.
- Do logov, crash reportov ani analytiky nesmie ísť: poloha, obsah správ, orientácia, fotky, e-mail/telefón.
- Push notifikácie nesmú prezradiť obsah ani kontext aplikácie na zamknutej obrazovke (napr. „Nová správa“, nie meno a text).
- Zmazanie účtu skutočne maže dáta (vrátane súborov v Storage), nie iba soft-delete.
