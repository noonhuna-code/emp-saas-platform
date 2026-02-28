-- ============================================
-- Migration: 66a_create_project_atomic.sql
-- Purpose: Atomic RPC for project creation
-- Scope: SECURITY INVOKER function only
-- Non-destructive: YES
-- Idempotent: YES (CREATE OR REPLACE)
-- RLS Impact: None
-- ============================================

create or replace function public.create_project_atomic(
  p_name text,
  p_description text,
  p_owner_employee_id uuid default null,
  p_status text default 'active',
  p_start_date date default null,
  p_end_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_actor_profile_id uuid;
  v_actor_employee_id uuid;
  v_owner_employee_id uuid;
  v_owner_company_id uuid;
  v_project_id uuid;
  v_member_id uuid;
begin
  if p_name is null then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_INPUT';
  end if;

  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'UNAUTHENTICATED';
  end if;

  select up.company_id, up.id
    into v_company_id, v_actor_profile_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null or v_actor_profile_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'TENANT_RESOLUTION_FAILED';
  end if;

  select e.id
    into v_actor_employee_id
    from public.employees e
   where e.user_profile_id = v_actor_profile_id
     and e.company_id = v_company_id
     and e.is_deleted = false
   limit 1;

  if v_actor_employee_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'ACTOR_MISMATCH';
  end if;

  v_owner_employee_id := coalesce(p_owner_employee_id, v_actor_employee_id);

  select company_id
    into v_owner_company_id
    from public.employees
   where id = v_owner_employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(v_company_id, v_owner_company_id);

  insert into public.projects (
    company_id,
    name,
    description,
    status,
    start_date,
    end_date,
    created_at,
    updated_at,
    created_by,
    updated_by,
    is_deleted
  ) values (
    v_company_id,
    p_name,
    p_description,
    coalesce(p_status, 'active'),
    p_start_date,
    p_end_date,
    now(),
    now(),
    v_actor_profile_id,
    v_actor_profile_id,
    false
  ) returning id into v_project_id;

  insert into public.project_members (
    company_id,
    project_id,
    employee_id,
    role,
    created_at,
    updated_at,
    created_by,
    updated_by,
    is_deleted
  ) values (
    v_company_id,
    v_project_id,
    v_owner_employee_id,
    'owner',
    now(),
    now(),
    v_actor_profile_id,
    v_actor_profile_id,
    false
  ) returning id into v_member_id;

  return jsonb_build_object(
    'project_id', v_project_id,
    'owner_member_id', v_member_id
  );
end;
$$;
