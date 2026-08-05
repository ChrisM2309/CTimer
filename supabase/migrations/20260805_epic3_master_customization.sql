-- Epic 3: Master customization.
-- Keeps admin writes RPC-only and leaves timer calculation/synchronization intact.

alter table public.timer_assets
  add column if not exists weight int not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'timer_assets_weight_check'
      and conrelid = 'public.timer_assets'::regclass
  ) then
    alter table public.timer_assets
      add constraint timer_assets_weight_check check (weight between 1 and 10);
  end if;
end $$;

create or replace function public.admin_update_timer_name(
  p_code text,
  p_admin_token text,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
  v_name text := trim(coalesce(p_name, ''));
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

  if length(v_name) = 0 or length(v_name) > 120 then
    raise exception 'Invalid timer name';
  end if;

  update public.timers
  set name = v_name
  where id = v_timer_id;
end $$;

-- Replace the metadata upsert with a compatible version that persists weight.
drop function if exists public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text);

create or replace function public.admin_upsert_asset(
  p_code text,
  p_admin_token text,
  p_asset_id uuid default null,
  p_url text default null,
  p_enabled boolean default true,
  p_sort_order int default 0,
  p_sponsor_name text default null,
  p_sponsor_tier text default null,
  p_weight int default 1
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

  if coalesce(p_weight, 1) not between 1 and 10 then
    raise exception 'Invalid sponsor weight';
  end if;

  if p_asset_id is null then
    if p_url is null or length(trim(p_url)) = 0 then
      raise exception 'url required';
    end if;

    insert into public.timer_assets(
      timer_id, url, enabled, sort_order, sponsor_name, sponsor_tier, weight
    )
    values (
      v_timer_id,
      trim(p_url),
      coalesce(p_enabled, true),
      coalesce(p_sort_order, 0),
      nullif(trim(coalesce(p_sponsor_name, '')), ''),
      nullif(trim(coalesce(p_sponsor_tier, '')), ''),
      coalesce(p_weight, 1)
    )
    returning id into v_asset_id;

    return v_asset_id;
  end if;

  update public.timer_assets
  set url = coalesce(nullif(trim(coalesce(p_url, '')), ''), url),
      enabled = coalesce(p_enabled, enabled),
      sort_order = coalesce(p_sort_order, sort_order),
      sponsor_name = coalesce(nullif(trim(coalesce(p_sponsor_name, '')), ''), sponsor_name),
      sponsor_tier = coalesce(nullif(trim(coalesce(p_sponsor_tier, '')), ''), sponsor_tier),
      weight = coalesce(p_weight, weight)
  where id = p_asset_id
    and timer_id = v_timer_id
  returning id into v_asset_id;

  if v_asset_id is null then
    raise exception 'Invalid asset';
  end if;

  return v_asset_id;
end $$;

revoke execute on function public.admin_update_timer_name(text, text, text) from public;
grant execute on function public.admin_update_timer_name(text, text, text) to authenticated;

revoke execute on function public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text, integer) from public;
grant execute on function public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text, integer) to authenticated;

notify pgrst, 'reload schema';
