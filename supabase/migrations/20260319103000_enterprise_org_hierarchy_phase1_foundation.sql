-- ============================================
-- Migration: 20260319103000_enterprise_org_hierarchy_phase1_foundation.sql
-- Purpose : Add enterprise-grade organization foundation for multi-structure hierarchies
-- Scope   : Additive, non-destructive, replay-safe
-- Notes   : Preserves existing departments/teams/branches/employees/reporting model
-- ============================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'org_unit_category'
  ) then
    create type public.org_unit_category as enum (
      'ownership',
      'business',
      'geography',
      'functional',
      'workspace',
      'temporary'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'org_unit_status'
  ) then
    create type public.org_unit_status as enum (
      'draft',
      'active',
      'inactive',
      'archived'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'org_position_status'
  ) then
    create type public.org_position_status as enum (
      'planned',
      'active',
      'inactive',
      'archived'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'position_assignment_type'
  ) then
    create type public.position_assignment_type as enum (
      'primary',
      'secondary',
      'dotted_line',
      'acting',
      'delegated_approver',
      'temporary_project'
    );
  end if;
end $$;

create table if not exists public.org_unit_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  category public.org_unit_category not null,
  description text,
  allows_people_assignment boolean not null default true,
  allows_children boolean not null default true,
  sort_order integer not null default 100,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.org_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  unit_type_key text not null references public.org_unit_types(key) on delete restrict,
  name text not null,
  code text,
  parent_org_unit_id uuid references public.org_units(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  legacy_department_id uuid references public.departments(id) on delete set null,
  legacy_team_id uuid references public.teams(id) on delete set null,
  status public.org_unit_status not null default 'active',
  is_active boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint org_units_no_self_parent_check check (parent_org_unit_id is null or parent_org_unit_id <> id),
  constraint org_units_effective_window_check check (effective_to is null or effective_to >= effective_from),
  constraint org_units_single_legacy_reference_check check (
    (
      case when branch_id is null then 0 else 1 end
      + case when legacy_department_id is null then 0 else 1 end
      + case when legacy_team_id is null then 0 else 1 end
    ) <= 1
  )
);

create index if not exists org_units_company_id_idx
  on public.org_units(company_id)
  where is_deleted = false;

create index if not exists org_units_parent_org_unit_id_idx
  on public.org_units(parent_org_unit_id)
  where is_deleted = false;

create index if not exists org_units_unit_type_key_idx
  on public.org_units(unit_type_key)
  where is_deleted = false;

create unique index if not exists org_units_company_parent_name_uniq
  on public.org_units(company_id, unit_type_key, coalesce(parent_org_unit_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  where is_deleted = false;

create unique index if not exists org_units_legacy_department_uniq
  on public.org_units(legacy_department_id)
  where legacy_department_id is not null and is_deleted = false;

create unique index if not exists org_units_legacy_team_uniq
  on public.org_units(legacy_team_id)
  where legacy_team_id is not null and is_deleted = false;

create unique index if not exists org_units_branch_uniq
  on public.org_units(branch_id)
  where branch_id is not null and is_deleted = false;

create table if not exists public.org_unit_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  from_org_unit_id uuid not null references public.org_units(id) on delete restrict,
  to_org_unit_id uuid not null references public.org_units(id) on delete restrict,
  link_type text not null,
  is_primary boolean not null default false,
  effective_from date not null default current_date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  constraint org_unit_links_link_type_check check (
    link_type in (
      'business_owner',
      'legal_owner',
      'geo_coverage',
      'operational_alignment',
      'matrix_support',
      'project_assignment',
      'approval_scope'
    )
  ),
  constraint org_unit_links_no_self_check check (from_org_unit_id <> to_org_unit_id),
  constraint org_unit_links_effective_window_check check (effective_to is null or effective_to >= effective_from)
);

create index if not exists org_unit_links_company_id_idx
  on public.org_unit_links(company_id)
  where is_deleted = false;

create index if not exists org_unit_links_from_org_unit_id_idx
  on public.org_unit_links(from_org_unit_id)
  where is_deleted = false;

create index if not exists org_unit_links_to_org_unit_id_idx
  on public.org_unit_links(to_org_unit_id)
  where is_deleted = false;

create table if not exists public.job_role_families (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  key text not null,
  name text not null,
  description text,
  sort_order integer not null default 100,
  is_system_family boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  constraint job_role_families_system_company_check check (
    (is_system_family = true and company_id is null)
    or
    (is_system_family = false and company_id is not null)
  )
);

create unique index if not exists job_role_families_system_key_uniq
  on public.job_role_families(key)
  where is_system_family = true and is_deleted = false;

create unique index if not exists job_role_families_company_key_uniq
  on public.job_role_families(company_id, key)
  where is_system_family = false and is_deleted = false;

create table if not exists public.job_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  role_family_id uuid not null references public.job_role_families(id) on delete restrict,
  title text not null,
  code text,
  grade_band text,
  level_code text,
  employment_type text,
  management_scope text not null default 'individual_contributor',
  is_system_role boolean not null default false,
  is_executive boolean not null default false,
  supervisor_eligible boolean not null default false,
  approver_eligible boolean not null default false,
  delegate_eligible boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  constraint job_roles_system_company_check check (
    (is_system_role = true and company_id is null)
    or
    (is_system_role = false and company_id is not null)
  ),
  constraint job_roles_management_scope_check check (
    management_scope in ('individual_contributor', 'people_manager', 'executive', 'matrix_manager')
  )
);

create index if not exists job_roles_role_family_id_idx
  on public.job_roles(role_family_id)
  where is_deleted = false;

create unique index if not exists job_roles_system_title_uniq
  on public.job_roles(lower(title))
  where is_system_role = true and is_deleted = false;

create unique index if not exists job_roles_company_title_uniq
  on public.job_roles(company_id, lower(title))
  where is_system_role = false and is_deleted = false;

create table if not exists public.org_positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  org_unit_id uuid not null references public.org_units(id) on delete restrict,
  job_role_id uuid not null references public.job_roles(id) on delete restrict,
  position_code text not null,
  title_override text,
  reports_to_position_id uuid references public.org_positions(id) on delete set null,
  status public.org_position_status not null default 'active',
  is_key_position boolean not null default false,
  is_people_manager boolean not null default false,
  is_approver_position boolean not null default false,
  headcount_limit integer,
  effective_from date not null default current_date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint org_positions_headcount_limit_check check (headcount_limit is null or headcount_limit > 0),
  constraint org_positions_effective_window_check check (effective_to is null or effective_to >= effective_from),
  constraint org_positions_no_self_report_check check (reports_to_position_id is null or reports_to_position_id <> id)
);

create unique index if not exists org_positions_company_position_code_uniq
  on public.org_positions(company_id, lower(position_code))
  where is_deleted = false;

create index if not exists org_positions_company_id_idx
  on public.org_positions(company_id)
  where is_deleted = false;

create index if not exists org_positions_org_unit_id_idx
  on public.org_positions(org_unit_id)
  where is_deleted = false;

create index if not exists org_positions_job_role_id_idx
  on public.org_positions(job_role_id)
  where is_deleted = false;

create table if not exists public.position_relationships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  from_position_id uuid not null references public.org_positions(id) on delete restrict,
  to_position_id uuid not null references public.org_positions(id) on delete restrict,
  relation_type text not null,
  is_primary boolean not null default false,
  effective_from date not null default current_date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  constraint position_relationships_relation_type_check check (
    relation_type in (
      'primary_manager',
      'dotted_line_manager',
      'secondary_manager',
      'acting_manager',
      'skip_level_manager',
      'functional_manager',
      'delegate_approver',
      'approval_escalation',
      'project_manager'
    )
  ),
  constraint position_relationships_no_self_check check (from_position_id <> to_position_id),
  constraint position_relationships_effective_window_check check (effective_to is null or effective_to >= effective_from)
);

create unique index if not exists position_relationships_primary_active_uniq
  on public.position_relationships(from_position_id)
  where is_deleted = false
    and is_primary = true
    and effective_to is null
    and relation_type = 'primary_manager';

create index if not exists position_relationships_company_id_idx
  on public.position_relationships(company_id)
  where is_deleted = false;

create index if not exists position_relationships_from_position_id_idx
  on public.position_relationships(from_position_id)
  where is_deleted = false;

create index if not exists position_relationships_to_position_id_idx
  on public.position_relationships(to_position_id)
  where is_deleted = false;

create table if not exists public.employee_position_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  position_id uuid not null references public.org_positions(id) on delete restrict,
  assignment_type public.position_assignment_type not null,
  is_primary boolean not null default false,
  allocation_percent numeric(5,2) not null default 100,
  effective_from date not null default current_date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint employee_position_assignments_allocation_check check (allocation_percent > 0 and allocation_percent <= 100),
  constraint employee_position_assignments_effective_window_check check (effective_to is null or effective_to >= effective_from)
);

create unique index if not exists employee_position_assignments_primary_active_uniq
  on public.employee_position_assignments(employee_id)
  where is_deleted = false and is_primary = true and effective_to is null;

create index if not exists employee_position_assignments_company_id_idx
  on public.employee_position_assignments(company_id)
  where is_deleted = false;

create index if not exists employee_position_assignments_position_id_idx
  on public.employee_position_assignments(position_id)
  where is_deleted = false;

create table if not exists public.approval_delegations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  delegator_employee_id uuid not null references public.employees(id) on delete restrict,
  delegate_employee_id uuid not null references public.employees(id) on delete restrict,
  position_id uuid references public.org_positions(id) on delete set null,
  org_unit_id uuid references public.org_units(id) on delete set null,
  module_key text,
  request_type text,
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  constraint approval_delegations_no_self_check check (delegator_employee_id <> delegate_employee_id),
  constraint approval_delegations_effective_window_check check (effective_to is null or effective_to >= effective_from)
);

create index if not exists approval_delegations_company_id_idx
  on public.approval_delegations(company_id)
  where is_deleted = false;

create index if not exists approval_delegations_delegator_employee_id_idx
  on public.approval_delegations(delegator_employee_id)
  where is_deleted = false;

create index if not exists approval_delegations_delegate_employee_id_idx
  on public.approval_delegations(delegate_employee_id)
  where is_deleted = false;

create table if not exists public.approval_routing_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  rule_name text not null,
  module_key text not null,
  request_type text,
  subject_org_unit_id uuid references public.org_units(id) on delete set null,
  subject_geo_org_unit_id uuid references public.org_units(id) on delete set null,
  subject_role_family_id uuid references public.job_role_families(id) on delete set null,
  subject_job_role_id uuid references public.job_roles(id) on delete set null,
  subject_grade_band text,
  approver_position_id uuid references public.org_positions(id) on delete set null,
  approver_employee_id uuid references public.employees(id) on delete set null,
  delegate_employee_id uuid references public.employees(id) on delete set null,
  step_order integer not null default 1,
  is_required boolean not null default true,
  is_active boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  constraint approval_routing_rules_step_order_check check (step_order > 0),
  constraint approval_routing_rules_approver_target_check check (
    approver_position_id is not null or approver_employee_id is not null
  ),
  constraint approval_routing_rules_effective_window_check check (effective_to is null or effective_to >= effective_from)
);

create index if not exists approval_routing_rules_company_id_idx
  on public.approval_routing_rules(company_id)
  where is_deleted = false;

create index if not exists approval_routing_rules_module_key_idx
  on public.approval_routing_rules(company_id, module_key)
  where is_deleted = false and is_active = true;

create unique index if not exists approval_routing_rules_name_uniq
  on public.approval_routing_rules(company_id, lower(rule_name), step_order)
  where is_deleted = false;

create or replace function public.validate_org_unit_company_refs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_parent_company uuid;
  v_branch_company uuid;
  v_department_company uuid;
  v_team_company uuid;
begin
  if new.parent_org_unit_id is not null then
    select company_id
      into v_parent_company
    from public.org_units
    where id = new.parent_org_unit_id
      and is_deleted = false;

    if v_parent_company is null then
      raise exception 'Parent org unit not found';
    end if;

    if v_parent_company is distinct from new.company_id then
      raise exception 'Parent org unit must belong to the same company';
    end if;
  end if;

  if new.branch_id is not null then
    select company_id
      into v_branch_company
    from public.branches
    where id = new.branch_id
      and is_deleted = false;

    if v_branch_company is null then
      raise exception 'Branch not found';
    end if;

    if v_branch_company is distinct from new.company_id then
      raise exception 'Branch must belong to the same company';
    end if;
  end if;

  if new.legacy_department_id is not null then
    select company_id
      into v_department_company
    from public.departments
    where id = new.legacy_department_id
      and is_deleted = false;

    if v_department_company is null then
      raise exception 'Legacy department not found';
    end if;

    if v_department_company is distinct from new.company_id then
      raise exception 'Legacy department must belong to the same company';
    end if;
  end if;

  if new.legacy_team_id is not null then
    select company_id
      into v_team_company
    from public.teams
    where id = new.legacy_team_id
      and is_deleted = false;

    if v_team_company is null then
      raise exception 'Legacy team not found';
    end if;

    if v_team_company is distinct from new.company_id then
      raise exception 'Legacy team must belong to the same company';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_org_units_company_validate on public.org_units;
create trigger trg_org_units_company_validate
before insert or update of company_id, parent_org_unit_id, branch_id, legacy_department_id, legacy_team_id
on public.org_units
for each row
execute function public.validate_org_unit_company_refs();

create or replace function public.validate_org_unit_link_company_refs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_from_company uuid;
  v_to_company uuid;
begin
  select company_id into v_from_company
  from public.org_units
  where id = new.from_org_unit_id
    and is_deleted = false;

  select company_id into v_to_company
  from public.org_units
  where id = new.to_org_unit_id
    and is_deleted = false;

  if v_from_company is null or v_to_company is null then
    raise exception 'Linked org units must exist';
  end if;

  if v_from_company is distinct from new.company_id or v_to_company is distinct from new.company_id then
    raise exception 'Linked org units must belong to the same company';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_org_unit_links_company_validate on public.org_unit_links;
create trigger trg_org_unit_links_company_validate
before insert or update of company_id, from_org_unit_id, to_org_unit_id
on public.org_unit_links
for each row
execute function public.validate_org_unit_link_company_refs();

create or replace function public.validate_job_role_family_company()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_family_company uuid;
  v_is_system boolean;
begin
  select company_id, is_system_family
    into v_family_company, v_is_system
  from public.job_role_families
  where id = new.role_family_id
    and is_deleted = false;

  if v_family_company is null and v_is_system is distinct from true then
    raise exception 'Job role family not found';
  end if;

  if new.is_system_role = true then
    if v_is_system is distinct from true then
      raise exception 'System job roles must use a system role family';
    end if;
  elsif v_is_system is distinct from true and v_family_company is distinct from new.company_id then
    raise exception 'Job role family must belong to the same company';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_job_roles_family_company_validate on public.job_roles;
create trigger trg_job_roles_family_company_validate
before insert or update of company_id, role_family_id, is_system_role
on public.job_roles
for each row
execute function public.validate_job_role_family_company();

create or replace function public.validate_org_position_company_refs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_unit_company uuid;
  v_role_company uuid;
  v_role_is_system boolean;
  v_reports_to_company uuid;
begin
  select company_id
    into v_unit_company
  from public.org_units
  where id = new.org_unit_id
    and is_deleted = false;

  if v_unit_company is null then
    raise exception 'Org unit not found for position';
  end if;

  select company_id, is_system_role
    into v_role_company, v_role_is_system
  from public.job_roles
  where id = new.job_role_id
    and is_deleted = false;

  if v_role_company is null and v_role_is_system is distinct from true then
    raise exception 'Job role not found for position';
  end if;

  if v_unit_company is distinct from new.company_id then
    raise exception 'Position org unit must belong to the same company';
  end if;

  if v_role_is_system is distinct from true and v_role_company is distinct from new.company_id then
    raise exception 'Position job role must belong to the same company or be system-scoped';
  end if;

  if new.reports_to_position_id is not null then
    select company_id
      into v_reports_to_company
    from public.org_positions
    where id = new.reports_to_position_id
      and is_deleted = false;

    if v_reports_to_company is null then
      raise exception 'Reports-to position not found';
    end if;

    if v_reports_to_company is distinct from new.company_id then
      raise exception 'Reports-to position must belong to the same company';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_org_positions_company_validate on public.org_positions;
create trigger trg_org_positions_company_validate
before insert or update of company_id, org_unit_id, job_role_id, reports_to_position_id
on public.org_positions
for each row
execute function public.validate_org_position_company_refs();

create or replace function public.validate_position_relationship_company_refs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_from_company uuid;
  v_to_company uuid;
begin
  select company_id into v_from_company
  from public.org_positions
  where id = new.from_position_id
    and is_deleted = false;

  select company_id into v_to_company
  from public.org_positions
  where id = new.to_position_id
    and is_deleted = false;

  if v_from_company is null or v_to_company is null then
    raise exception 'Position relationship endpoints must exist';
  end if;

  if v_from_company is distinct from new.company_id or v_to_company is distinct from new.company_id then
    raise exception 'Position relationships must remain inside the same company';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_position_relationships_company_validate on public.position_relationships;
create trigger trg_position_relationships_company_validate
before insert or update of company_id, from_position_id, to_position_id
on public.position_relationships
for each row
execute function public.validate_position_relationship_company_refs();

create or replace function public.validate_employee_position_assignment_company_refs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_employee_company uuid;
  v_position_company uuid;
begin
  select company_id
    into v_employee_company
  from public.employees
  where id = new.employee_id
    and is_deleted = false;

  select company_id
    into v_position_company
  from public.org_positions
  where id = new.position_id
    and is_deleted = false;

  if v_employee_company is null or v_position_company is null then
    raise exception 'Employee assignment references must exist';
  end if;

  if v_employee_company is distinct from new.company_id or v_position_company is distinct from new.company_id then
    raise exception 'Employee position assignments must remain inside the same company';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employee_position_assignments_company_validate on public.employee_position_assignments;
create trigger trg_employee_position_assignments_company_validate
before insert or update of company_id, employee_id, position_id
on public.employee_position_assignments
for each row
execute function public.validate_employee_position_assignment_company_refs();

create or replace function public.validate_approval_delegation_company_refs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_delegator_company uuid;
  v_delegate_company uuid;
  v_position_company uuid;
  v_org_unit_company uuid;
begin
  select company_id
    into v_delegator_company
  from public.employees
  where id = new.delegator_employee_id
    and is_deleted = false;

  select company_id
    into v_delegate_company
  from public.employees
  where id = new.delegate_employee_id
    and is_deleted = false;

  if v_delegator_company is null or v_delegate_company is null then
    raise exception 'Approval delegation employees must exist';
  end if;

  if v_delegator_company is distinct from new.company_id or v_delegate_company is distinct from new.company_id then
    raise exception 'Approval delegation employees must belong to the same company';
  end if;

  if new.position_id is not null then
    select company_id into v_position_company
    from public.org_positions
    where id = new.position_id
      and is_deleted = false;

    if v_position_company is null or v_position_company is distinct from new.company_id then
      raise exception 'Approval delegation position must belong to the same company';
    end if;
  end if;

  if new.org_unit_id is not null then
    select company_id into v_org_unit_company
    from public.org_units
    where id = new.org_unit_id
      and is_deleted = false;

    if v_org_unit_company is null or v_org_unit_company is distinct from new.company_id then
      raise exception 'Approval delegation org unit must belong to the same company';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_approval_delegations_company_validate on public.approval_delegations;
create trigger trg_approval_delegations_company_validate
before insert or update of company_id, delegator_employee_id, delegate_employee_id, position_id, org_unit_id
on public.approval_delegations
for each row
execute function public.validate_approval_delegation_company_refs();

create or replace function public.validate_approval_routing_rule_company_refs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subject_org_unit_company uuid;
  v_subject_geo_company uuid;
  v_role_family_company uuid;
  v_role_family_system boolean;
  v_job_role_company uuid;
  v_job_role_system boolean;
  v_approver_position_company uuid;
  v_approver_employee_company uuid;
  v_delegate_company uuid;
begin
  if new.subject_org_unit_id is not null then
    select company_id into v_subject_org_unit_company
    from public.org_units
    where id = new.subject_org_unit_id
      and is_deleted = false;

    if v_subject_org_unit_company is null or v_subject_org_unit_company is distinct from new.company_id then
      raise exception 'Routing subject org unit must belong to the same company';
    end if;
  end if;

  if new.subject_geo_org_unit_id is not null then
    select company_id into v_subject_geo_company
    from public.org_units
    where id = new.subject_geo_org_unit_id
      and is_deleted = false;

    if v_subject_geo_company is null or v_subject_geo_company is distinct from new.company_id then
      raise exception 'Routing geography org unit must belong to the same company';
    end if;
  end if;

  if new.subject_role_family_id is not null then
    select company_id, is_system_family
      into v_role_family_company, v_role_family_system
    from public.job_role_families
    where id = new.subject_role_family_id
      and is_deleted = false;

    if v_role_family_company is null and v_role_family_system is distinct from true then
      raise exception 'Routing role family not found';
    end if;

    if v_role_family_system is distinct from true and v_role_family_company is distinct from new.company_id then
      raise exception 'Routing role family must belong to the same company or be system-scoped';
    end if;
  end if;

  if new.subject_job_role_id is not null then
    select company_id, is_system_role
      into v_job_role_company, v_job_role_system
    from public.job_roles
    where id = new.subject_job_role_id
      and is_deleted = false;

    if v_job_role_company is null and v_job_role_system is distinct from true then
      raise exception 'Routing job role not found';
    end if;

    if v_job_role_system is distinct from true and v_job_role_company is distinct from new.company_id then
      raise exception 'Routing job role must belong to the same company or be system-scoped';
    end if;
  end if;

  if new.approver_position_id is not null then
    select company_id into v_approver_position_company
    from public.org_positions
    where id = new.approver_position_id
      and is_deleted = false;

    if v_approver_position_company is null or v_approver_position_company is distinct from new.company_id then
      raise exception 'Routing approver position must belong to the same company';
    end if;
  end if;

  if new.approver_employee_id is not null then
    select company_id into v_approver_employee_company
    from public.employees
    where id = new.approver_employee_id
      and is_deleted = false;

    if v_approver_employee_company is null or v_approver_employee_company is distinct from new.company_id then
      raise exception 'Routing approver employee must belong to the same company';
    end if;
  end if;

  if new.delegate_employee_id is not null then
    select company_id into v_delegate_company
    from public.employees
    where id = new.delegate_employee_id
      and is_deleted = false;

    if v_delegate_company is null or v_delegate_company is distinct from new.company_id then
      raise exception 'Routing delegate employee must belong to the same company';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_approval_routing_rules_company_validate on public.approval_routing_rules;
create trigger trg_approval_routing_rules_company_validate
before insert or update of company_id, subject_org_unit_id, subject_geo_org_unit_id, subject_role_family_id, subject_job_role_id, approver_position_id, approver_employee_id, delegate_employee_id
on public.approval_routing_rules
for each row
execute function public.validate_approval_routing_rule_company_refs();

alter table public.org_unit_types enable row level security;
alter table public.org_unit_types force row level security;

drop policy if exists org_unit_types_select on public.org_unit_types;
create policy org_unit_types_select on public.org_unit_types
  for select
  using (auth.uid() is not null);

alter table public.org_units enable row level security;
alter table public.org_units force row level security;

drop policy if exists org_units_select on public.org_units;
drop policy if exists org_units_insert on public.org_units;
drop policy if exists org_units_update on public.org_units;
drop policy if exists org_units_delete on public.org_units;

create policy org_units_select on public.org_units
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy org_units_insert on public.org_units
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_org_structure')
  );

create policy org_units_update on public.org_units
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_org_structure')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_org_structure')
  );

create policy org_units_delete on public.org_units
  for delete
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_org_structure')
  );

alter table public.org_unit_links enable row level security;
alter table public.org_unit_links force row level security;

drop policy if exists org_unit_links_select on public.org_unit_links;
drop policy if exists org_unit_links_insert on public.org_unit_links;
drop policy if exists org_unit_links_update on public.org_unit_links;
drop policy if exists org_unit_links_delete on public.org_unit_links;

create policy org_unit_links_select on public.org_unit_links
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy org_unit_links_insert on public.org_unit_links
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_org_structure')
  );

create policy org_unit_links_update on public.org_unit_links
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_org_structure')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_org_structure')
  );

create policy org_unit_links_delete on public.org_unit_links
  for delete
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_org_structure')
  );

alter table public.job_role_families enable row level security;
alter table public.job_role_families force row level security;

drop policy if exists job_role_families_select on public.job_role_families;
drop policy if exists job_role_families_insert on public.job_role_families;
drop policy if exists job_role_families_update on public.job_role_families;
drop policy if exists job_role_families_delete on public.job_role_families;

create policy job_role_families_select on public.job_role_families
  for select
  using (
    (is_system_family = true and is_deleted = false)
    or
    (company_id = public.current_user_company_id() and is_deleted = false)
  );

create policy job_role_families_insert on public.job_role_families
  for insert
  with check (
    company_id = public.current_user_company_id()
    and is_system_family = false
    and public.current_user_has_permission('manage_positions')
  );

create policy job_role_families_update on public.job_role_families
  for update
  using (
    company_id = public.current_user_company_id()
    and is_system_family = false
    and is_deleted = false
    and public.current_user_has_permission('manage_positions')
  )
  with check (
    company_id = public.current_user_company_id()
    and is_system_family = false
    and public.current_user_has_permission('manage_positions')
  );

create policy job_role_families_delete on public.job_role_families
  for delete
  using (
    company_id = public.current_user_company_id()
    and is_system_family = false
    and public.current_user_has_permission('manage_positions')
  );

alter table public.job_roles enable row level security;
alter table public.job_roles force row level security;

drop policy if exists job_roles_select on public.job_roles;
drop policy if exists job_roles_insert on public.job_roles;
drop policy if exists job_roles_update on public.job_roles;
drop policy if exists job_roles_delete on public.job_roles;

create policy job_roles_select on public.job_roles
  for select
  using (
    (is_system_role = true and is_deleted = false)
    or
    (company_id = public.current_user_company_id() and is_deleted = false)
  );

create policy job_roles_insert on public.job_roles
  for insert
  with check (
    company_id = public.current_user_company_id()
    and is_system_role = false
    and public.current_user_has_permission('manage_positions')
  );

create policy job_roles_update on public.job_roles
  for update
  using (
    company_id = public.current_user_company_id()
    and is_system_role = false
    and is_deleted = false
    and public.current_user_has_permission('manage_positions')
  )
  with check (
    company_id = public.current_user_company_id()
    and is_system_role = false
    and public.current_user_has_permission('manage_positions')
  );

create policy job_roles_delete on public.job_roles
  for delete
  using (
    company_id = public.current_user_company_id()
    and is_system_role = false
    and public.current_user_has_permission('manage_positions')
  );

alter table public.org_positions enable row level security;
alter table public.org_positions force row level security;

drop policy if exists org_positions_select on public.org_positions;
drop policy if exists org_positions_insert on public.org_positions;
drop policy if exists org_positions_update on public.org_positions;
drop policy if exists org_positions_delete on public.org_positions;

create policy org_positions_select on public.org_positions
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy org_positions_insert on public.org_positions
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_positions')
  );

create policy org_positions_update on public.org_positions
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_positions')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_positions')
  );

create policy org_positions_delete on public.org_positions
  for delete
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_positions')
  );

alter table public.position_relationships enable row level security;
alter table public.position_relationships force row level security;

drop policy if exists position_relationships_select on public.position_relationships;
drop policy if exists position_relationships_insert on public.position_relationships;
drop policy if exists position_relationships_update on public.position_relationships;
drop policy if exists position_relationships_delete on public.position_relationships;

create policy position_relationships_select on public.position_relationships
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy position_relationships_insert on public.position_relationships
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_reporting_lines')
  );

create policy position_relationships_update on public.position_relationships
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_reporting_lines')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_reporting_lines')
  );

create policy position_relationships_delete on public.position_relationships
  for delete
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_reporting_lines')
  );

alter table public.employee_position_assignments enable row level security;
alter table public.employee_position_assignments force row level security;

drop policy if exists employee_position_assignments_select on public.employee_position_assignments;
drop policy if exists employee_position_assignments_insert on public.employee_position_assignments;
drop policy if exists employee_position_assignments_update on public.employee_position_assignments;
drop policy if exists employee_position_assignments_delete on public.employee_position_assignments;

create policy employee_position_assignments_select on public.employee_position_assignments
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy employee_position_assignments_insert on public.employee_position_assignments
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_positions')
  );

create policy employee_position_assignments_update on public.employee_position_assignments
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_positions')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_positions')
  );

create policy employee_position_assignments_delete on public.employee_position_assignments
  for delete
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_positions')
  );

alter table public.approval_delegations enable row level security;
alter table public.approval_delegations force row level security;

drop policy if exists approval_delegations_select on public.approval_delegations;
drop policy if exists approval_delegations_insert on public.approval_delegations;
drop policy if exists approval_delegations_update on public.approval_delegations;
drop policy if exists approval_delegations_delete on public.approval_delegations;

create policy approval_delegations_select on public.approval_delegations
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy approval_delegations_insert on public.approval_delegations
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_delegations')
  );

create policy approval_delegations_update on public.approval_delegations
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_delegations')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_delegations')
  );

create policy approval_delegations_delete on public.approval_delegations
  for delete
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_delegations')
  );

alter table public.approval_routing_rules enable row level security;
alter table public.approval_routing_rules force row level security;

drop policy if exists approval_routing_rules_select on public.approval_routing_rules;
drop policy if exists approval_routing_rules_insert on public.approval_routing_rules;
drop policy if exists approval_routing_rules_update on public.approval_routing_rules;
drop policy if exists approval_routing_rules_delete on public.approval_routing_rules;

create policy approval_routing_rules_select on public.approval_routing_rules
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy approval_routing_rules_insert on public.approval_routing_rules
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_approval_routing')
  );

create policy approval_routing_rules_update on public.approval_routing_rules
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_approval_routing')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_approval_routing')
  );

create policy approval_routing_rules_delete on public.approval_routing_rules
  for delete
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_approval_routing')
  );

insert into public.permissions (key, description)
values
  ('manage_org_structure', 'Create and manage enterprise organization structures and org units'),
  ('manage_positions', 'Create and manage enterprise job roles, positions, and employee assignments'),
  ('manage_reporting_lines', 'Create and manage reporting and matrix relationships'),
  ('manage_delegations', 'Create and manage approval and acting delegations'),
  ('manage_approval_routing', 'Create and manage approval routing chains and escalation rules')
on conflict (key) do nothing;

insert into public.org_unit_types (
  key,
  name,
  category,
  description,
  allows_people_assignment,
  allows_children,
  sort_order,
  is_system
)
select seed.key, seed.name, seed.category, seed.description, seed.allows_people_assignment, seed.allows_children, seed.sort_order, true
from (
  values
    ('holding_company', 'Holding Company', 'ownership'::public.org_unit_category, 'Top-level ownership structure spanning multiple companies or subsidiaries.', false, true, 10),
    ('company', 'Company', 'ownership'::public.org_unit_category, 'Operating company or tenant root.', false, true, 20),
    ('subsidiary', 'Subsidiary', 'business'::public.org_unit_category, 'Subsidiary or controlled business entity.', false, true, 30),
    ('brand', 'Brand', 'business'::public.org_unit_category, 'Brand, label, or market-facing business identity.', false, true, 40),
    ('business_unit', 'Business Unit', 'business'::public.org_unit_category, 'Commercial or operational business unit.', true, true, 50),
    ('legal_entity', 'Legal Entity', 'business'::public.org_unit_category, 'Legal entity for contracts, payroll, or compliance.', false, true, 60),
    ('country', 'Country', 'geography'::public.org_unit_category, 'Country-level geography node.', false, true, 70),
    ('region', 'Region', 'geography'::public.org_unit_category, 'Region or area geography node.', false, true, 80),
    ('province_state', 'Province / State', 'geography'::public.org_unit_category, 'Province or state geography node.', false, true, 90),
    ('zone_cluster', 'Zone / Cluster', 'geography'::public.org_unit_category, 'Zone, cluster, or territory rollup.', false, true, 100),
    ('territory', 'Territory', 'geography'::public.org_unit_category, 'Field territory or sales/service territory.', false, true, 110),
    ('city', 'City', 'geography'::public.org_unit_category, 'City or metro geography node.', false, true, 120),
    ('branch', 'Branch', 'geography'::public.org_unit_category, 'Operational branch.', true, true, 130),
    ('office', 'Office', 'geography'::public.org_unit_category, 'Office location or campus.', true, true, 140),
    ('site', 'Site', 'geography'::public.org_unit_category, 'Site, plant, or service location.', true, true, 150),
    ('building', 'Building', 'geography'::public.org_unit_category, 'Building node inside a site or office.', true, true, 160),
    ('floor', 'Floor', 'geography'::public.org_unit_category, 'Floor or wing inside a building.', true, true, 170),
    ('remote_team', 'Remote Team', 'workspace'::public.org_unit_category, 'Remote-first or distributed workspace unit.', true, true, 180),
    ('division', 'Division', 'functional'::public.org_unit_category, 'Large functional division.', true, true, 190),
    ('department', 'Department', 'functional'::public.org_unit_category, 'Department-level functional unit.', true, true, 200),
    ('sub_department', 'Sub-department', 'functional'::public.org_unit_category, 'Nested department or specialized sub-department.', true, true, 210),
    ('team', 'Team', 'functional'::public.org_unit_category, 'Delivery team or execution team.', true, true, 220),
    ('sub_team', 'Sub-team', 'functional'::public.org_unit_category, 'Nested team or cell.', true, true, 230),
    ('pod', 'Pod', 'workspace'::public.org_unit_category, 'Pod, desk, or operational cell.', true, true, 240),
    ('desk', 'Desk', 'workspace'::public.org_unit_category, 'Desk or micro-team grouping.', true, true, 250),
    ('shift_group', 'Shift Group', 'workspace'::public.org_unit_category, 'Shift-based operational group.', true, true, 260),
    ('project_structure', 'Project Structure', 'temporary'::public.org_unit_category, 'Temporary project or program structure.', true, true, 270)
) as seed(key, name, category, description, allows_people_assignment, allows_children, sort_order)
where not exists (
  select 1
  from public.org_unit_types outt
  where outt.key = seed.key
);

insert into public.job_role_families (
  company_id,
  key,
  name,
  description,
  sort_order,
  is_system_family,
  is_deleted
)
select null, seed.key, seed.name, seed.description, seed.sort_order, true, false
from (
  values
    ('governance_executive', 'Governance / Executive', 'Ownership, board, founder, and executive leadership roles.', 10),
    ('strategy', 'Strategy', 'Corporate strategy, transformation, and planning.', 20),
    ('finance_accounts_treasury_tax', 'Finance / Accounts / Treasury / Tax', 'Finance operations, controllership, treasury, and tax.', 30),
    ('hr_payroll_talent_ld', 'HR / Payroll / Talent / L&D', 'Human resources, payroll, recruiting, talent, and learning.', 40),
    ('admin_office_assets', 'Admin / Office / Assets', 'Administration, office management, and asset coordination.', 50),
    ('it_helpdesk_infrastructure_iam', 'IT / Helpdesk / Infrastructure / IAM', 'End-user IT, infrastructure, IAM, and workplace tech.', 60),
    ('security_infosec_physical', 'Security / InfoSec / Physical Security', 'Cybersecurity, SOC, identity risk, and physical security.', 70),
    ('legal_compliance_audit_risk', 'Legal / Compliance / Audit / Risk', 'Legal, internal audit, compliance, governance, and risk.', 80),
    ('product_project_program_pmo_delivery', 'Product / Project / Program / PMO / Delivery', 'Product management, PMO, project management, and delivery.', 90),
    ('engineering_qa_architecture_devops_support', 'Engineering / QA / Architecture / DevOps / Support Engineering', 'Software, platform, QA, architecture, DevOps, and support engineering.', 100),
    ('data_bi_reporting_research_planning', 'Data / BI / Reporting / Research / Planning', 'Analytics, BI, reporting, research, and workforce planning.', 110),
    ('operations_service_delivery_field_ops', 'Operations / Service Delivery / Field Ops', 'Core operations, service delivery, and field operations.', 120),
    ('customer_support_contact_center_escalations_retention', 'Customer Support / Contact Center / Escalations / Retention', 'Customer service, contact center, retention, and escalations.', 130),
    ('sales_channel_retail_enterprise_partner', 'Sales / Channel / Retail / Enterprise / Partner', 'All sales motions, retail ops, channel, and partner management.', 140),
    ('marketing_content_brand_growth_comms', 'Marketing / Content / Brand / Growth / Comms', 'Brand, content, growth, communications, and campaign roles.', 150),
    ('procurement_supply_chain_vendor_inventory', 'Procurement / Supply Chain / Vendor / Inventory', 'Sourcing, procurement, inventory, vendor, and supply chain roles.', 160),
    ('facilities_logistics_transport', 'Facilities / Logistics / Transport', 'Facilities, fleet, logistics, and transport coordination.', 170),
    ('telecom_network_noc_technical_ops', 'Telecom / Network / NOC / Technical Ops', 'Network operations, telecom, NOC, and technical operations.', 180)
) as seed(key, name, description, sort_order)
where not exists (
  select 1
  from public.job_role_families jrf
  where jrf.is_system_family = true
    and jrf.is_deleted = false
    and lower(jrf.key) = lower(seed.key)
);

insert into public.job_roles (
  company_id,
  role_family_id,
  title,
  code,
  grade_band,
  level_code,
  employment_type,
  management_scope,
  is_system_role,
  is_executive,
  supervisor_eligible,
  approver_eligible,
  delegate_eligible,
  metadata,
  is_deleted
)
select
  null,
  family.id,
  seed.title,
  seed.code,
  seed.grade_band,
  seed.level_code,
  null,
  seed.management_scope,
  true,
  seed.is_executive,
  seed.supervisor_eligible,
  seed.approver_eligible,
  seed.delegate_eligible,
  '{}'::jsonb,
  false
from (
  values
    ('governance_executive', 'Founder', 'ROLE-FOUNDER', 'G0', 'founder', 'executive', true, true, true, true),
    ('governance_executive', 'Board Member', 'ROLE-BOARD', 'G0', 'board', 'executive', true, true, true, true),
    ('governance_executive', 'Chairman', 'ROLE-CHAIR', 'G0', 'chairman', 'executive', true, true, true, true),
    ('governance_executive', 'Chief Executive Officer', 'ROLE-CEO', 'G1', 'ceo', 'executive', true, true, true, true),
    ('operations_service_delivery_field_ops', 'Chief Operating Officer', 'ROLE-COO', 'G1', 'coo', 'executive', true, true, true, true),
    ('finance_accounts_treasury_tax', 'Chief Financial Officer', 'ROLE-CFO', 'G1', 'cfo', 'executive', true, true, true, true),
    ('hr_payroll_talent_ld', 'Chief Human Resources Officer', 'ROLE-CHRO', 'G1', 'chro', 'executive', true, true, true, true),
    ('engineering_qa_architecture_devops_support', 'Chief Technology Officer', 'ROLE-CTO', 'G1', 'cto', 'executive', true, true, true, true),
    ('it_helpdesk_infrastructure_iam', 'Chief Information Officer', 'ROLE-CIO', 'G1', 'cio', 'executive', true, true, true, true),
    ('security_infosec_physical', 'Chief Information Security Officer', 'ROLE-CISO', 'G1', 'ciso', 'executive', true, true, true, true),
    ('legal_compliance_audit_risk', 'General Counsel', 'ROLE-GC', 'G1', 'gc', 'executive', true, true, true, true),
    ('strategy', 'Executive Vice President', 'ROLE-EVP', 'G2', 'evp', 'executive', true, true, true, true),
    ('strategy', 'Senior Vice President', 'ROLE-SVP', 'G3', 'svp', 'executive', true, true, true, true),
    ('strategy', 'Vice President', 'ROLE-VP', 'G4', 'vp', 'executive', true, true, true, true),
    ('operations_service_delivery_field_ops', 'Director', 'ROLE-DIRECTOR', 'G5', 'director', 'people_manager', false, true, true, true),
    ('operations_service_delivery_field_ops', 'Senior Manager', 'ROLE-SR-MANAGER', 'G6', 'senior_manager', 'people_manager', false, true, true, true),
    ('operations_service_delivery_field_ops', 'Manager', 'ROLE-MANAGER', 'G7', 'manager', 'people_manager', false, true, true, true),
    ('engineering_qa_architecture_devops_support', 'Team Lead', 'ROLE-TEAM-LEAD', 'G8', 'team_lead', 'people_manager', false, true, true, true),
    ('data_bi_reporting_research_planning', 'Senior Analyst', 'ROLE-SR-ANALYST', 'G9', 'senior_analyst', 'individual_contributor', false, false, false, false),
    ('operations_service_delivery_field_ops', 'Specialist', 'ROLE-SPECIALIST', 'G10', 'specialist', 'individual_contributor', false, false, false, false),
    ('admin_office_assets', 'Coordinator', 'ROLE-COORDINATOR', 'G11', 'coordinator', 'individual_contributor', false, false, false, false),
    ('operations_service_delivery_field_ops', 'Associate', 'ROLE-ASSOCIATE', 'G12', 'associate', 'individual_contributor', false, false, false, false)
) as seed(role_family_key, title, code, grade_band, level_code, management_scope, is_executive, supervisor_eligible, approver_eligible, delegate_eligible)
join public.job_role_families family
  on family.key = seed.role_family_key
 and family.is_system_family = true
 and family.is_deleted = false
where not exists (
  select 1
  from public.job_roles jr
  where jr.is_system_role = true
    and jr.is_deleted = false
    and lower(jr.title) = lower(seed.title)
);

insert into public.role_permissions (role_id, permission_id)
select role_row.id, permission_row.id
from public.roles role_row
join public.permissions permission_row
  on permission_row.key in (
    'manage_org_structure',
    'manage_positions',
    'manage_reporting_lines',
    'manage_delegations',
    'manage_approval_routing'
  )
where role_row.company_id is null
  and role_row.is_system_role = true
  and role_row.is_deleted = false
  and lower(role_row.name) in ('founder', 'admin', 'hr')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role_row.id, permission_row.id
from public.roles role_row
join public.permissions permission_row
  on permission_row.key in ('manage_reporting_lines', 'manage_delegations')
where role_row.company_id is null
  and role_row.is_system_role = true
  and role_row.is_deleted = false
  and lower(role_row.name) in ('manager', 'team lead')
on conflict do nothing;

alter table public.employee_reporting_lines
  drop constraint if exists employee_reporting_lines_relation_type_check;

alter table public.employee_reporting_lines
  add constraint employee_reporting_lines_relation_type_check
  check (
    relation_type in (
      'direct_manager',
      'dotted_line',
      'senior_manager',
      'team_lead',
      'hr_manager',
      'payroll_reviewer',
      'project_manager',
      'secondary_manager',
      'acting_manager',
      'delegate_approver',
      'skip_level_manager',
      'functional_manager',
      'approval_manager',
      'matrix_manager'
    )
  );

drop policy if exists employee_reporting_lines_insert on public.employee_reporting_lines;
create policy employee_reporting_lines_insert on public.employee_reporting_lines
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_employees')
      or public.current_user_has_permission('manage_reporting_lines')
    )
  );

drop policy if exists employee_reporting_lines_update on public.employee_reporting_lines;
create policy employee_reporting_lines_update on public.employee_reporting_lines
  for update
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_employees')
      or public.current_user_has_permission('manage_reporting_lines')
    )
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_employees')
      or public.current_user_has_permission('manage_reporting_lines')
    )
  );

drop policy if exists employee_reporting_lines_delete on public.employee_reporting_lines;
create policy employee_reporting_lines_delete on public.employee_reporting_lines
  for delete
  using (
    company_id = public.current_user_company_id()
    and (
      public.current_user_has_permission('manage_employees')
      or public.current_user_has_permission('manage_reporting_lines')
    )
  );

insert into public.org_units (
  company_id,
  unit_type_key,
  name,
  code,
  parent_org_unit_id,
  status,
  is_active,
  effective_from,
  metadata,
  is_deleted
)
select
  c.id,
  'company',
  c.name,
  c.slug,
  null,
  case when c.is_active then 'active'::public.org_unit_status else 'inactive'::public.org_unit_status end,
  c.is_active,
  current_date,
  jsonb_build_object('source_table', 'companies', 'source_id', c.id, 'slug', c.slug),
  false
from public.companies c
where c.is_deleted = false
  and not exists (
    select 1
    from public.org_units ou
    where ou.company_id = c.id
      and ou.unit_type_key = 'company'
      and ou.is_deleted = false
  );

insert into public.org_units (
  company_id,
  unit_type_key,
  name,
  code,
  parent_org_unit_id,
  branch_id,
  status,
  is_active,
  effective_from,
  metadata,
  is_deleted
)
select
  b.company_id,
  'branch',
  b.name,
  null,
  company_unit.id,
  b.id,
  case when b.is_active then 'active'::public.org_unit_status else 'inactive'::public.org_unit_status end,
  b.is_active,
  current_date,
  jsonb_build_object('source_table', 'branches', 'source_id', b.id, 'timezone', b.timezone),
  false
from public.branches b
join public.org_units company_unit
  on company_unit.company_id = b.company_id
 and company_unit.unit_type_key = 'company'
 and company_unit.is_deleted = false
where b.is_deleted = false
  and not exists (
    select 1
    from public.org_units ou
    where ou.branch_id = b.id
      and ou.is_deleted = false
  );

insert into public.org_units (
  company_id,
  unit_type_key,
  name,
  code,
  parent_org_unit_id,
  legacy_department_id,
  status,
  is_active,
  effective_from,
  metadata,
  is_deleted
)
select
  d.company_id,
  case when d.parent_department_id is null then 'department' else 'sub_department' end,
  d.name,
  d.cost_center_code,
  company_unit.id,
  d.id,
  case when d.is_active then 'active'::public.org_unit_status else 'inactive'::public.org_unit_status end,
  d.is_active,
  current_date,
  jsonb_build_object('source_table', 'departments', 'source_id', d.id, 'cost_center_code', d.cost_center_code),
  false
from public.departments d
join public.org_units company_unit
  on company_unit.company_id = d.company_id
 and company_unit.unit_type_key = 'company'
 and company_unit.is_deleted = false
where d.is_deleted = false
  and not exists (
    select 1
    from public.org_units ou
    where ou.legacy_department_id = d.id
      and ou.is_deleted = false
  );

update public.org_units child_unit
set parent_org_unit_id = parent_unit.id
from public.departments child_department
join public.org_units parent_unit
  on parent_unit.legacy_department_id = child_department.parent_department_id
 and parent_unit.is_deleted = false
where child_unit.legacy_department_id = child_department.id
  and child_department.parent_department_id is not null
  and child_unit.is_deleted = false;

insert into public.org_units (
  company_id,
  unit_type_key,
  name,
  code,
  parent_org_unit_id,
  legacy_team_id,
  status,
  is_active,
  effective_from,
  metadata,
  is_deleted
)
select
  t.company_id,
  'team',
  t.name,
  null,
  department_unit.id,
  t.id,
  'active'::public.org_unit_status,
  true,
  current_date,
  jsonb_build_object('source_table', 'teams', 'source_id', t.id),
  false
from public.teams t
left join public.org_units department_unit
  on department_unit.legacy_department_id = t.department_id
 and department_unit.is_deleted = false
where t.is_deleted = false
  and not exists (
    select 1
    from public.org_units ou
    where ou.legacy_team_id = t.id
      and ou.is_deleted = false
  );

create or replace view public.organization_unit_directory_v1 as
select
  ou.id,
  ou.company_id,
  ou.unit_type_key,
  outt.name as unit_type_name,
  outt.category as unit_category,
  ou.name,
  ou.code,
  ou.parent_org_unit_id,
  parent_unit.name as parent_org_unit_name,
  ou.branch_id,
  b.name as branch_name,
  ou.legacy_department_id,
  d.name as legacy_department_name,
  ou.legacy_team_id,
  t.name as legacy_team_name,
  ou.status,
  ou.is_active,
  ou.effective_from,
  ou.effective_to,
  ou.metadata,
  ou.created_at,
  ou.updated_at
from public.org_units ou
join public.org_unit_types outt
  on outt.key = ou.unit_type_key
left join public.org_units parent_unit
  on parent_unit.id = ou.parent_org_unit_id
left join public.branches b
  on b.id = ou.branch_id
left join public.departments d
  on d.id = ou.legacy_department_id
left join public.teams t
  on t.id = ou.legacy_team_id
where ou.is_deleted = false;

create or replace view public.position_assignment_snapshot_v1 as
select
  epa.id as assignment_id,
  epa.company_id,
  epa.employee_id,
  e.employee_code,
  up.full_name as employee_name,
  epa.position_id,
  op.position_code,
  coalesce(op.title_override, jr.title) as position_title,
  ou.id as org_unit_id,
  ou.name as org_unit_name,
  ou.unit_type_key,
  jr.id as job_role_id,
  jr.title as job_role_title,
  jrf.key as role_family_key,
  jrf.name as role_family_name,
  epa.assignment_type,
  epa.is_primary,
  epa.allocation_percent,
  epa.effective_from,
  epa.effective_to
from public.employee_position_assignments epa
join public.employees e
  on e.id = epa.employee_id
join public.user_profiles up
  on up.id = e.user_profile_id
join public.org_positions op
  on op.id = epa.position_id
join public.org_units ou
  on ou.id = op.org_unit_id
join public.job_roles jr
  on jr.id = op.job_role_id
join public.job_role_families jrf
  on jrf.id = jr.role_family_id
where epa.is_deleted = false
  and op.is_deleted = false
  and e.is_deleted = false
  and ou.is_deleted = false
  and jr.is_deleted = false
  and jrf.is_deleted = false;

grant usage on schema public to authenticated;
grant select on table public.org_unit_types to authenticated;
grant select, insert, update, delete on table public.org_units to authenticated;
grant select, insert, update, delete on table public.org_unit_links to authenticated;
grant select, insert, update, delete on table public.job_role_families to authenticated;
grant select, insert, update, delete on table public.job_roles to authenticated;
grant select, insert, update, delete on table public.org_positions to authenticated;
grant select, insert, update, delete on table public.position_relationships to authenticated;
grant select, insert, update, delete on table public.employee_position_assignments to authenticated;
grant select, insert, update, delete on table public.approval_delegations to authenticated;
grant select, insert, update, delete on table public.approval_routing_rules to authenticated;
grant select on table public.organization_unit_directory_v1 to authenticated;
grant select on table public.position_assignment_snapshot_v1 to authenticated;

-- ============================================
-- PHASE 1 FOUNDATION SUMMARY
-- Tables created:
--   org_unit_types, org_units, org_unit_links, job_role_families, job_roles,
--   org_positions, position_relationships, employee_position_assignments,
--   approval_delegations, approval_routing_rules
-- Views created:
--   organization_unit_directory_v1, position_assignment_snapshot_v1
-- Existing structures extended:
--   employee_reporting_lines relation types + write permissions
-- Backfill performed:
--   company, branch, department, and team units into org_units
-- ============================================
