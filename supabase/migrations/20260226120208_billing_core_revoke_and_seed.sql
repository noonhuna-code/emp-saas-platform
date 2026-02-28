-- ============================================
-- Migration: 20260226120208_billing_core_revoke_and_seed.sql
-- Purpose : Billing revoke-seat RPC + plan/feature seed data
-- Scope   : Additive + replay-safe
-- ============================================

create or replace function public.revoke_company_seat_atomic(
  p_company_id uuid,
  p_user_profile_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_company_id uuid;
  v_actor_profile_id uuid;
  v_assignment_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_session_company_id := public.current_user_company_id();
  if v_session_company_id is null or p_company_id is null or p_company_id <> v_session_company_id then
    raise exception using errcode = 'P0001', message = 'TENANT_MISMATCH';
  end if;

  if not (
    public.current_user_has_permission('manage_billing')
    or public.current_user_has_permission('manage_company')
  ) then
    raise exception using errcode = 'P0001', message = 'PERMISSION_DENIED';
  end if;

  select up.id
    into v_actor_profile_id
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.company_id = p_company_id
    and up.is_deleted = false
  limit 1;

  if v_actor_profile_id is null then
    raise exception using errcode = 'P0001', message = 'ACTOR_PROFILE_NOT_FOUND';
  end if;

  update public.company_seat_assignments
     set status = 'revoked',
         ended_at = now(),
         revoked_by_profile_id = v_actor_profile_id,
         updated_at = now()
   where company_id = p_company_id
     and user_profile_id = p_user_profile_id
     and status = 'active'
  returning id into v_assignment_id;

  if v_assignment_id is null then
    raise exception using errcode = 'P0001', message = 'SEAT_NOT_ASSIGNED';
  end if;

  return jsonb_build_object(
    'seat_assignment_id', v_assignment_id,
    'company_id', p_company_id,
    'user_profile_id', p_user_profile_id,
    'status', 'revoked'
  );
end;
$$;

