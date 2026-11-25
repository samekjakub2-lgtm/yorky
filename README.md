# Yorky

Mobilná zoznamka pre gay, bi a queer mužov na Slovensku a v Česku.
Pravidlá projektu, architektúra a konvencie sú v [CLAUDE.md](./CLAUDE.md).

## Požiadavky

- Node.js 22+
- Docker (pre lokálny Supabase cez `supabase start`)
- Účty: Supabase, RevenueCat, Expo/EAS

## Spustenie

```bash
npm install
cp .env.example .env.local      # doplň URL a publishable key
npx supabase start              # lokálny Supabase (Docker)
npx supabase db reset           # aplikuje migrácie
npm run db:types                # pregeneruje src/types/database.ts
npx expo run:ios                # development build (RevenueCat nefunguje v Expo Go)
```

## Kontroly

| Príkaz | Čo robí |
|---|---|
| `npm run check` | lint + typecheck + Jest |
| `npm run test:db` | pgTAP testy RLS a RPC (cez `supabase start`) |
| `npm run test:db:local` | to isté bez Dockeru (lokálny Postgres + PostGIS + pgTAP) |

## Edge Functions – secrets

```bash
npx supabase secrets set REVENUECAT_WEBHOOK_AUTH=... REVENUECAT_SECRET_API_KEY=...
```

V RevenueCat nastav webhook na `https://<projekt>.supabase.co/functions/v1/revenuecat-webhook`
s hlavičkou `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>` a entitlement s ID `premium`.
