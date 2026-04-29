-- =========================================================
-- CTIMER (MVP) - Supabase Schema v1
-- Next.js + Supabase (Postgres + Realtime)
-- =========================================================

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Enums
do $$ begin
  create type public.timer_status as enum ('scheduled', 'paused', 'ended');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.timer_member_role as enum ('viewer', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sponsor_mode as enum ('ordered', 'random');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.force_mode as enum ('timed', 'hold');
exception when duplicate_object then null;
end $$;

-- 2) Helpers
-- 2.1) Generate a 6-char code (without confusing chars)
create or replace function public.generate_timer_code(p_len int default 6)
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int := 0;
  b bytea;
  idx int;
begin
  if p_len < 4 then
    raise exception 'p_len too short';
  end if;

  while i < p_len loop
    b := extensions.gen_random_bytes(1);
    idx := (get_byte(b, 0) % length(alphabet)) + 1;
    result := result || substr(alphabet, idx, 1);
    i := i + 1;
  end loop;

  return result;
end $$;

-- 2.2) Hash + verify admin token using crypt()
create or replace function public.hash_admin_token(p_token text)
returns text
language sql
as $$
  select extensions.crypt(p_token, extensions.gen_salt('bf'));
$$;

create or replace function public.verify_admin_token(p_timer_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.timer_admin_tokens t
    where t.timer_id = p_timer_id
      and extensions.crypt(p_token, t.token_hash) = t.token_hash
  );
end $$;

-- 3) Tables
-- 3.1) timers
create table if not exists public.timers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,

  timezone text not null default 'UTC',

  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_seconds int not null check (duration_seconds > 0),

  status public.timer_status not null default 'scheduled',

  -- pause support
  paused_remaining_seconds int null check (paused_remaining_seconds is null or paused_remaining_seconds >= 0),
  paused_at timestamptz null,

  -- sponsors
  sponsor_mode public.sponsor_mode not null default 'ordered',
  rotation_seconds int not null default 10 check (rotation_seconds between 3 and 120),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_timers_code on public.timers(code);

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_timers_updated_at on public.timers;
create trigger trg_timers_updated_at
before update on public.timers
for each row execute function public.set_updated_at();

-- 3.2) timer_admin_tokens (never readable by clients)
create table if not exists public.timer_admin_tokens (
  timer_id uuid primary key references public.timers(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

-- 3.3) timer_members (RLS gate for reads + realtime)
create table if not exists public.timer_members (
  id uuid primary key default gen_random_uuid(),
  timer_id uuid not null references public.timers(id) on delete cascade,
  user_id uuid not null, -- references auth.users(id) logically
  role public.timer_member_role not null default 'viewer',
  joined_at timestamptz not null default now(),
  unique(timer_id, user_id)
);

create index if not exists idx_timer_members_timer on public.timer_members(timer_id);
create index if not exists idx_timer_members_user on public.timer_members(user_id);

create or replace function public.ctimer_is_timer_member(p_timer_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.timer_members m
    where m.timer_id = p_timer_id
      and m.user_id = auth.uid()
  );
$$;

-- 3.4) timer_messages (single active message per timer)
create table if not exists public.timer_messages (
  timer_id uuid primary key references public.timers(id) on delete cascade,
  text text null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_timer_messages_updated_at on public.timer_messages;
create trigger trg_timer_messages_updated_at
before update on public.timer_messages
for each row execute function public.set_updated_at();

-- 3.5) timer_assets (images only)
create table if not exists public.timer_assets (
  id uuid primary key default gen_random_uuid(),
  timer_id uuid not null references public.timers(id) on delete cascade,
  url text not null,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_timer_assets_timer on public.timer_assets(timer_id);
create index if not exists idx_timer_assets_enabled on public.timer_assets(timer_id, enabled);

-- 3.6) timer_asset_force (force state per timer)
create table if not exists public.timer_asset_force (
  timer_id uuid primary key references public.timers(id) on delete cascade,
  active boolean not null default false,
  asset_id uuid null references public.timer_assets(id) on delete set null,
  mode public.force_mode null,
  until_at timestamptz null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_timer_asset_force_updated_at on public.timer_asset_force;
create trigger trg_timer_asset_force_updated_at
before update on public.timer_asset_force
for each row execute function public.set_updated_at();

-- 4) RLS
alter table public.timers enable row level security;
alter table public.timer_members enable row level security;
alter table public.timer_admin_tokens enable row level security;
alter table public.timer_messages enable row level security;
alter table public.timer_assets enable row level security;
alter table public.timer_asset_force enable row level security;

-- Deny by default: no policies = no access.
-- We'll allow SELECT only to members of that timer.

-- 4.1) timers SELECT for members
drop policy if exists "timers_select_members" on public.timers;
create policy "timers_select_members"
on public.timers
for select
to authenticated
using (public.ctimer_is_timer_member(timers.id));

-- 4.2) messages/assets/force SELECT for members
drop policy if exists "messages_select_members" on public.timer_messages;
create policy "messages_select_members"
on public.timer_messages
for select
to authenticated
using (public.ctimer_is_timer_member(timer_messages.timer_id));

drop policy if exists "assets_select_members" on public.timer_assets;
create policy "assets_select_members"
on public.timer_assets
for select
to authenticated
using (public.ctimer_is_timer_member(timer_assets.timer_id));

drop policy if exists "force_select_members" on public.timer_asset_force;
create policy "force_select_members"
on public.timer_asset_force
for select
to authenticated
using (public.ctimer_is_timer_member(timer_asset_force.timer_id));

-- 4.3) timer_members: deny direct access (use RPC)
-- (no select policy, no insert policy) => clients cannot list/insert memberships directly.

-- 4.4) admin tokens: deny all direct access
-- (no policies)

-- 5) RPCs (Security Definer)
-- IMPORTANT: All writes happen via RPC. Client must be authenticated (anon ok).

-- 5.1) Server time
create or replace function public.get_server_time()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select now();
$$;

-- 5.2) Join timer as viewer (by code)
create or replace function public.join_timer(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  -- Insert membership if not exists
  insert into public.timer_members(timer_id, user_id, role)
  values (v_timer_id, auth.uid(), 'viewer')
  on conflict (timer_id, user_id) do nothing;

  return v_timer_id;
end $$;

-- 5.3) Create timer (returns code + admin_token)
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_duration_seconds <= 0 then
    raise exception 'Invalid duration';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'end_at must be > start_at';
  end if;

  -- Generate unique code (retry few times)
  for i in 1..10 loop
    v_code := public.generate_timer_code(6);
    exit when not exists (select 1 from public.timers where code = v_code);
  end loop;

  if exists (select 1 from public.timers where code = v_code) then
    raise exception 'Could not generate unique code';
  end if;

  insert into public.timers(
    code, name, timezone,
    start_at, end_at, duration_seconds,
    status,
    sponsor_mode, rotation_seconds
  )
  values (
    v_code, p_name, coalesce(p_timezone,'UTC'),
    p_start_at, p_end_at, p_duration_seconds,
    'scheduled',
    p_sponsor_mode, coalesce(p_rotation_seconds,10)
  )
  returning id into v_timer_id;

  -- Create admin token (return once)
  v_admin_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := public.hash_admin_token(v_admin_token);

  insert into public.timer_admin_tokens(timer_id, token_hash)
  values (v_timer_id, v_token_hash);

  -- Initialize single-row message + force state
  insert into public.timer_messages(timer_id, text) values (v_timer_id, null);
  insert into public.timer_asset_force(timer_id, active) values (v_timer_id, false);

  -- Admin becomes member (for SELECT + Realtime)
  insert into public.timer_members(timer_id, user_id, role)
  values (v_timer_id, auth.uid(), 'admin')
  on conflict (timer_id, user_id) do update set role = 'admin';

  return json_build_object(
    'code', v_code,
    'admin_token', v_admin_token,
    'timer_id', v_timer_id
  );
end $$;

-- 5.4) Admin join from another device (token -> admin membership)
create or replace function public.admin_join_timer(p_code text, p_admin_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
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

-- 5.5) Admin actions: start/pause/resume/reset/end
create or replace function public.admin_action(
  p_code text,
  p_admin_token text,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer public.timers%rowtype;
  v_now timestamptz := now();
  v_remaining int;
begin
  select * into v_timer
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer.id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer.id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  if v_timer.status = 'ended' and p_action <> 'reset' then
    raise exception 'Timer ended';
  end if;

  -- Compute remaining if needed (based on schedule)
  v_remaining := greatest(extract(epoch from (v_timer.end_at - v_now))::int, 0);

  if p_action = 'start' then
    -- Manual override: start now for full duration
    update public.timers
    set status = 'scheduled',
        paused_remaining_seconds = null,
        paused_at = null,
        start_at = v_now,
        end_at = v_now + make_interval(secs => v_timer.duration_seconds)
    where id = v_timer.id;

  elsif p_action = 'pause' then
    -- Pause only if currently "running" by schedule (between start and end)
    if not (v_now >= v_timer.start_at and v_now < v_timer.end_at) then
      raise exception 'Not running';
    end if;

    update public.timers
    set status = 'paused',
        paused_remaining_seconds = v_remaining,
        paused_at = v_now
    where id = v_timer.id;

  elsif p_action = 'resume' then
    if v_timer.status <> 'paused' then
      raise exception 'Not paused';
    end if;

    if v_timer.paused_remaining_seconds is null then
      raise exception 'Missing paused remaining';
    end if;

    update public.timers
    set status = 'scheduled',
        start_at = v_now,
        end_at = v_now + make_interval(secs => v_timer.paused_remaining_seconds),
        paused_remaining_seconds = null,
        paused_at = null
    where id = v_timer.id;

  elsif p_action = 'reset' then
    -- Reset: restart now with full duration
    update public.timers
    set status = 'scheduled',
        start_at = v_now,
        end_at = v_now + make_interval(secs => v_timer.duration_seconds),
        paused_remaining_seconds = null,
        paused_at = null
    where id = v_timer.id;

  elsif p_action = 'end' then
    -- End session (cancelar = terminar sesión)
    update public.timers
    set status = 'ended'
    where id = v_timer.id;

  else
    raise exception 'Unknown action';
  end if;
end $$;

-- 5.6) Update schedule (start/end/duration/timezone) - last edited wins handled in frontend
create or replace function public.admin_update_schedule(
  p_code text,
  p_admin_token text,
  p_timezone text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_duration_seconds int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
begin
  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  if p_duration_seconds <= 0 then
    raise exception 'Invalid duration';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'end_at must be > start_at';
  end if;

  update public.timers
  set timezone = coalesce(p_timezone, timezone),
      start_at = p_start_at,
      end_at = p_end_at,
      duration_seconds = p_duration_seconds
  where id = v_timer_id;
end $$;

-- 5.7) Message (single active)
create or replace function public.admin_set_message(
  p_code text,
  p_admin_token text,
  p_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
begin
  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  update public.timer_messages
  set text = p_text
  where timer_id = v_timer_id;
end $$;

-- 5.8) Sponsor mode + rotation seconds
create or replace function public.admin_set_sponsor_settings(
  p_code text,
  p_admin_token text,
  p_mode public.sponsor_mode,
  p_rotation_seconds int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
begin
  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  update public.timers
  set sponsor_mode = coalesce(p_mode, sponsor_mode),
      rotation_seconds = coalesce(p_rotation_seconds, rotation_seconds)
  where id = v_timer_id;
end $$;

-- 5.9) Assets (MVP: URL-based)
create or replace function public.admin_add_asset(
  p_code text,
  p_admin_token text,
  p_url text,
  p_enabled boolean default true,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
  v_asset_id uuid;
begin
  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  insert into public.timer_assets(timer_id, url, enabled, sort_order)
  values (v_timer_id, p_url, coalesce(p_enabled,true), coalesce(p_sort_order,0))
  returning id into v_asset_id;

  return v_asset_id;
end $$;

create or replace function public.admin_toggle_asset(
  p_code text,
  p_admin_token text,
  p_asset_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
begin
  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  update public.timer_assets
  set enabled = p_enabled
  where id = p_asset_id
    and timer_id = v_timer_id;
end $$;

-- 5.10) Force asset (timed or hold)
create or replace function public.admin_force_asset(
  p_code text,
  p_admin_token text,
  p_asset_id uuid,
  p_mode public.force_mode,
  p_seconds int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
  v_now timestamptz := now();
  v_until timestamptz;
begin
  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  if p_mode = 'timed' then
    if p_seconds is null or p_seconds <= 0 then
      raise exception 'seconds required for timed force';
    end if;
    v_until := v_now + make_interval(secs => p_seconds);
  else
    v_until := null;
  end if;

  update public.timer_asset_force
  set active = true,
      asset_id = p_asset_id,
      mode = p_mode,
      until_at = v_until
  where timer_id = v_timer_id;
end $$;

create or replace function public.admin_clear_force(
  p_code text,
  p_admin_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
begin
  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  update public.timer_asset_force
  set active = false,
      asset_id = null,
      mode = null,
      until_at = null
  where timer_id = v_timer_id;
end $$;

-- =========================================================
-- End schema
-- =========================================================

-- =========================================================
-- CTIMER MVP incremental compatibility layer
-- Adds Realtime publication, storage bucket policies and RPC aliases
-- required by the application contract without changing the locked timer model.
-- =========================================================

-- Realtime tables used by admin/viewer screens.
do $$ begin
  alter publication supabase_realtime add table public.timers;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.timer_messages;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.timer_assets;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.timer_asset_force;
exception when duplicate_object then null;
end $$;

-- Compatibility RPC expected by the app plan.
create or replace function public.admin_set_sponsor_mode(
  p_code text,
  p_admin_token text,
  p_mode public.sponsor_mode,
  p_rotation_seconds int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_set_sponsor_settings(
    p_code,
    p_admin_token,
    p_mode,
    p_rotation_seconds
  );
end $$;

-- Upsert sponsor image metadata. Insert when p_asset_id is null; otherwise
-- update only the matching asset belonging to the authenticated timer admin.
create or replace function public.admin_upsert_asset(
  p_code text,
  p_admin_token text,
  p_asset_id uuid default null,
  p_url text default null,
  p_enabled boolean default true,
  p_sort_order int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
  v_asset_id uuid;
begin
  select id into v_timer_id
  from public.timers
  where code = upper(trim(p_code))
  limit 1;

  if v_timer_id is null then
    raise exception 'Invalid code';
  end if;

  if not public.verify_admin_token(v_timer_id, p_admin_token) then
    raise exception 'Invalid admin token';
  end if;

  if p_asset_id is null then
    if p_url is null or length(trim(p_url)) = 0 then
      raise exception 'url required';
    end if;

    insert into public.timer_assets(timer_id, url, enabled, sort_order)
    values (v_timer_id, trim(p_url), coalesce(p_enabled, true), coalesce(p_sort_order, 0))
    returning id into v_asset_id;

    return v_asset_id;
  end if;

  update public.timer_assets
  set url = coalesce(nullif(trim(coalesce(p_url, '')), ''), url),
      enabled = coalesce(p_enabled, enabled),
      sort_order = coalesce(p_sort_order, sort_order)
  where id = p_asset_id
    and timer_id = v_timer_id
  returning id into v_asset_id;

  if v_asset_id is null then
    raise exception 'Invalid asset';
  end if;

  return v_asset_id;
end $$;

-- Public sponsor image bucket. Object paths are expected to start with
-- the timer UUID, e.g. "<timer_id>/<file-name>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ctimer-sponsors',
  'ctimer-sponsors',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.ctimer_storage_timer_id(p_name text)
returns uuid
language plpgsql
stable
as $$
declare
  v_first_folder text;
begin
  v_first_folder := (storage.foldername(p_name))[1];
  return v_first_folder::uuid;
exception when others then
  return null;
end $$;

create or replace function public.ctimer_is_timer_admin(p_timer_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.timer_members m
    where m.timer_id = p_timer_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

drop policy if exists "ctimer_sponsors_public_select" on storage.objects;
create policy "ctimer_sponsors_public_select"
on storage.objects
for select
to public
using (bucket_id = 'ctimer-sponsors');

drop policy if exists "ctimer_sponsors_admin_insert" on storage.objects;
create policy "ctimer_sponsors_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ctimer-sponsors'
  and public.ctimer_is_timer_admin(public.ctimer_storage_timer_id(name))
);

drop policy if exists "ctimer_sponsors_admin_update" on storage.objects;
create policy "ctimer_sponsors_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ctimer-sponsors'
  and public.ctimer_is_timer_admin(public.ctimer_storage_timer_id(name))
)
with check (
  bucket_id = 'ctimer-sponsors'
  and public.ctimer_is_timer_admin(public.ctimer_storage_timer_id(name))
);

drop policy if exists "ctimer_sponsors_admin_delete" on storage.objects;
create policy "ctimer_sponsors_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ctimer-sponsors'
  and public.ctimer_is_timer_admin(public.ctimer_storage_timer_id(name))
);

-- Force PostgREST/Supabase API to reload function signatures after running
-- this file in SQL Editor, so /rest/v1/rpc/* sees newly created RPCs.
notify pgrst, 'reload schema';
