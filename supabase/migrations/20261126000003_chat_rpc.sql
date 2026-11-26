-- =============================================================================
-- Yorky – RPC pre zoznam konverzácií a hlavičku chatu
--
-- Meno druhej strany sa podľa CLAUDE.md číta iba cez SECURITY DEFINER RPC.
-- Funkcia nevracia polohu ani vzdialenosť a vynecháva blokované konverzácie
-- (oboma smermi cez private.is_conversation_member / is_blocked_with).
-- =============================================================================

-- Moje konverzácie s menom druhej strany, náhľadom poslednej správy a počtom
-- neprečítaných. S p_conversation_id vráti iba danú konverzáciu (hlavička chatu).
create or replace function public.list_conversations(p_conversation_id uuid default null)
returns table (
  conversation_id uuid,
  user_id uuid,
  display_name text,
  last_message_body text,
  last_message_from_me boolean,
  last_message_at timestamptz,
  unread_count integer
)
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

  return query
  select
    c.id,
    p.id,
    p.display_name,
    left(last_msg.body, 120),
    last_msg.sender_id = uid,
    c.last_message_at,
    (select count(*)::integer from public.messages m
      where m.conversation_id = c.id and m.sender_id <> uid and m.read_at is null)
  from public.conversations c
  join public.profiles p on p.id = case when c.user_a = uid then c.user_b else c.user_a end
  left join lateral (
    select m.body, m.sender_id from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) last_msg on true
  where uid in (c.user_a, c.user_b)
    and not private.is_blocked_with(p.id)
    and (p_conversation_id is null or c.id = p_conversation_id)
  order by c.last_message_at desc nulls last, c.created_at desc
  limit 200;
end;
$$;

revoke all on function public.list_conversations(uuid) from public, anon;
grant execute on function public.list_conversations(uuid) to authenticated;
