insert into public.permissions (key, description)
values
  ('manage_company', 'Manage company settings'),
  ('manage_roles', 'Create and manage roles and permissions'),
  ('manage_departments', 'Create and manage departments and teams'),
  ('manage_employees', 'Create and manage employee records'),
  ('assign_roles', 'Assign roles to users'),
  ('view_company_data', 'View company data')
on conflict (key) do nothing;

insert into public.roles (company_id, name, is_system_role, created_by, updated_by, is_deleted)
select null, 'Founder', true, null, null, false
where not exists (
  select 1
  from public.roles
  where name = 'Founder'
    and is_system_role = true
    and is_deleted = false
);
