# Yorky

Mobilná zoznamka pre gay, bi a queer mužov na Slovensku a v Česku – progresívna webová aplikácia (PWA).
Pravidlá projektu, architektúra a konvencie sú v [CLAUDE.md](./CLAUDE.md).

## Požiadavky

- Node.js 22+
- Docker (pre lokálny Supabase cez `supabase start`)
- Účty: Supabase, Stripe, Vercel

## Spustenie

```bash
npm install
cp .env.example .env.local      # doplň hodnoty (súbor nikdy necommituj)
npx supabase start              # lokálny Supabase (Docker)
npx supabase db reset           # aplikuje migrácie
npm run db:types                # pregeneruje src/types/database.ts
npm run dev                     # http://localhost:3000
```

VAPID kľúče pre Web Push vygeneruješ napr. cez `npx web-push generate-vapid-keys`.

## Kontroly

| Príkaz | Čo robí |
|---|---|
| `npm run check` | lint + typecheck + Vitest |
| `npm run build` | produkčný build |
| `npm run test:e2e` | Playwright na mobilnom viewporte (nad buildom) |
| `npm run test:db` | pgTAP testy RLS a RPC (cez `supabase start`) |
| `npm run test:db:local` | to isté bez Dockeru (lokálny Postgres + PostGIS + pgTAP) |

## Nasadenie

- **Vercel** – aplikácia. Premenné prostredia podľa `.env.example`; tajné bez prefixu `NEXT_PUBLIC_`.
- **Supabase** – migrácie (`npx supabase db push`) a Edge Functions:

```bash
npx supabase functions deploy delete-account
```

```bash
npx supabase secrets set STRIPE_SECRET_KEY=...
```
