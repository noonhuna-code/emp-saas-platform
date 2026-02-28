-- ============================================
-- Migration: 68_project_task_membership_guard.sql
-- Purpose: Enforce project membership for task status updates
-- Scope: Function replacement only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

create or replace function public.update_project_task_status_atomic(
  p_task_id uuid,
  p_new_status text
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
  v_old_status text;
  v_rowcount integer;
  v_history_id uuid;
begin
  if p_task_id is null or p_new_status is null then
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

  select status
    into v_old_status
    from public.project_tasks
   where id = p_task_id
     and company_id = v_company_id
     and is_deleted = false;

  if v_old_status is null then
    raise exception using
      errcode = 'P0001',
      message = 'TASK_NOT_FOUND';
  end if;

  if v_old_status = p_new_status then
    raise exception using
      errcode = 'P0001',
      message = 'NO_STATUS_CHANGE';
  end if;

  update public.project_tasks
     set status = p_new_status,
         updated_at = now(),
         updated_by = v_actor_profile_id
   where id = p_task_id
     and company_id = v_company_id
     and is_deleted = false
     and status = v_old_status
     and exists (
       select 1
         from public.project_members pm
        where pm.project_id = public.project_tasks.project_id
          and pm.employee_id = v_actor_employee_id
          and pm.company_id = v_company_id
          and pm.is_deleted = false
     );

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'TASK_NOT_FOUND';
  end if;

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
    p_task_id,
    v_old_status,
    p_new_status,
    v_actor_employee_id,
    now(),
    now(),
    now(),
    v_actor_profile_id,
    v_actor_profile_id,
    false
  ) returning id into v_history_id;

  return jsonb_build_object(
    'task_id', p_task_id,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'status_history_id', v_history_id
  );
end;
$$;
