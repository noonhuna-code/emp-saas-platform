-- Purpose:
-- 1) Correct the CISCO hierarchy so Team Lead is not mapped to HR.
-- 2) Normalize temporary display names and department/team assignments.
-- 3) Keep employee scope helper compatible with both user_profile and employee team_lead_id storage.

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
  v_now timestamptz := now();

  v_founder_user_id uuid;
  v_admin_user_id uuid;
  v_hr_user_id uuid;
  v_finance_user_id uuid;
  v_teamlead_user_id uuid;
  v_employee_user_id uuid;

  v_founder_profile_id uuid;
  v_admin_profile_id uuid;
  v_hr_profile_id uuid;
  v_finance_profile_id uuid;
  v_teamlead_profile_id uuid;
  v_employee_profile_id uuid;

  v_admin_department_id uuid;
  v_hr_department_id uuid;
  v_it_department_id uuid;
  v_finance_department_id uuid;

  v_admin_team_id uuid;
  v_hr_team_id uuid;
  v_it_team_id uuid;
  v_finance_team_id uuid;

  v_founder_employee_id uuid;
  v_admin_employee_id uuid;
  v_hr_employee_id uuid;
  v_finance_employee_id uuid;
  v_teamlead_employee_id uuid;
  v_employee_employee_id uuid;

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

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'Muhammad Umair')
  where lower(email) = 'noonhuna@gmail.com';

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'CISCO Founder')
  where lower(email) = 'owner@cisco.com';

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'CISCO Admin Manager')
  where lower(email) = 'admin@cisco.com';

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'CISCO HR Manager')
  where lower(email) = 'hr@cisco.com';

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'CISCO Finance Manager')
  where lower(email) = 'finance@cisco.com';

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'CISCO IT Team Lead')
  where lower(email) = 'teamlead@cisco.com';

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', 'CISCO IT Associate')
  where lower(email) = 'emp1@cisco.com';

  select id into v_founder_user_id from auth.users where lower(email) = 'owner@cisco.com' limit 1;
  select id into v_admin_user_id from auth.users where lower(email) = 'admin@cisco.com' limit 1;
  select id into v_hr_user_id from auth.users where lower(email) = 'hr@cisco.com' limit 1;
  select id into v_finance_user_id from auth.users where lower(email) = 'finance@cisco.com' limit 1;
  select id into v_teamlead_user_id from auth.users where lower(email) = 'teamlead@cisco.com' limit 1;
  select id into v_employee_user_id from auth.users where lower(email) = 'emp1@cisco.com' limit 1;

  if v_founder_user_id is not null then
    insert into public.user_profiles (user_id, company_id, full_name, is_active, created_at, updated_at, is_deleted)
    select v_founder_user_id, v_company_id, 'CISCO Founder', true, v_now, v_now, false
    where not exists (
      select 1
      from public.user_profiles up
      where up.user_id = v_founder_user_id
        and up.company_id = v_company_id
        and up.is_deleted = false
    );

    update public.user_profiles
    set full_name = 'CISCO Founder',
        updated_at = v_now
    where user_id = v_founder_user_id
      and company_id = v_company_id
      and is_deleted = false;
  end if;

  if v_admin_user_id is not null then
    insert into public.user_profiles (user_id, company_id, full_name, is_active, created_at, updated_at, is_deleted)
    select v_admin_user_id, v_company_id, 'CISCO Admin Manager', true, v_now, v_now, false
    where not exists (
      select 1
      from public.user_profiles up
      where up.user_id = v_admin_user_id
        and up.company_id = v_company_id
        and up.is_deleted = false
    );

    update public.user_profiles
    set full_name = 'CISCO Admin Manager',
        updated_at = v_now
    where user_id = v_admin_user_id
      and company_id = v_company_id
      and is_deleted = false;
  end if;

  if v_hr_user_id is not null then
    insert into public.user_profiles (user_id, company_id, full_name, is_active, created_at, updated_at, is_deleted)
    select v_hr_user_id, v_company_id, 'CISCO HR Manager', true, v_now, v_now, false
    where not exists (
      select 1
      from public.user_profiles up
      where up.user_id = v_hr_user_id
        and up.company_id = v_company_id
        and up.is_deleted = false
    );

    update public.user_profiles
    set full_name = 'CISCO HR Manager',
        updated_at = v_now
    where user_id = v_hr_user_id
      and company_id = v_company_id
      and is_deleted = false;
  end if;

  if v_finance_user_id is not null then
    insert into public.user_profiles (user_id, company_id, full_name, is_active, created_at, updated_at, is_deleted)
    select v_finance_user_id, v_company_id, 'CISCO Finance Manager', true, v_now, v_now, false
    where not exists (
      select 1
      from public.user_profiles up
      where up.user_id = v_finance_user_id
        and up.company_id = v_company_id
        and up.is_deleted = false
    );

    update public.user_profiles
    set full_name = 'CISCO Finance Manager',
        updated_at = v_now
    where user_id = v_finance_user_id
      and company_id = v_company_id
      and is_deleted = false;
  end if;

  if v_teamlead_user_id is not null then
    insert into public.user_profiles (user_id, company_id, full_name, is_active, created_at, updated_at, is_deleted)
    select v_teamlead_user_id, v_company_id, 'CISCO IT Team Lead', true, v_now, v_now, false
    where not exists (
      select 1
      from public.user_profiles up
      where up.user_id = v_teamlead_user_id
        and up.company_id = v_company_id
        and up.is_deleted = false
    );

    update public.user_profiles
    set full_name = 'CISCO IT Team Lead',
        updated_at = v_now
    where user_id = v_teamlead_user_id
      and company_id = v_company_id
      and is_deleted = false;
  end if;

  if v_employee_user_id is not null then
    insert into public.user_profiles (user_id, company_id, full_name, is_active, created_at, updated_at, is_deleted)
    select v_employee_user_id, v_company_id, 'CISCO IT Associate', true, v_now, v_now, false
    where not exists (
      select 1
      from public.user_profiles up
      where up.user_id = v_employee_user_id
        and up.company_id = v_company_id
        and up.is_deleted = false
    );

    update public.user_profiles
    set full_name = 'CISCO IT Associate',
        updated_at = v_now
    where user_id = v_employee_user_id
      and company_id = v_company_id
      and is_deleted = false;
  end if;

  select id into v_founder_profile_id from public.user_profiles where user_id = v_founder_user_id and company_id = v_company_id and is_deleted = false limit 1;
  select id into v_admin_profile_id from public.user_profiles where user_id = v_admin_user_id and company_id = v_company_id and is_deleted = false limit 1;
  select id into v_hr_profile_id from public.user_profiles where user_id = v_hr_user_id and company_id = v_company_id and is_deleted = false limit 1;
  select id into v_finance_profile_id from public.user_profiles where user_id = v_finance_user_id and company_id = v_company_id and is_deleted = false limit 1;
  select id into v_teamlead_profile_id from public.user_profiles where user_id = v_teamlead_user_id and company_id = v_company_id and is_deleted = false limit 1;
  select id into v_employee_profile_id from public.user_profiles where user_id = v_employee_user_id and company_id = v_company_id and is_deleted = false limit 1;

  insert into public.departments (company_id, name, is_active, created_at, updated_at, is_deleted)
  select v_company_id, 'Admin', true, v_now, v_now, false
  where not exists (
    select 1 from public.departments d
    where d.company_id = v_company_id and lower(d.name) = 'admin' and d.is_deleted = false
  );

  insert into public.departments (company_id, name, is_active, created_at, updated_at, is_deleted)
  select v_company_id, 'HR', true, v_now, v_now, false
  where not exists (
    select 1 from public.departments d
    where d.company_id = v_company_id and lower(d.name) = 'hr' and d.is_deleted = false
  );

  insert into public.departments (company_id, name, is_active, created_at, updated_at, is_deleted)
  select v_company_id, 'IT', true, v_now, v_now, false
  where not exists (
    select 1 from public.departments d
    where d.company_id = v_company_id and lower(d.name) = 'it' and d.is_deleted = false
  );

  insert into public.departments (company_id, name, is_active, created_at, updated_at, is_deleted)
  select v_company_id, 'Finance', true, v_now, v_now, false
  where not exists (
    select 1 from public.departments d
    where d.company_id = v_company_id and lower(d.name) = 'finance' and d.is_deleted = false
  );

  select id into v_admin_department_id from public.departments where company_id = v_company_id and lower(name) = 'admin' and is_deleted = false limit 1;
  select id into v_hr_department_id from public.departments where company_id = v_company_id and lower(name) = 'hr' and is_deleted = false limit 1;
  select id into v_it_department_id from public.departments where company_id = v_company_id and lower(name) = 'it' and is_deleted = false limit 1;
  select id into v_finance_department_id from public.departments where company_id = v_company_id and lower(name) = 'finance' and is_deleted = false limit 1;

  if v_founder_profile_id is not null and v_admin_department_id is not null then
    insert into public.employees (
      company_id, user_profile_id, department_id, designation, joining_date,
      is_active, created_at, updated_at, is_deleted, employee_code
    )
    select v_company_id, v_founder_profile_id, v_admin_department_id, 'Founder', current_date,
           true, v_now, v_now, false, 'CISCO-001'
    where not exists (
      select 1 from public.employees e
      where e.company_id = v_company_id and e.user_profile_id = v_founder_profile_id and e.is_deleted = false
    );
  end if;

  if v_admin_profile_id is not null and v_admin_department_id is not null then
    insert into public.employees (
      company_id, user_profile_id, department_id, designation, joining_date,
      is_active, created_at, updated_at, is_deleted, employee_code
    )
    select v_company_id, v_admin_profile_id, v_admin_department_id, 'Admin Manager', current_date,
           true, v_now, v_now, false, 'CISCO-002'
    where not exists (
      select 1 from public.employees e
      where e.company_id = v_company_id and e.user_profile_id = v_admin_profile_id and e.is_deleted = false
    );
  end if;

  if v_hr_profile_id is not null and v_hr_department_id is not null then
    insert into public.employees (
      company_id, user_profile_id, department_id, designation, joining_date,
      is_active, created_at, updated_at, is_deleted, employee_code
    )
    select v_company_id, v_hr_profile_id, v_hr_department_id, 'HR Manager', current_date,
           true, v_now, v_now, false, 'CISCO-003'
    where not exists (
      select 1 from public.employees e
      where e.company_id = v_company_id and e.user_profile_id = v_hr_profile_id and e.is_deleted = false
    );
  end if;

  if v_finance_profile_id is not null and v_finance_department_id is not null then
    insert into public.employees (
      company_id, user_profile_id, department_id, designation, joining_date,
      is_active, created_at, updated_at, is_deleted, employee_code
    )
    select v_company_id, v_finance_profile_id, v_finance_department_id, 'Finance Manager', current_date,
           true, v_now, v_now, false, 'CISCO-004'
    where not exists (
      select 1 from public.employees e
      where e.company_id = v_company_id and e.user_profile_id = v_finance_profile_id and e.is_deleted = false
    );
  end if;

  if v_employee_profile_id is not null and v_it_department_id is not null then
    insert into public.employees (
      company_id, user_profile_id, department_id, designation, joining_date,
      is_active, created_at, updated_at, is_deleted, employee_code
    )
    select v_company_id, v_employee_profile_id, v_it_department_id, 'IT Associate', current_date,
           true, v_now, v_now, false, 'CISCO-005'
    where not exists (
      select 1 from public.employees e
      where e.company_id = v_company_id and e.user_profile_id = v_employee_profile_id and e.is_deleted = false
    );
  end if;

  if v_teamlead_profile_id is not null and v_it_department_id is not null then
    insert into public.employees (
      company_id, user_profile_id, department_id, designation, joining_date,
      is_active, created_at, updated_at, is_deleted, employee_code
    )
    select v_company_id, v_teamlead_profile_id, v_it_department_id, 'Team Lead', current_date,
           true, v_now, v_now, false, 'CISCO-006'
    where not exists (
      select 1 from public.employees e
      where e.company_id = v_company_id and e.user_profile_id = v_teamlead_profile_id and e.is_deleted = false
    );
  end if;

  select id into v_founder_employee_id from public.employees where company_id = v_company_id and user_profile_id = v_founder_profile_id and is_deleted = false limit 1;
  select id into v_admin_employee_id from public.employees where company_id = v_company_id and user_profile_id = v_admin_profile_id and is_deleted = false limit 1;
  select id into v_hr_employee_id from public.employees where company_id = v_company_id and user_profile_id = v_hr_profile_id and is_deleted = false limit 1;
  select id into v_finance_employee_id from public.employees where company_id = v_company_id and user_profile_id = v_finance_profile_id and is_deleted = false limit 1;
  select id into v_teamlead_employee_id from public.employees where company_id = v_company_id and user_profile_id = v_teamlead_profile_id and is_deleted = false limit 1;
  select id into v_employee_employee_id from public.employees where company_id = v_company_id and user_profile_id = v_employee_profile_id and is_deleted = false limit 1;

  insert into public.teams (company_id, department_id, name, team_lead_id, created_at, updated_at, is_deleted)
  select v_company_id, v_admin_department_id, 'Admin Operations', null, v_now, v_now, false
  where v_admin_department_id is not null
    and not exists (
      select 1 from public.teams t
      where t.company_id = v_company_id and lower(t.name) = 'admin operations' and t.is_deleted = false
    );

  insert into public.teams (company_id, department_id, name, team_lead_id, created_at, updated_at, is_deleted)
  select v_company_id, v_hr_department_id, 'HR Operations', null, v_now, v_now, false
  where v_hr_department_id is not null
    and not exists (
      select 1 from public.teams t
      where t.company_id = v_company_id and lower(t.name) = 'hr operations' and t.is_deleted = false
    );

  insert into public.teams (company_id, department_id, name, team_lead_id, created_at, updated_at, is_deleted)
  select v_company_id, v_it_department_id, 'IT Support', null, v_now, v_now, false
  where v_it_department_id is not null
    and not exists (
      select 1 from public.teams t
      where t.company_id = v_company_id and lower(t.name) = 'it support' and t.is_deleted = false
    );

  insert into public.teams (company_id, department_id, name, team_lead_id, created_at, updated_at, is_deleted)
  select v_company_id, v_finance_department_id, 'Finance Operations', null, v_now, v_now, false
  where v_finance_department_id is not null
    and not exists (
      select 1 from public.teams t
      where t.company_id = v_company_id and lower(t.name) = 'finance operations' and t.is_deleted = false
    );

  select id into v_admin_team_id from public.teams where company_id = v_company_id and lower(name) = 'admin operations' and is_deleted = false limit 1;
  select id into v_hr_team_id from public.teams where company_id = v_company_id and lower(name) = 'hr operations' and is_deleted = false limit 1;
  select id into v_it_team_id from public.teams where company_id = v_company_id and lower(name) = 'it support' and is_deleted = false limit 1;
  select id into v_finance_team_id from public.teams where company_id = v_company_id and lower(name) = 'finance operations' and is_deleted = false limit 1;

  update public.employees
  set department_id = v_admin_department_id,
      team_id = v_admin_team_id,
      manager_id = null,
      reports_to = null,
      designation = 'Founder',
      employee_code = 'CISCO-001',
      updated_at = v_now
  where id = v_founder_employee_id;

  update public.employees
  set department_id = v_admin_department_id,
      team_id = v_admin_team_id,
      manager_id = v_founder_employee_id,
      reports_to = v_founder_employee_id,
      designation = 'Admin Manager',
      employee_code = 'CISCO-002',
      updated_at = v_now
  where id = v_admin_employee_id;

  update public.employees
  set department_id = v_hr_department_id,
      team_id = v_hr_team_id,
      manager_id = v_founder_employee_id,
      reports_to = v_founder_employee_id,
      designation = 'HR Manager',
      employee_code = 'CISCO-003',
      updated_at = v_now
  where id = v_hr_employee_id;

  update public.employees
  set department_id = v_finance_department_id,
      team_id = v_finance_team_id,
      manager_id = v_founder_employee_id,
      reports_to = v_founder_employee_id,
      designation = 'Finance Manager',
      employee_code = 'CISCO-004',
      updated_at = v_now
  where id = v_finance_employee_id;

  update public.employees
  set department_id = v_it_department_id,
      team_id = v_it_team_id,
      manager_id = v_admin_employee_id,
      reports_to = v_admin_employee_id,
      designation = 'Team Lead',
      employee_code = 'CISCO-006',
      updated_at = v_now
  where id = v_teamlead_employee_id;

  update public.employees
  set department_id = v_it_department_id,
      team_id = v_it_team_id,
      manager_id = v_teamlead_employee_id,
      reports_to = v_teamlead_employee_id,
      designation = 'IT Associate',
      employee_code = 'CISCO-005',
      updated_at = v_now
  where id = v_employee_employee_id;

  -- Intentionally do not mutate public.teams.team_lead_id here.
  -- The live database currently carries both a legacy user_profiles foreign key
  -- and a newer employee-based hierarchy trigger on the same column. Updating it
  -- would fail until that historical conflict is cleaned up in a dedicated schema pass.
  -- Employee/manager hierarchy is corrected through public.employees manager/team assignments,
  -- and current_user_scope_employee_ids() is updated below to derive team scope from actor team membership.

  select r.id
    into v_team_lead_role_id
  from public.roles r
  where r.company_id is null
    and r.is_system_role = true
    and r.is_deleted = false
    and lower(r.name) = 'team lead'
  limit 1;

  if v_team_lead_role_id is not null then
    if v_hr_user_id is not null then
      delete from public.user_roles
      where company_id = v_company_id
        and role_id = v_team_lead_role_id
        and user_id = v_hr_user_id;
    end if;

    if v_teamlead_user_id is not null then
      insert into public.user_roles (user_id, role_id, company_id, created_at, created_by)
      values (v_teamlead_user_id, v_team_lead_role_id, v_company_id, v_now, coalesce(v_founder_profile_id, v_admin_profile_id, v_teamlead_profile_id))
      on conflict (user_id, role_id, company_id) do nothing;
    end if;
  end if;
end $$;

create or replace function public.current_user_scope_employee_ids()
returns setof uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select set_config('row_security','off', true);
  with actor_profile as (
    select up.id as user_profile_id
    from public.user_profiles up
    where up.user_id = auth.uid()
      and up.company_id = public.current_user_company_id()
      and up.is_deleted = false
    limit 1
  ),
  actor_employee as (
    select e.id as employee_id, e.department_id, e.team_id, e.manager_id
    from public.employees e
    join actor_profile ap on ap.user_profile_id = e.user_profile_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  self_scope as (
    select employee_id from actor_employee
  ),
  team_scope as (
    select e.id
    from public.employees e
    join actor_employee ae on ae.team_id = e.team_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
      and ae.team_id is not null
      and (
        public.current_user_has_permission('assign_shifts')
        or public.current_user_has_permission('manage_shifts')
        or public.current_user_has_permission('approve_attendance')
        or public.current_user_has_permission('manage_attendance')
      )
  ),
  manager_scope as (
    select e.id
    from public.employees e
    join actor_employee ae on ae.employee_id = e.manager_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  department_scope as (
    select e.id
    from public.employees e
    join actor_employee ae on ae.department_id = e.department_id
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
  ),
  company_scope as (
    select e.id
    from public.employees e
    where e.company_id = public.current_user_company_id()
      and e.is_deleted = false
      and (
        public.current_user_has_permission('manage_attendance')
        or public.current_user_has_permission('override_attendance')
        or public.current_user_has_permission('approve_attendance')
        or public.current_user_has_permission('manage_escalations')
        or public.current_user_has_permission('assign_shifts')
        or public.current_user_has_permission('manage_shifts')
        or public.current_user_has_permission('view_attendance')
      )
  )
  select distinct employee_id from (
    select employee_id from self_scope
    union all
    select id from team_scope
    union all
    select id from manager_scope
    union all
    select id from department_scope
    union all
    select id from company_scope
  ) scoped
$$;


