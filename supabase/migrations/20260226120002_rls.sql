alter table public.companies enable row level security;
alter table public.companies force row level security;
alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;
alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.permissions enable row level security;
alter table public.permissions force row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.departments enable row level security;
alter table public.departments force row level security;
alter table public.teams enable row level security;
alter table public.teams force row level security;
alter table public.employees enable row level security;
alter table public.employees force row level security;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select
  using (id = public.current_user_company_id() and is_deleted = false);

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update
  using (id = public.current_user_company_id() and public.current_user_has_permission('manage_company'))
  with check (id = public.current_user_company_id() and public.current_user_has_permission('manage_company'));

drop policy if exists user_profiles_select_self on public.user_profiles;
create policy user_profiles_select_self on public.user_profiles
  for select
  using (user_id = auth.uid());

drop policy if exists user_profiles_select_company on public.user_profiles;
create policy user_profiles_select_company on public.user_profiles
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

drop policy if exists user_profiles_insert on public.user_profiles;
create policy user_profiles_insert on public.user_profiles
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'));

drop policy if exists user_profiles_update on public.user_profiles;
create policy user_profiles_update on public.user_profiles
  for update
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'))
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'));

drop policy if exists user_profiles_delete on public.user_profiles;
create policy user_profiles_delete on public.user_profiles
  for delete
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'));

drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select
  using ((is_system_role = true and is_deleted = false) or (company_id = public.current_user_company_id() and is_deleted = false));

drop policy if exists roles_insert on public.roles;
create policy roles_insert on public.roles
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_roles'));

drop policy if exists roles_update on public.roles;
create policy roles_update on public.roles
  for update
  using (company_id = public.current_user_company_id() and is_system_role = false and public.current_user_has_permission('manage_roles'))
  with check (company_id = public.current_user_company_id() and is_system_role = false and public.current_user_has_permission('manage_roles'));

drop policy if exists roles_delete on public.roles;
create policy roles_delete on public.roles
  for delete
  using (company_id = public.current_user_company_id() and is_system_role = false and public.current_user_has_permission('manage_roles'));

drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select
  using (auth.uid() is not null);

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select
  using (
    exists (
      select 1
      from public.roles r
      where r.id = role_permissions.role_id
        and (r.company_id = public.current_user_company_id() or r.is_system_role = true)
        and r.is_deleted = false
    )
  );

drop policy if exists role_permissions_insert on public.role_permissions;
create policy role_permissions_insert on public.role_permissions
  for insert
  with check (
    public.current_user_has_permission('manage_roles')
    and exists (
      select 1
      from public.roles r
      where r.id = role_permissions.role_id
        and (r.company_id = public.current_user_company_id() or r.is_system_role = true)
        and r.is_deleted = false
    )
  );

drop policy if exists role_permissions_update on public.role_permissions;
create policy role_permissions_update on public.role_permissions
  for update
  using (
    public.current_user_has_permission('manage_roles')
    and exists (
      select 1
      from public.roles r
      where r.id = role_permissions.role_id
        and (r.company_id = public.current_user_company_id() or r.is_system_role = true)
        and r.is_deleted = false
    )
  )
  with check (
    public.current_user_has_permission('manage_roles')
    and exists (
      select 1
      from public.roles r
      where r.id = role_permissions.role_id
        and (r.company_id = public.current_user_company_id() or r.is_system_role = true)
        and r.is_deleted = false
    )
  );

drop policy if exists role_permissions_delete on public.role_permissions;
create policy role_permissions_delete on public.role_permissions
  for delete
  using (
    public.current_user_has_permission('manage_roles')
    and exists (
      select 1
      from public.roles r
      where r.id = role_permissions.role_id
        and (r.company_id = public.current_user_company_id() or r.is_system_role = true)
        and r.is_deleted = false
    )
  );

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select
  using (company_id = public.current_user_company_id());

drop policy if exists user_roles_insert on public.user_roles;
create policy user_roles_insert on public.user_roles
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('assign_roles'));

drop policy if exists user_roles_update on public.user_roles;
create policy user_roles_update on public.user_roles
  for update
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('assign_roles'))
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('assign_roles'));

drop policy if exists user_roles_delete on public.user_roles;
create policy user_roles_delete on public.user_roles
  for delete
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('assign_roles'));

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

drop policy if exists departments_insert on public.departments;
create policy departments_insert on public.departments
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_departments'));

drop policy if exists departments_update on public.departments;
create policy departments_update on public.departments
  for update
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_departments'))
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_departments'));

drop policy if exists departments_delete on public.departments;
create policy departments_delete on public.departments
  for delete
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_departments'));

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_departments'));

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
  for update
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_departments'))
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_departments'));

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams
  for delete
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_departments'));

drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

drop policy if exists employees_select_self on public.employees;
create policy employees_select_self on public.employees
  for select
  using (
    company_id = public.current_user_company_id()
    and user_profile_id = (
      select up.id
      from public.user_profiles up
      where up.user_id = auth.uid()
        and up.is_deleted = false
      limit 1
    )
  );

drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees
  for insert
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'));

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees
  for update
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'))
  with check (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'));

drop policy if exists employees_delete on public.employees;
create policy employees_delete on public.employees
  for delete
  using (company_id = public.current_user_company_id() and public.current_user_has_permission('manage_employees'));
