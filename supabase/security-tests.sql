-- CTIMER Epic 2 - RLS verification checklist.
-- Run each block from a client session authenticated as the indicated user.
-- Never run these checks with a service-role key: it bypasses RLS by design.

select auth.uid() as current_user_id,
       auth.role() as current_role,
       auth.jwt() ->> 'is_anonymous' as is_anonymous;

-- Only rows authorized for the current identity may be listed.
select * from public.list_my_timers(100, 0);

-- Replace with another user's timer UUID; this must return zero rows.
select id, owner_id, owner_is_anonymous
from public.timers
where id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Direct writes must fail with RLS. These blocks are intentionally rolled back.
begin;
update public.timers set name = name
where id = '00000000-0000-0000-0000-000000000000'::uuid;
rollback;

begin;
delete from public.timers
where id = '00000000-0000-0000-0000-000000000000'::uuid;
rollback;

-- Visitor A/B scenario:
-- 1. Create a timer in anonymous browser A.
-- 2. Run join_timer with its code from anonymous browser B.
-- 3. It must fail with "Invalid code" and B must not list A's timer.
-- 4. Repeat with two permanent accounts to verify code-based viewers remain
--    available for the intended multi-viewer event workflow.

-- Realtime scenario: keep A and B subscribed, mutate one timer through its
-- admin RPC, and verify only the authorized timer session receives the event.
