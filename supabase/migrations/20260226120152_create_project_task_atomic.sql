-- ============================================
-- Migration: 66c_create_project_task_atomic.sql
-- Purpose: Atomic RPC for project task creation
-- Scope: SECURITY INVOKER function only
-- Non-destructive: YES
-- Idempotent: YES (CREATE OR REPLACE)
-- RLS Impact: None
-- ============================================

create or replace function public.create_project_task_atomic(
  p_project_id uuid,
  p_title text,
  p_description text,
  p_assignee_employee_id uuid default null,
  p_status text default 'todo',
  p_due_date date default null
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
  v_project_company_id uuid;
  v_assignee_company_id uuid;
  v_task_id uuid;
  v_history_id uuid;
begin
  if p_project_id is null or p_title is null then
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
    into v_project_company_id
    from public.projects
   where id = p_project_id
     and is_deleted = false;

  perform public.validate_company_consistency(v_company_id, v_project_company_id);

  if p_assignee_employee_id is not null then
    select company_id
      into v_assignee_company_id
      from public.employees
     where id = p_assignee_employee_id
       and is_deleted = false;

    perform public.validate_company_consistency(v_company_id, v_assignee_company_id);
  end if;

  insert into public.project_tasks (
    company_id,
    project_id,
    title,
    description,
    status,
    priority,
    assignee_employee_id,
    due_date,
    created_at,
    updated_at,
    created_by,
    updated_by,
    is_deleted
  ) values (
    v_company_id,
    p_project_id,
    p_title,
    p_description,
    coalesce(p_status, 'todo'),
    'normal',
    p_assignee_employee_id,
    p_due_date,
    now(),
    now(),
    v_actor_profile_id,
    v_actor_profile_id,
    false
  ) returning id into v_task_id;

  insert into public.task_status_history (
    company_id,
    task_id,
    old_status,
    new_status,
    changed_by,
    changed_at,
    created_at,
    updated_at,
    created_by,
    updated_by,
    is_deleted
  ) values (
    v_company_id,
    v_task_id,
    null,
    coalesce(p_status, 'todo'),
    v_actor_employee_id,
    now(),
    now(),
    now(),
    v_actor_profile_id,
    v_actor_profile_id,
    false
  ) returning id into v_history_id;

  return jsonb_build_object(
    'task_id', v_task_id,
    'status_history_id', v_history_id
  );
end;
$$;
