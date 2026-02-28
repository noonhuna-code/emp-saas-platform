-- ============================================
-- Migration: 75_rate_limit_sharding.sql
-- Purpose: Sharded rate limit buckets to reduce contention
-- Scope: Column addition, constraint update, function rewrite
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

alter table public.api_rate_limits
  add column if not exists bucket smallint;

update public.api_rate_limits
   set bucket = 0
 where bucket is null;

alter table public.api_rate_limits
  alter column bucket set not null;

alter table public.api_rate_limits
  drop constraint if exists api_rate_limits_unique;

alter table public.api_rate_limits
  add constraint api_rate_limits_unique
  unique (company_id, endpoint, window_start, bucket);

create index if not exists api_rate_limits_company_endpoint_window_bucket_idx
  on public.api_rate_limits (company_id, endpoint, window_start, bucket);

create or replace function public.rate_limit_check(
  p_endpoint text,
  p_window_seconds integer,
  p_limit integer,
  p_request_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_window_start timestamptz;
  v_bucket smallint;
  v_bucket_count integer;
  v_total_count integer;
  v_remaining integer;
  v_hash_source text;
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

  v_hash_source := coalesce(nullif(p_request_id, ''), auth.uid()::text);
  v_bucket := abs(hashtext(v_hash_source)) % 8;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.api_rate_limits (
    company_id,
    endpoint,
    window_start,
    bucket,
    request_count,
    created_at
  ) values (
    v_company_id,
    p_endpoint,
    v_window_start,
    v_bucket,
    1,
    now()
  )
  on conflict (company_id, endpoint, window_start, bucket) do update
    set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_bucket_count;

  select coalesce(sum(request_count), 0)
    into v_total_count
    from public.api_rate_limits
   where company_id = v_company_id
     and endpoint = p_endpoint
     and window_start = v_window_start
  for update;

  if v_total_count > p_limit then
    raise exception using
      errcode = 'P0001',
      message = 'RATE_LIMIT_EXCEEDED';
  end if;

  v_remaining := greatest(p_limit - v_total_count, 0);

  return jsonb_build_object(
    'allowed', true,
    'remaining', v_remaining,
    'retry_after_seconds', p_window_seconds
  );
end;
$$;