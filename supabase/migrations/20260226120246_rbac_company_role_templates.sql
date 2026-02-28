-- ============================================
-- Migration: 20260226120246_rbac_company_role_templates.sql
-- Purpose : Seed baseline company role templates + permission mappings
-- Scope   : Additive, non-destructive, idempotent
-- ============================================

insert into public.roles (company_id, name, is_system_role, created_at, updated_at, is_deleted)
select null, role_name, true, now(), now(), false
from (values
  ('Admin'),
  ('HR'),
  ('Finance Manager'),
  ('Manager'),
  ('Employee')
) as role_seed(role_name)
where not exists (
  select 1
  from public.roles r
  where r.company_id is null
    and r.is_system_role = true
    and r.is_deleted = false
    and lower(r.name) = lower(role_seed.role_name)
);

-- Founder baseline: all non-platform permissions, excluding payment approval.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key not in (
  'approve_billing_payments',
  'view_all_companies',
  'manage_plan_versions',
  'manage_pricing',
  'override_subscription',
  'view_global_audit',
  'impersonate_company'
)
where r.company_id is null
  and r.is_system_role = true
  and r.is_deleted = false
  and r.name = 'Founder'
on conflict do nothing;

-- Admin role template.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'manage_company',
  'manage_roles',
  'manage_departments',
  'manage_employees',
  'assign_roles',
  'view_company_data',
  'manage_shifts',
  'assign_shifts',
  'manage_attendance',
  'approve_attendance',
  'override_attendance',
  'view_attendance',
  'manage_escalations',
  'manage_salary',
  'approve_salary',
  'run_payroll',
  'finalize_payroll',
  'manage_projects',
  'view_billing',
  'manage_billing'
)
where r.company_id is null
  and r.is_system_role = true
  and r.is_deleted = false
  and r.name = 'Admin'
on conflict do nothing;

-- HR role template.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'manage_employees',
  'manage_departments',
  'view_company_data',
  'manage_shifts',
  'assign_shifts',
  'view_attendance',
  'manage_attendance',
  'approve_attendance',
  'manage_escalations',
  'view_billing'
)
where r.company_id is null
  and r.is_system_role = true
  and r.is_deleted = false
  and r.name = 'HR'
on conflict do nothing;

-- Finance Manager role template.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'view_company_data',
  'manage_salary',
  'approve_salary',
  'run_payroll',
  'finalize_payroll',
  'view_billing',
  'manage_billing'
)
where r.company_id is null
  and r.is_system_role = true
  and r.is_deleted = false
  and r.name = 'Finance Manager'
on conflict do nothing;

-- Manager role template.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'view_company_data',
  'view_attendance',
  'manage_attendance',
  'approve_attendance',
  'manage_projects'
)
where r.company_id is null
  and r.is_system_role = true
  and r.is_deleted = false
  and r.name = 'Manager'
on conflict do nothing;

-- Employee role template.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'view_company_data',
  'view_attendance'
)
where r.company_id is null
  and r.is_system_role = true
  and r.is_deleted = false
  and r.name = 'Employee'
on conflict do nothing;
