-- CTIMER Epic 2: verified ownership and visitor isolation.
-- Non-destructive: existing rows with no owner_id are intentionally retained
-- but become inaccessible through client RLS until they are reviewed.

alter table public.timers
  add column if not exists owner_id uuid null;

alter table public.timers
  add column if not exists owner_is_anonymous boolean not null default false;

create index if not exists idx_timers_owner_id on public.timers(owner_id);

create or replace function public.ctimer_can_access_timer(p_timer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.timers t
    left join public.timer_members m
      on m.timer_id = t.id
     and m.user_id = auth.uid()
    where t.id = p_timer_id
      and t.owner_id is not null
      and (
        t.owner_id = auth.uid()
        or (not t.owner_is_anonymous and m.user_id is not null)
      )
  );
$$;

create or replace function public.ctimer_is_timer_admin(p_timer_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.timers t
    join public.timer_members m on m.timer_id = t.id
    where t.id = p_timer_id
      and t.owner_id is not null
      and m.user_id = auth.uid()
      and m.role = 'admin'
      and public.ctimer_can_access_timer(t.id)
  );
$$;

alter table public.timers enable row level security;
alter table public.timer_messages enable row level security;
alter table public.timer_assets enable row level security;
alter table public.timer_asset_force enable row level security;

drop policy if exists "timers_select_members" on public.timers;
drop policy if exists "timers_select_owner_or_member" on public.timers;
create policy "timers_select_owner_or_member"
on public.timers
for select
to authenticated
using (public.ctimer_can_access_timer(id));

drop policy if exists "messages_select_members" on public.timer_messages;
drop policy if exists "messages_select_owner_or_member" on public.timer_messages;
create policy "messages_select_owner_or_member"
on public.timer_messages
for select
to authenticated
using (public.ctimer_can_access_timer(timer_id));

drop policy if exists "assets_select_members" on public.timer_assets;
drop policy if exists "assets_select_owner_or_member" on public.timer_assets;
create policy "assets_select_owner_or_member"
on public.timer_assets
for select
to authenticated
using (public.ctimer_can_access_timer(timer_id));

drop policy if exists "force_select_members" on public.timer_asset_force;
drop policy if exists "force_select_owner_or_member" on public.timer_asset_force;
create policy "force_select_owner_or_member"
on public.timer_asset_force
for select
to authenticated
using (public.ctimer_can_access_timer(timer_id));

create or replace function public.join_timer(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
  v_owner_id uuid;
  v_owner_is_anonymous boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id, owner_id, owner_is_anonymous
    into v_timer_id, v_owner_id, v_owner_is_anonymous
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null
     or v_owner_id is null
     or (v_owner_is_anonymous and v_owner_id <> auth.uid()) then
    raise exception 'Invalid code';
  end if;

  insert into public.timer_members(timer_id, user_id, role)
  values (v_timer_id, auth.uid(), 'viewer')
  on conflict (timer_id, user_id) do nothing;

  return v_timer_id;
end $$;

create or replace function public.create_timer(
  p_name text,
  p_timezone text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_duration_seconds int,
  p_rotation_seconds int default 10,
  p_sponsor_mode public.sponsor_mode default 'ordered'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_timer_id uuid;
  v_admin_token text;
  v_token_hash text;
  v_owner_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous') = 'true', false);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Name required';
  end if;
  if p_duration_seconds <= 0 then
    raise exception 'Invalid duration';
  end if;
  if p_end_at <= p_start_at then
    raise exception 'end_at must be > start_at';
  end if;
  if coalesce(p_rotation_seconds, 10) not between 3 and 120 then
    raise exception 'Invalid rotation';
  end if;

  for i in 1..10 loop
    v_code := public.generate_timer_code(6);
    exit when not exists (select 1 from public.timers where code = v_code);
  end loop;
  if exists (select 1 from public.timers where code = v_code) then
    raise exception 'Could not generate unique code';
  end if;

  insert into public.timers(
    code, name, timezone, start_at, end_at, duration_seconds, status,
    sponsor_mode, rotation_seconds, owner_id, owner_is_anonymous
  )
  values (
    v_code, trim(p_name), coalesce(p_timezone, 'UTC'), p_start_at, p_end_at,
    p_duration_seconds, 'scheduled', coalesce(p_sponsor_mode, 'ordered'),
    coalesce(p_rotation_seconds, 10), auth.uid(), v_owner_is_anonymous
  )
  returning id into v_timer_id;

  v_admin_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := public.hash_admin_token(v_admin_token);
  insert into public.timer_admin_tokens(timer_id, token_hash)
  values (v_timer_id, v_token_hash);
  insert into public.timer_messages(timer_id, text) values (v_timer_id, null);
  insert into public.timer_asset_force(timer_id, active) values (v_timer_id, false);
  insert into public.timer_members(timer_id, user_id, role)
  values (v_timer_id, auth.uid(), 'admin')
  on conflict (timer_id, user_id) do update set role = 'admin';

  return json_build_object('code', v_code, 'admin_token', v_admin_token, 'timer_id', v_timer_id);
end $$;

create or replace function public.admin_join_timer(p_code text, p_admin_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
  v_owner_id uuid;
  v_owner_is_anonymous boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  select id, owner_id, owner_is_anonymous
    into v_timer_id, v_owner_id, v_owner_is_anonymous
  from public.timers
  where code = upper(trim(p_code))
  limit 1;
  if v_timer_id is null or v_owner_id is null
     or (v_owner_is_anonymous and v_owner_id <> auth.uid()) then
    raise exception 'Invalid code';
  end if;
  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;
  insert into public.timer_members(timer_id, user_id, role)
  values (v_timer_id, auth.uid(), 'admin')
  on conflict (timer_id, user_id) do update set role = 'admin';
  return v_timer_id;
end $$;

create or replace function public.list_my_timers(
  p_limit int default 12,
  p_offset int default 0
)
returns table (
  id uuid, code text, name text, timezone text, start_at timestamptz,
  end_at timestamptz, duration_seconds int, status public.timer_status,
  paused_remaining_seconds int, paused_at timestamptz,
  sponsor_mode public.sponsor_mode, rotation_seconds int,
  created_at timestamptz, updated_at timestamptz,
  member_role public.timer_member_role, member_joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.code, t.name, t.timezone, t.start_at, t.end_at,
    t.duration_seconds, t.status, t.paused_remaining_seconds, t.paused_at,
    t.sponsor_mode, t.rotation_seconds, t.created_at, t.updated_at,
    m.role, m.joined_at
  from public.timer_members m
  join public.timers t on t.id = m.timer_id
  where auth.uid() is not null
    and m.user_id = auth.uid()
    and public.ctimer_can_access_timer(t.id)
  order by m.joined_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- No direct client writes are granted. Existing RPC-only writes remain the
-- supported mutation path, and all direct INSERT/UPDATE/DELETE attempts fail.
revoke execute on function public.create_timer(text, text, timestamptz, timestamptz, integer, integer, public.sponsor_mode) from public;
revoke execute on function public.join_timer(text) from public;
revoke execute on function public.admin_join_timer(text, text) from public;
revoke execute on function public.list_my_timers(integer, integer) from public;
revoke execute on function public.verify_admin_token(uuid, text) from public;
revoke execute on function public.admin_action(text, text, text) from public;
revoke execute on function public.admin_update_schedule(text, text, text, timestamptz, timestamptz, integer) from public;
revoke execute on function public.admin_set_message(text, text, text) from public;
revoke execute on function public.admin_set_sponsor_settings(text, text, public.sponsor_mode, integer) from public;
revoke execute on function public.admin_set_sponsor_mode(text, text, public.sponsor_mode, integer) from public;
revoke execute on function public.admin_add_asset(text, text, text, boolean, integer) from public;
revoke execute on function public.admin_toggle_asset(text, text, uuid, boolean) from public;
revoke execute on function public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text) from public;
revoke execute on function public.admin_delete_asset(text, text, uuid) from public;
revoke execute on function public.admin_force_asset(text, text, uuid, public.force_mode, integer) from public;
revoke execute on function public.admin_clear_force(text, text) from public;
grant execute on function public.create_timer(text, text, timestamptz, timestamptz, integer, integer, public.sponsor_mode) to authenticated;
grant execute on function public.join_timer(text) to authenticated;
grant execute on function public.admin_join_timer(text, text) to authenticated;
grant execute on function public.list_my_timers(integer, integer) to authenticated;
grant execute on function public.verify_admin_token(uuid, text) to authenticated;
grant execute on function public.admin_action(text, text, text) to authenticated;
grant execute on function public.admin_update_schedule(text, text, text, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.admin_set_message(text, text, text) to authenticated;
grant execute on function public.admin_set_sponsor_settings(text, text, public.sponsor_mode, integer) to authenticated;
grant execute on function public.admin_set_sponsor_mode(text, text, public.sponsor_mode, integer) to authenticated;
grant execute on function public.admin_add_asset(text, text, text, boolean, integer) to authenticated;
grant execute on function public.admin_toggle_asset(text, text, uuid, boolean) to authenticated;
grant execute on function public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text) to authenticated;
grant execute on function public.admin_delete_asset(text, text, uuid) to authenticated;
grant execute on function public.admin_force_asset(text, text, uuid, public.force_mode, integer) to authenticated;
grant execute on function public.admin_clear_force(text, text) to authenticated;
grant execute on function public.ctimer_can_access_timer(uuid) to authenticated;
grant execute on function public.ctimer_is_timer_admin(uuid) to authenticated;

notify pgrst, 'reload schema';
