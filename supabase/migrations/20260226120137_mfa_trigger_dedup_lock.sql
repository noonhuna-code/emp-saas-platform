-- ============================================
-- Migration: 99_mfa_trigger_dedup_lock.sql
-- Purpose: Concurrency-safe MFA trigger deduplication
-- Scope: Function replacement only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

create or replace function public.insert_mfa_trigger_dedup(
  p_company_id uuid,
  p_profile_id uuid,
  p_risk_score integer,
  p_reason text,
  p_status text default 'pending',
  p_request_id text default null,
  p_window_minutes integer default 10
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_actor_profile_id uuid;
  v_target_company_id uuid;
  v_inserted_id uuid;
  v_lock_key bigint;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select up.company_id, up.id
    into v_company_id, v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null or v_actor_profile_id is null then
    raise exception 'TENANT_RESOLUTION_FAILED';
  end if;

  if p_company_id is null or p_profile_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  if p_company_id <> v_company_id then
    raise exception 'TENANT_MISMATCH';
  end if;

  select company_id
    into v_target_company_id
    from public.user_profiles
   where id = p_profile_id
     and is_deleted = false
   limit 1;

  if v_target_company_id is null or v_target_company_id <> v_company_id then
    raise exception 'TENANT_MISMATCH';
  end if;

  v_lock_key := hashtextextended(p_company_id::text || ':' || p_profile_id::text, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  insert into public.mfa_triggers (
    company_id,
    profile_id,
    risk_score,
    reason,
    status,
    request_id,
    created_at
  )
  select
    p_company_id,
    p_profile_id,
    p_risk_score,
    p_reason,
    coalesce(p_status, 'pending'),
    p_request_id,
    now()
  where not exists (
    select 1
      from public.mfa_triggers mt
     where mt.company_id = p_company_id
       and mt.profile_id = p_profile_id
       and mt.created_at > now() - make_interval(mins => p_window_minutes)
  )
  returning id into v_inserted_id;

  return jsonb_build_object(
    'inserted', v_inserted_id is not null,
    'id', v_inserted_id
  );
end;
$$;
