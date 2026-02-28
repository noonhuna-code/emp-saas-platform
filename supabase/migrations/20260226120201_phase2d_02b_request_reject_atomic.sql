-- ============================================
-- Migration: 20260226120201_phase2d_02b_request_reject_atomic.sql
-- Purpose: Phase 2D Stage 2A atomic reject request function
-- Scope: SECURITY INVOKER RPC only
-- Non-destructive: YES
-- Idempotent: YES (CREATE OR REPLACE FUNCTION)
-- RLS Impact: None (relies on existing RLS on financial obligation tables)
-- ============================================

create or replace function public.reject_financial_obligation_request_atomic(
  p_request_id uuid,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_actor_profile_id uuid;
  v_request record;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  if p_request_id is null then
    raise exception using errcode = 'P0001', message = 'FINANCIAL_OBLIGATION_REQUEST_NOT_FOUND';
  end if;

  select up.company_id, up.id
    into v_company_id, v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null or v_actor_profile_id is null then
    raise exception using errcode = 'P0001', message = 'TENANT_RESOLUTION_FAILED';
  end if;

  select r.*
    into v_request
    from public.financial_obligation_requests r
   where r.id = p_request_id
     and r.company_id = v_company_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'FINANCIAL_OBLIGATION_REQUEST_NOT_FOUND';
  end if;

  if v_request.status not in ('submitted', 'under_review') then
    raise exception using errcode = 'P0001', message = 'APPROVAL_NOT_PENDING';
  end if;

  update public.financial_obligation_requests
     set status = 'rejected',
         rejection_reason = nullif(btrim(coalesce(p_rejection_reason, '')), ''),
         reviewed_by_profile_id = v_actor_profile_id,
         reviewed_at = now(),
         updated_by_profile_id = v_actor_profile_id,
         updated_at = now()
   where id = p_request_id
     and company_id = v_company_id;

  return jsonb_build_object(
    'request_id', p_request_id,
    'status', 'rejected'
  );
end;
$$;

