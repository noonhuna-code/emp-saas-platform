-- EMP/supabase/system_global_alignment_patch.sql

create or replace function public.current_user_is_manager_of(p_employee_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = p_employee_id
      and e.company_id = public.current_user_company_id()
      and e.manager_id = public.current_user_employee_id()
      and e.is_deleted = false
  )
$$;

create or replace function public.validate_employee_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team record;
  v_manager_company uuid;
begin
  if new.team_id is not null then
    select t.company_id, t.department_id
      into v_team
      from public.teams t
      where t.id = new.team_id;

    if v_team.company_id is null or v_team.company_id <> new.company_id then
      raise exception 'Team must belong to the same company';
    end if;

    if new.department_id is not null and v_team.department_id is not null and v_team.department_id <> new.department_id then
      raise exception 'Team department must match employee department';
    end if;
  end if;

  if new.manager_id is not null then
    select company_id into v_manager_company
    from public.employees e
    where e.id = new.manager_id
      and e.is_deleted = false;

    if v_manager_company is null or v_manager_company <> new.company_id then
      raise exception 'Manager must belong to the same company';
    end if;

    if new.manager_id = new.id then
      raise exception 'Employee cannot manage themselves';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employees_hierarchy_validate on public.employees;
create trigger trg_employees_hierarchy_validate
before insert or update on public.employees
for each row execute function public.validate_employee_hierarchy();

-- Leave requests approval workflow alignment

drop policy if exists leave_requests_update on public.leave_requests;
create policy leave_requests_update on public.leave_requests
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and (
      public.current_user_has_permission('manage_employees')
      or (
        employee_id = public.current_user_employee_id()
        and status = 'pending'
        and exists (
          select 1 from public.leave_requests lr
          where lr.id = id
            and lr.status = 'pending'
            and lr.is_deleted = false
        )
      )
      or public.current_user_is_manager_of(employee_id)
    )
  );

-- Attendance correction approval workflow alignment

drop policy if exists attendance_correction_requests_update on public.attendance_correction_requests;
create policy attendance_correction_requests_update on public.attendance_correction_requests
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and attendance_id in (
      select id from public.attendance_records
      where company_id = public.current_user_company_id()
        and is_deleted = false
        and employee_id in (select * from public.current_user_scope_employee_ids())
    )
    and (
      public.current_user_has_permission('manage_attendance')
      or (
        exists (
          select 1 from public.attendance_records ar
          where ar.id = attendance_id
            and ar.employee_id = public.current_user_employee_id()
        )
        and status = 'pending'
        and exists (
          select 1 from public.attendance_correction_requests cr
          where cr.id = id
            and cr.status = 'pending'
            and cr.is_deleted = false
        )
      )
      or exists (
        select 1
        from public.attendance_records ar2
        where ar2.id = attendance_id
          and public.current_user_is_manager_of(ar2.employee_id)
      )
    )
  );

-- Shift swap approval workflow alignment

drop policy if exists shift_swap_requests_update on public.shift_swap_requests;
create policy shift_swap_requests_update on public.shift_swap_requests
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and (
      public.current_user_has_permission('manage_shifts')
      or requester_employee_id = public.current_user_employee_id()
      or target_employee_id = public.current_user_employee_id()
      or public.current_user_is_manager_of(requester_employee_id)
      or public.current_user_is_manager_of(target_employee_id)
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_shifts')
      or requester_employee_id = public.current_user_employee_id()
      or target_employee_id = public.current_user_employee_id()
      or public.current_user_is_manager_of(requester_employee_id)
      or public.current_user_is_manager_of(target_employee_id)
    )
  );

-- ================================
-- SUMMARY
-- ================================
-- Functions added/updated: current_user_is_manager_of, validate_employee_hierarchy
-- Triggers added/updated: trg_employees_hierarchy_validate
-- Policies updated: leave_requests_update, attendance_correction_requests_update, shift_swap_requests_update
-- Self-audit: no table recreation, idempotent changes, hierarchy enforced via employees only
-- ================================
