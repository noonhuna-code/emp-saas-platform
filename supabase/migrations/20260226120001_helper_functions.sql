create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if (auth.uid() is not null) then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create or replace function public.current_user_company_id()
returns uuid
language sql
security invoker
stable
as $$
  select up.company_id
  from public.user_profiles up
  where up.user_id = auth.uid()
    and up.is_deleted = false
  limit 1
$$;

create or replace function public.current_user_has_permission(permission_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and ur.company_id = public.current_user_company_id()
      and (r.company_id = ur.company_id or r.is_system_role = true)
      and r.is_deleted = false
      and p.key = permission_key
  )
$$;

create or replace function public.create_company_with_owner(company_name text, slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_owner_id uuid;
  v_founder_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_owner_id := auth.uid();

  insert into public.companies (name, slug, is_active, created_by, updated_by, is_deleted)
  values (company_name, slug, true, v_owner_id, v_owner_id, false)
  returning id into v_company_id;

  select id into v_founder_role_id
  from public.roles
  where is_system_role = true
    and name = 'Founder'
    and is_deleted = false
  limit 1;

  if v_founder_role_id is null then
    insert into public.roles (company_id, name, is_system_role, created_by, updated_by, is_deleted)
    values (null, 'Founder', true, v_owner_id, v_owner_id, false)
    returning id into v_founder_role_id;
  end if;

  insert into public.role_permissions (role_id, permission_id)
  select v_founder_role_id, p.id
  from public.permissions p
  on conflict do nothing;

  insert into public.user_profiles (user_id, company_id, full_name, is_active, created_by, updated_by, is_deleted)
  values (v_owner_id, v_company_id, coalesce((auth.jwt() ->> 'full_name'), 'Owner'), true, v_owner_id, v_owner_id, false)
  on conflict (user_id) do update
    set company_id = excluded.company_id,
        full_name = excluded.full_name,
        updated_by = v_owner_id,
        is_deleted = false;

  insert into public.user_roles (user_id, role_id, company_id, created_by)
  values (v_owner_id, v_founder_role_id, v_company_id, v_owner_id)
  on conflict do nothing;

  return v_company_id;
end;
$$;
