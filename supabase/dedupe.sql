-- Run ONCE in the Supabase SQL editor to remove repeated guests that already exist, then prevent new ones.
-- Keeps, for each (event, phone), the guest that has RSVPs (otherwise the oldest) and merges invitations.

-- 1) Merge invitations into the guest we keep.
with ranked as (
  select g.id, g.event_id, g.phone,
         row_number() over (
           partition by g.event_id, g.phone
           order by (select count(*) from public.rsvps r where r.guest_id = g.id) desc, g.created_at asc, g.id asc
         ) as rn
  from public.guests g
  where g.phone is not null
), merged as (
  select k.id as keep_id,
         (select array_agg(distinct e) from public.guests x, unnest(x.invited) e
           where x.event_id = k.event_id and x.phone = k.phone) as invited
  from ranked k where k.rn = 1
)
update public.guests g set invited = m.invited from merged m where g.id = m.keep_id and m.invited is not null;

-- 2) Delete the repeats (their RSVP rows are removed by the cascade; the kept guest's RSVPs stay).
delete from public.guests g using (
  select id from (
    select g2.id,
           row_number() over (
             partition by g2.event_id, g2.phone
             order by (select count(*) from public.rsvps r where r.guest_id = g2.id) desc, g2.created_at asc, g2.id asc
           ) as rn
    from public.guests g2 where g2.phone is not null
  ) t where t.rn > 1
) d where g.id = d.id;

-- 3) From now on the database itself refuses the same phone number twice in one event.
create unique index if not exists guests_event_phone_uniq on public.guests (event_id, phone) where phone is not null;
