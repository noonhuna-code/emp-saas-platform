-- ============================================
-- Migration: 80_auth_rate_limit_engine.sql
-- Purpose: Authentication abuse rate limiting (IP/email buckets)
-- Scope: New table, indexes, RLS policies, RPC
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.auth_rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier_type text not null, -- 'ip' | 'email'
  identifier_hash text not null,
  window_start timestamptz not null,
  attempt_count integer not null default 1,
  locked_until timestamptz null,
  lock_level integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_rate_limits_unique unique (identifier_type, identifier_hash, window_start)
);

create index if not exists auth_rate_limits_identifier_idx
  on public.auth_rate_limits (identifier_type, identifier_hash);

create index if not exists auth_rate_limits_window_start_idx
  on public.auth_rate_limits (window_start);

alter table public.auth_rate_limits enable row level security;
alter table public.auth_rate_limits force row level security;

drop policy if exists auth_rate_limits_insert on public.auth_rate_limits;
drop policy if exists auth_rate_limits_update on public.auth_rate_limits;
drop policy if exists auth_rate_limits_select on public.auth_rate_limits;
drop policy if exists auth_rate_limits_delete on public.auth_rate_limits;

-- Allow only anon role to mutate via RPC (no direct selects).
create policy auth_rate_limits_insert on public.auth_rate_limits
  for insert
  with check (coalesce(current_setting('request.jwt.claim.role', true), '') = 'anon');

create policy auth_rate_limits_update on public.auth_rate_limits
  for update
  using (coalesce(current_setting('request.jwt.claim.role', true), '') = 'anon')
  with check (coalesce(current_setting('request.jwt.claim.role', true), '') = 'anon');

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

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  insert into public.auth_rate_limits (
    identifier_type,
    identifier_hash,
    window_start,
    attempt_count,
    locked_until,
    lock_level,
    created_at,
    updated_at
  ) values (
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

    update public.auth_rate_limits
       set lock_level = v_lock_level,
           locked_until = v_locked_until,
           updated_at = v_now
     where identifier_type = p_identifier_type
       and identifier_hash = p_identifier_hash
       and window_start = v_window_start;

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
