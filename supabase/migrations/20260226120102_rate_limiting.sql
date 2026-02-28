-- ============================================
-- Migration: 63_rate_limiting.sql
-- Purpose: Company-scoped API rate limiting infrastructure
-- Scope: New table, RLS policies, rate limit helper function
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  endpoint text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint api_rate_limits_unique unique (company_id, endpoint, window_start)
);

create index if not exists api_rate_limits_company_id_idx
  on public.api_rate_limits (company_id);

create index if not exists api_rate_limits_company_endpoint_idx
  on public.api_rate_limits (company_id, endpoint);

alter table public.api_rate_limits enable row level security;
alter table public.api_rate_limits force row level security;

drop policy if exists api_rate_limits_select on public.api_rate_limits;
drop policy if exists api_rate_limits_insert on public.api_rate_limits;
drop policy if exists api_rate_limits_update on public.api_rate_limits;

create policy api_rate_limits_select on public.api_rate_limits
  for select
  using (company_id = public.current_user_company_id());

create policy api_rate_limits_insert on public.api_rate_limits
  for insert
  with check (company_id = public.current_user_company_id());

create policy api_rate_limits_update on public.api_rate_limits
  for update
  using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

create or replace function public.rate_limit_check(
  p_endpoint text,
  p_window_seconds integer,
  p_limit integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_window_start timestamptz;
  v_count integer;
  v_remaining integer;
begin
  if p_endpoint is null or p_window_seconds is null or p_limit is null then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMIT_INVALID';
  end if;

  if p_window_seconds <= 0 or p_limit <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMIT_INVALID';
  end if;

  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'UNAUTHENTICATED';
  end if;

  select up.company_id
    into v_company_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'TENANT_RESOLUTION_FAILED';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.api_rate_limits (
    company_id,
    endpoint,
    window_start,
    request_count,
    created_at
  ) values (
    v_company_id,
    p_endpoint,
    v_window_start,
    1,
    now()
  )
  on conflict (company_id, endpoint, window_start) do update
    set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;

  if v_count > p_limit then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMIT_EXCEEDED';
  end if;

  v_remaining := greatest(p_limit - v_count, 0);

  return jsonb_build_object(
    'allowed', true,
    'remaining', v_remaining,
    'retry_after_seconds', p_window_seconds
  );
end;
$$;
