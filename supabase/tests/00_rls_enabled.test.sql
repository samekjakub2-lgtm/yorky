-- Pravidlo 2: každá tabuľka v public a private musí mať zapnuté RLS.
begin;
select plan(1);

select is(
  (select array_agg(n.nspname || '.' || c.relname order by 1)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('public', 'private')
      and not c.relrowsecurity),
  null,
  'všetky tabuľky v public a private majú zapnuté RLS'
);

select * from finish();
rollback;
