-- ============================================
-- Migration: 66e_add_task_comment_atomic.sql
-- Purpose: Atomic RPC for task comments
-- Scope: SECURITY INVOKER function only
-- Non-destructive: YES
-- Idempotent: YES (CREATE OR REPLACE)
-- RLS Impact: None
-- ============================================

create or replace function public.add_task_comment_atomic(
  p_task_id uuid,
  p_body text
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
  v_task_company_id uuid;
  v_comment_id uuid;
begin
  if p_task_id is null or p_body is null then
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

  select company_id
    into v_task_company_id
    from public.project_tasks
   where id = p_task_id
     and is_deleted = false;

  perform public.validate_company_consistency(v_company_id, v_task_company_id);

  insert into public.task_comments (
    company_id,
    task_id,
    author_employee_id,
    body,
    created_at,
    updated_at,
    created_by,
    updated_by,
    is_deleted
  ) values (
    v_company_id,
    p_task_id,
    v_actor_employee_id,
    p_body,
    now(),
    now(),
    v_actor_profile_id,
    v_actor_profile_id,
    false
  ) returning id into v_comment_id;

  return jsonb_build_object('comment_id', v_comment_id);
end;
$$;
