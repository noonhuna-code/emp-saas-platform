-- ============================================
-- Migration: 88_auth_rate_limit_tenant_attribution.sql
-- Purpose: Add nullable tenant attribution to auth rate limits
-- Scope: Column add, constraint update, indexes, RPC update, view refresh
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

alter table public.auth_rate_limits
  add column if not exists company_id uuid null references public.companies(id) on delete restrict;

alter table public.auth_rate_limits
  drop constraint if exists auth_rate_limits_unique;

alter table public.auth_rate_limits
  add constraint auth_rate_limits_unique
  unique (company_id, identifier_type, identifier_hash, window_start);

create index if not exists idx_auth_rate_limits_company_window
  on public.auth_rate_limits (company_id, window_start);

-- Preserve pre-auth uniqueness when company_id is null.
create unique index if not exists auth_rate_limits_null_company_uniq
  on public.auth_rate_limits (identifier_type, identifier_hash, window_start)
  where company_id is null;

create or replace function public.auth_rate_limit_check(
  p_identifier_type text,
  p_identifier_hash text,
  p_window_seconds integer,
  p_max_attempts integer,
  p_lock_minutes integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_window_start timestamptz;
  v_attempt_count integer;
  v_lock_level integer;
  v_locked_until timestamptz;
  v_now timestamptz := now();
  v_lock_minutes integer;
  v_rowcount integer;
begin
  if p_identifier_type is null
     or p_identifier_hash is null
     or p_window_seconds is null
     or p_max_attempts is null
     or p_lock_minutes is null then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMIT_INVALID';
  end if;

  if p_window_seconds <= 0 or p_max_attempts <= 0 or p_lock_minutes <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMIT_INVALID';
  end if;

  if p_identifier_type not in ('ip', 'email') then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMIT_INVALID';
  end if;

  if auth.uid() is not null then
    select up.company_id
      into v_company_id
      from public.user_profiles up
     where up.user_id = auth.uid()
       and up.is_deleted = false
     limit 1;
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  if v_company_id is null then
    insert into public.auth_rate_limits (
      company_id,
      identifier_type,
      identifier_hash,
      window_start,
      attempt_count,
      locked_until,
      lock_level,
      created_at,
      updated_at
    ) values (
      null,
      p_identifier_type,
      p_identifier_hash,
      v_window_start,
      1,
      null,
      0,
      v_now,
      v_now
    )
    on conflict (identifier_type, identifier_hash, window_start) do update
      set attempt_count = public.auth_rate_limits.attempt_count + 1,
          updated_at = v_now
    returning attempt_count, lock_level, locked_until
      into v_attempt_count, v_lock_level, v_locked_until;
  else
    insert into public.auth_rate_limits (
      company_id,
      identifier_type,
      identifier_hash,
      window_start,
      attempt_count,
      locked_until,
      lock_level,
      created_at,
      updated_at
    ) values (
      v_company_id,
      p_identifier_type,
      p_identifier_hash,
      v_window_start,
      1,
      null,
      0,
      v_now,
      v_now
    )
    on conflict (company_id, identifier_type, identifier_hash, window_start) do update
      set attempt_count = public.auth_rate_limits.attempt_count + 1,
          updated_at = v_now
    returning attempt_count, lock_level, locked_until
      into v_attempt_count, v_lock_level, v_locked_until;
  end if;

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMIT_INVALID';
  end if;

  if v_attempt_count >= p_max_attempts then
    v_lock_level := v_lock_level + 1;
    v_lock_minutes := (p_lock_minutes * power(2, v_lock_level))::int;
    if v_lock_minutes > 1440 then
      v_lock_minutes := 1440;
    end if;

    v_locked_until := v_now + make_interval(mins => v_lock_minutes);

    if v_company_id is null then
      update public.auth_rate_limits
         set lock_level = v_lock_level,
             locked_until = v_locked_until,
             updated_at = v_now
       where company_id is null
         and identifier_type = p_identifier_type
         and identifier_hash = p_identifier_hash
         and window_start = v_window_start;
    else
      update public.auth_rate_limits
         set lock_level = v_lock_level,
             locked_until = v_locked_until,
             updated_at = v_now
       where company_id = v_company_id
         and identifier_type = p_identifier_type
         and identifier_hash = p_identifier_hash
         and window_start = v_window_start;
    end if;

    get diagnostics v_rowcount = row_count;
    if v_rowcount <> 1 then
      raise exception using
        errcode = 'P0001',
        message = 'RATE_LIMIT_INVALID';
    end if;
  end if;

  if v_locked_until is not null and v_locked_until > v_now then
    raise exception using
      errcode = 'P0001',
      message = 'AUTH_RATE_LIMITED';
  end if;

  return jsonb_build_object(
    'attempt_count', v_attempt_count,
    'locked_until', v_locked_until
  );
end;
$$;

create or replace view public.v_auth_lock_events_24h as
select
  company_id,
  count(*)::integer as lock_count,
  max(locked_until) as last_lock_at
from public.auth_rate_limits
where company_id = public.current_user_company_id()
  and locked_until is not null
  and locked_until > now()
  and window_start >= now() - interval '24 hours'
group by company_id;
