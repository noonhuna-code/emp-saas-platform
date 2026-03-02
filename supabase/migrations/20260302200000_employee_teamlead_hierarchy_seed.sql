-- Phase: Employee hierarchy seed (non-destructive)
-- Purpose:
-- 1) Ensure Team Lead role template exists with shift-management permissions.
-- 2) Assign CISCO HR as Team Lead role.
-- 3) Link CISCO employee to Team Lead manager hierarchy.
-- 4) Ensure one active day-shift assignment for CISCO employee.

insert into public.roles (company_id, name, is_system_role, created_at, updated_at, is_deleted)
select null, 'Team Lead', true, now(), now(), false
where not exists (
  select 1
  from public.roles r
  where r.company_id is null
    and r.is_system_role = true
    and r.is_deleted = false
    and lower(r.name) = 'team lead'
);

insert into public.role_permissions (role_id, permission_id)
select role_row.id, permission_row.id
from public.roles role_row
join public.permissions permission_row
  on permission_row.key in (
    'view_company_data',
    'view_attendance',
    'manage_attendance',
    'approve_attendance',
    'manage_shifts',
    'assign_shifts',
    'manage_projects'
  )
where role_row.company_id is null
  and role_row.is_system_role = true
  and role_row.is_deleted = false
  and lower(role_row.name) = 'team lead'
on conflict do nothing;

do $$
declare
  v_company_id uuid;
  v_team_lead_user_id uuid;
  v_team_lead_profile_id uuid;
  v_team_lead_employee_id uuid;
  v_target_employee_id uuid;
  v_target_team_id uuid;
  v_day_shift_id uuid;
  v_team_lead_role_id uuid;
begin
  select c.id
    into v_company_id
  from public.companies c
  where lower(c.slug) = 'cisco'
    and c.is_deleted = false
  limit 1;

  if v_company_id is null then
    return;
  end if;

  select u.id
    into v_team_lead_user_id
  from auth.users u
  where lower(u.email) = 'hr@cisco.com'
  limit 1;

  if v_team_lead_user_id is null then
    return;
  end if;

  select up.id
    into v_team_lead_profile_id
  from public.user_profiles up
  where up.company_id = v_company_id
    and up.user_id = v_team_lead_user_id
    and up.is_deleted = false
  limit 1;

  if v_team_lead_profile_id is null then
    return;
  end if;

  select e.id
    into v_team_lead_employee_id
  from public.employees e
  where e.company_id = v_company_id
    and e.user_profile_id = v_team_lead_profile_id
    and e.is_deleted = false
  limit 1;

  if v_team_lead_employee_id is null then
    return;
  end if;

  select r.id
    into v_team_lead_role_id
  from public.roles r
  where r.company_id is null
    and r.is_system_role = true
    and r.is_deleted = false
    and lower(r.name) = 'team lead'
  limit 1;

  if v_team_lead_role_id is not null then
    insert into public.user_roles (user_id, role_id, company_id, created_at, created_by)
    values (v_team_lead_user_id, v_team_lead_role_id, v_company_id, now(), v_team_lead_profile_id)
    on conflict (user_id, role_id, company_id) do nothing;
  end if;

  select e.id, e.team_id
    into v_target_employee_id, v_target_team_id
  from public.employees e
  join public.user_profiles up on up.id = e.user_profile_id
  join auth.users u on u.id = up.user_id
  where e.company_id = v_company_id
    and e.is_deleted = false
    and lower(u.email) = 'emp1@cisco.com'
  limit 1;

  if v_target_employee_id is null then
    select e.id, e.team_id
      into v_target_employee_id, v_target_team_id
    from public.employees e
    where e.company_id = v_company_id
      and e.is_deleted = false
      and e.employee_code = 'CISCO-005'
    limit 1;
  end if;

  if v_target_employee_id is null then
    return;
  end if;

  update public.employees e
  set manager_id = v_team_lead_employee_id,
      updated_at = now(),
      updated_by = v_team_lead_profile_id
  where e.company_id = v_company_id
    and e.id = v_target_employee_id
    and (e.manager_id is distinct from v_team_lead_employee_id);

  if v_target_team_id is not null then
    update public.teams t
    set team_lead_id = v_team_lead_employee_id,
        updated_at = now(),
        updated_by = v_team_lead_profile_id
    where t.company_id = v_company_id
      and t.id = v_target_team_id
      and (t.team_lead_id is distinct from v_team_lead_employee_id);
  end if;

  select st.id
    into v_day_shift_id
  from public.shift_templates st
  where st.company_id = v_company_id
    and st.is_deleted = false
    and st.is_active = true
  order by st.created_at asc
  limit 1;

  if v_day_shift_id is null then
    insert into public.shift_templates (
      company_id,
      name,
      start_time,
      end_time,
      timezone,
      grace_minutes,
      auto_absent_after_minutes,
      min_half_day_minutes,
      min_full_day_minutes,
      is_night_shift,
      is_active,
      created_by,
      updated_by
    )
    values (
      v_company_id,
      'General Day Shift',
      '09:00',
      '18:00',
      'Asia/Karachi',
      15,
      60,
      240,
      480,
      false,
      true,
      v_team_lead_profile_id,
      v_team_lead_profile_id
    )
    returning id into v_day_shift_id;
  end if;

  if v_day_shift_id is not null then
    if not exists (
      select 1
      from public.employee_shift_assignments esa
      where esa.company_id = v_company_id
        and esa.employee_id = v_target_employee_id
        and esa.is_deleted = false
        and esa.effective_from <= current_date
        and (esa.effective_to is null or esa.effective_to >= current_date)
    ) then
      insert into public.employee_shift_assignments (
        company_id,
        employee_id,
        shift_template_id,
        effective_from,
        effective_to,
        assigned_by,
        assignment_type,
        created_by,
        updated_by
      )
      values (
        v_company_id,
        v_target_employee_id,
        v_day_shift_id,
        current_date,
        null,
        v_team_lead_profile_id,
        'manual',
        v_team_lead_profile_id,
        v_team_lead_profile_id
      );
    end if;
  end if;
end $$;

