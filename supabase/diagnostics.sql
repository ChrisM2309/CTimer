-- CTIMER diagnostics
-- Run this in Supabase SQL Editor after supabase/schema.sql.

notify pgrst, 'reload schema';

select
  'tables' as check_type,
  table_name as name,
  'ok' as status
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'timers',
    'timer_admin_tokens',
    'timer_members',
    'timer_messages',
    'timer_assets',
    'timer_asset_force'
  )

union all

select
  'extensions' as check_type,
  'pgcrypto functions' as name,
  case
    when to_regprocedure('extensions.gen_random_bytes(integer)') is not null
      and to_regprocedure('extensions.crypt(text,text)') is not null
      and to_regprocedure('extensions.gen_salt(text)') is not null
    then 'ok'
    else 'missing pgcrypto in extensions schema'
  end as status

union all

select
  'rpcs' as check_type,
  p.proname as name,
  pg_get_function_identity_arguments(p.oid) as status
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_server_time',
    'ctimer_is_timer_member',
    'ctimer_is_timer_admin',
    'create_timer',
    'join_timer',
    'admin_join_timer',
    'admin_action',
    'admin_update_schedule',
    'admin_set_message',
    'admin_add_asset',
    'admin_toggle_asset',
    'admin_set_sponsor_settings',
    'admin_set_sponsor_mode',
    'admin_upsert_asset',
    'admin_force_asset',
    'admin_clear_force'
  )
order by check_type, name;
