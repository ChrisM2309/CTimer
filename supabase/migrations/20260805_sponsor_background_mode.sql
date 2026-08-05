-- Per-sponsor background mode for the public Viewer.
-- The value belongs to the asset only; it does not change the Viewer layout.

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

alter table public.timer_assets
  add column if not exists background_mode text not null default 'default';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'timer_assets_background_mode_check'
      and conrelid = 'public.timer_assets'::regclass
  ) then
    alter table public.timer_assets
      add constraint timer_assets_background_mode_check
      check (background_mode in ('default', 'light', 'dark'));
  end if;
end $$;

-- Replace both previous RPC signatures so PostgREST cannot resolve an older
-- overload when the new background_mode parameter is sent by the Master.
drop function if exists public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text);
drop function if exists public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text, integer);

create or replace function public.admin_upsert_asset(
  p_code text,
  p_admin_token text,
  p_asset_id uuid default null,
  p_url text default null,
  p_enabled boolean default true,
  p_sort_order int default 0,
  p_sponsor_name text default null,
  p_sponsor_tier text default null,
  p_weight int default 1,
  p_background_mode text default 'default'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer_id uuid;
  v_asset_id uuid;
  v_background_mode text := lower(trim(coalesce(p_background_mode, 'default')));
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

  if v_background_mode not in ('default', 'light', 'dark') then
    raise exception 'Invalid sponsor background mode';
  end if;

  if p_asset_id is null then
    if p_url is null or length(trim(p_url)) = 0 then
      raise exception 'url required';
    end if;

    insert into public.timer_assets(
      timer_id,
      url,
      enabled,
      sort_order,
      sponsor_name,
      sponsor_tier,
      weight,
      background_mode
    )
    values (
      v_timer_id,
      trim(p_url),
      coalesce(p_enabled, true),
      coalesce(p_sort_order, 0),
      nullif(trim(coalesce(p_sponsor_name, '')), ''),
      nullif(trim(coalesce(p_sponsor_tier, '')), ''),
      coalesce(p_weight, 1),
      v_background_mode
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
      weight = coalesce(p_weight, weight),
      background_mode = v_background_mode
  where id = p_asset_id
    and timer_id = v_timer_id
  returning id into v_asset_id;

  if v_asset_id is null then
    raise exception 'Invalid asset';
  end if;

  return v_asset_id;
end $$;

revoke execute on function public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text, integer, text) from public;
grant execute on function public.admin_upsert_asset(text, text, uuid, text, boolean, integer, text, text, integer, text) to authenticated;

notify pgrst, 'reload schema';
