-- Pravidlo 1: poloha iných používateľov sa nikdy nevracia, iba pásma vzdialenosti.
begin;
select plan(14);

-- Používatelia: A (Bratislava), B (~300 m), C (~5,5 km), D (blokuje A), E (skrytá vzdialenosť),
-- F (inkognito, prémium), G (> 100 km)
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'), ('00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-00000000000e'), ('00000000-0000-0000-0000-00000000000f'),
  ('00000000-0000-0000-0000-000000000001');
insert into public.entitlements (user_id, is_premium) values ('00000000-0000-0000-0000-00000000000f', true);
insert into public.profiles (id, display_name, birth_date, hide_distance, is_incognito) values
  ('00000000-0000-0000-0000-00000000000a', 'A', '1990-01-01', false, false),
  ('00000000-0000-0000-0000-00000000000b', 'B', '1992-01-01', false, false),
  ('00000000-0000-0000-0000-00000000000c', 'C', '1993-01-01', false, false),
  ('00000000-0000-0000-0000-00000000000d', 'D', '1994-01-01', false, false),
  ('00000000-0000-0000-0000-00000000000e', 'E', '1995-01-01', true, false),
  ('00000000-0000-0000-0000-00000000000f', 'F', '1996-01-01', false, true),
  ('00000000-0000-0000-0000-000000000001', 'G', '1997-01-01', false, false);
insert into private.user_locations (user_id, location) values
  ('00000000-0000-0000-0000-00000000000b', private.snap_to_grid(48.1513, 17.1077)),
  ('00000000-0000-0000-0000-00000000000c', private.snap_to_grid(48.1986, 17.1077)),
  ('00000000-0000-0000-0000-00000000000d', private.snap_to_grid(48.1486, 17.1077)),
  ('00000000-0000-0000-0000-00000000000e', private.snap_to_grid(48.1486, 17.1100)),
  ('00000000-0000-0000-0000-00000000000f', private.snap_to_grid(48.1486, 17.1077)),
  ('00000000-0000-0000-0000-000000000001', private.snap_to_grid(50.0755, 14.4378)); -- Praha
insert into public.blocks (blocker_id, blocked_id) values
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000a');

-- Prihlásený ako A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

select lives_ok($$ select public.update_my_location(48.14861234, 17.10771234) $$, 'A uloží polohu');

select throws_ok($$ select * from private.user_locations $$, '42501', null,
  'klient nemá prístup k tabuľke polôh');
select throws_ok($$ select private.snap_to_grid(1, 1) $$, '42501', null,
  'klient nemôže volať privátne helpery');

select is((select count(*)::int from public.discover_nearby()), 3,
  'discovery vráti B, C, E (nie seba, blokujúceho D, inkognito F ani G > 100 km)');
select is((select distance_bucket_km from public.discover_nearby()
            where id = '00000000-0000-0000-0000-00000000000b'), 0::smallint, 'B je v pásme < 1 km');
select is((select distance_bucket_km from public.discover_nearby()
            where id = '00000000-0000-0000-0000-00000000000c'), 5::smallint, 'C je v pásme 5 km');
select is((select distance_bucket_km from public.discover_nearby()
            where id = '00000000-0000-0000-0000-00000000000e'), null::smallint,
  'E so skrytou vzdialenosťou nemá pásmo');
select is((select distance_bucket_km from public.get_profile('00000000-0000-0000-0000-00000000000b')),
  0::smallint, 'get_profile vracia iba pásmo');
select is((select count(*)::int from public.get_profile('00000000-0000-0000-0000-00000000000d')), 0,
  'blokujúci profil nie je dostupný');
select is((select count(*)::int from public.get_profile('00000000-0000-0000-0000-00000000000f')), 0,
  'inkognito profil nie je dostupný');

-- Žiadna RPC funkcia nevracia súradnice / geografiu / presnú vzdialenosť.
reset role;
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.prorettype in ('extensions.geography'::regtype, 'extensions.geometry'::regtype)
        or exists (
          select 1
            from unnest(p.proargnames, p.proargmodes) as a(name, mode)
           where a.mode in ('o', 't', 'b')
             and a.name ~* '(lat|lng|lon|location|geo|meters|coord)'
        )
      )),
  0, 'verejné funkcie nevracajú súradnice ani presnú vzdialenosť');

select ok(
  (select extensions.st_distance(location,
      extensions.st_setsrid(extensions.st_makepoint(17.10771234, 48.14861234), 4326)::extensions.geography) > 0
     from private.user_locations where user_id = '00000000-0000-0000-0000-00000000000a'),
  'uložená poloha je zaokrúhlená (nie presná)');

-- Rate limit: 6 aktualizácií / 10 min (1 už prebehla vyššie)
set local role authenticated;
select lives_ok($$ select public.update_my_location(48.1, 17.1) from generate_series(1, 5) $$,
  'ďalších 5 aktualizácií prejde');
select throws_ok($$ select public.update_my_location(48.1, 17.1) $$, 'P0429', null,
  '7. aktualizácia polohy je zablokovaná rate limitom');

select * from finish();
rollback;
