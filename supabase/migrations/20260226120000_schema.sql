create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  constraint companies_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists companies_slug_uniq on public.companies (slug);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  full_name text not null,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false
);

create index if not exists user_profiles_company_id_idx on public.user_profiles (company_id);
create index if not exists user_profiles_user_id_idx on public.user_profiles (user_id);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  name text not null,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  constraint roles_system_company_check
    check (
      (is_system_role = true and company_id is null)
      or
      (is_system_role = false and company_id is not null)
    )
);

create index if not exists roles_company_id_idx on public.roles (company_id);
create unique index if not exists roles_company_name_uniq on public.roles (company_id, name) where is_deleted = false;
create unique index if not exists roles_system_name_uniq on public.roles (name) where is_system_role = true and is_deleted = false;

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete restrict,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  primary key (role_id, permission_id)
);

create index if not exists role_permissions_role_id_idx on public.role_permissions (role_id);
create index if not exists role_permissions_permission_id_idx on public.role_permissions (permission_id);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint user_roles_unique_assignment unique (user_id, role_id, company_id)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists user_roles_role_id_idx on public.user_roles (role_id);
create index if not exists user_roles_company_id_idx on public.user_roles (company_id);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  parent_department_id uuid references public.departments(id) on delete set null,
  cost_center_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false
);

create index if not exists departments_company_id_idx on public.departments (company_id);
create index if not exists departments_parent_id_idx on public.departments (parent_department_id);
create unique index if not exists departments_company_name_uniq on public.departments (company_id, name) where is_deleted = false;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  department_id uuid not null references public.departments(id) on delete restrict,
  name text not null,
  team_lead_id uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false
);

create index if not exists teams_company_id_idx on public.teams (company_id);
create index if not exists teams_department_id_idx on public.teams (department_id);
create index if not exists teams_team_lead_id_idx on public.teams (team_lead_id);
create unique index if not exists teams_company_name_uniq on public.teams (company_id, name) where is_deleted = false;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  user_profile_id uuid not null unique references public.user_profiles(id) on delete restrict,
  department_id uuid not null references public.departments(id) on delete restrict,
  team_id uuid references public.teams(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  employment_type text,
  designation text,
  joining_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  constraint employees_employment_type_check
    check (employment_type is null or employment_type in ('full_time','part_time','contract','intern')),
  constraint employees_joining_date_check
    check (joining_date is null or joining_date <= current_date)
);

create index if not exists employees_company_id_idx on public.employees (company_id);
create index if not exists employees_user_profile_id_idx on public.employees (user_profile_id);
create index if not exists employees_department_id_idx on public.employees (department_id);
create index if not exists employees_team_id_idx on public.employees (team_id);
create index if not exists employees_manager_id_idx on public.employees (manager_id);
create unique index if not exists employees_company_profile_uniq on public.employees (company_id, user_profile_id) where is_deleted = false;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
