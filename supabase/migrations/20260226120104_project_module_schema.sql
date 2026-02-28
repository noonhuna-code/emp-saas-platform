-- ============================================
-- Migration: 65_project_module_schema.sql
-- Purpose: Project management core tables with tenant-safe constraints
-- Scope: New tables, indexes, RLS policies, validation triggers
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New tables only
-- ============================================

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  description text,
  status text not null default 'active',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'projects_status_chk'
       and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_status_chk
      check (status in ('active','on_hold','completed','archived'));
  end if;
end $$;

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'normal',
  assignee_employee_id uuid references public.employees(id) on delete restrict,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'project_tasks_status_chk'
       and conrelid = 'public.project_tasks'::regclass
  ) then
    alter table public.project_tasks
      add constraint project_tasks_status_chk
      check (status in ('todo','in_progress','blocked','done'));
  end if;
end $$;

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  task_id uuid not null references public.project_tasks(id) on delete restrict,
  author_employee_id uuid not null references public.employees(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  task_id uuid not null references public.project_tasks(id) on delete restrict,
  old_status text,
  new_status text not null,
  changed_by uuid references public.employees(id) on delete restrict,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists projects_company_id_idx
  on public.projects (company_id)
  where is_deleted = false;

create index if not exists project_members_company_id_idx
  on public.project_members (company_id)
  where is_deleted = false;

create unique index if not exists project_members_company_project_employee_uidx
  on public.project_members (company_id, project_id, employee_id)
  where is_deleted = false;

create index if not exists project_tasks_company_id_idx
  on public.project_tasks (company_id)
  where is_deleted = false;

create index if not exists project_tasks_project_id_idx
  on public.project_tasks (project_id)
  where is_deleted = false;

create index if not exists project_tasks_assignee_employee_id_idx
  on public.project_tasks (assignee_employee_id)
  where is_deleted = false;

create index if not exists project_tasks_status_idx
  on public.project_tasks (status)
  where is_deleted = false;

create index if not exists task_comments_company_id_idx
  on public.task_comments (company_id)
  where is_deleted = false;

create index if not exists task_comments_task_id_idx
  on public.task_comments (task_id)
  where is_deleted = false;

create index if not exists task_status_history_company_id_idx
  on public.task_status_history (company_id)
  where is_deleted = false;

create index if not exists task_status_history_task_id_idx
  on public.task_status_history (task_id)
  where is_deleted = false;

alter table public.projects enable row level security;
alter table public.projects force row level security;

alter table public.project_members enable row level security;
alter table public.project_members force row level security;

alter table public.project_tasks enable row level security;
alter table public.project_tasks force row level security;

alter table public.task_comments enable row level security;
alter table public.task_comments force row level security;

alter table public.task_status_history enable row level security;
alter table public.task_status_history force row level security;

drop policy if exists projects_select on public.projects;
drop policy if exists projects_insert on public.projects;
drop policy if exists projects_update on public.projects;

drop policy if exists project_members_select on public.project_members;
drop policy if exists project_members_insert on public.project_members;
drop policy if exists project_members_update on public.project_members;

drop policy if exists project_tasks_select on public.project_tasks;
drop policy if exists project_tasks_insert on public.project_tasks;
drop policy if exists project_tasks_update on public.project_tasks;

drop policy if exists task_comments_select on public.task_comments;
drop policy if exists task_comments_insert on public.task_comments;
drop policy if exists task_comments_update on public.task_comments;

drop policy if exists task_status_history_select on public.task_status_history;
drop policy if exists task_status_history_insert on public.task_status_history;
drop policy if exists task_status_history_update on public.task_status_history;

create policy projects_select on public.projects
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy projects_insert on public.projects
  for insert
  with check (company_id = public.current_user_company_id());

create policy projects_update on public.projects
  for update
  using (company_id = public.current_user_company_id() and is_deleted = false)
  with check (company_id = public.current_user_company_id());

create policy project_members_select on public.project_members
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy project_members_insert on public.project_members
  for insert
  with check (company_id = public.current_user_company_id());

create policy project_members_update on public.project_members
  for update
  using (company_id = public.current_user_company_id() and is_deleted = false)
  with check (company_id = public.current_user_company_id());

create policy project_tasks_select on public.project_tasks
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy project_tasks_insert on public.project_tasks
  for insert
  with check (company_id = public.current_user_company_id());

create policy project_tasks_update on public.project_tasks
  for update
  using (company_id = public.current_user_company_id() and is_deleted = false)
  with check (company_id = public.current_user_company_id());

create policy task_comments_select on public.task_comments
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy task_comments_insert on public.task_comments
  for insert
  with check (company_id = public.current_user_company_id());

create policy task_comments_update on public.task_comments
  for update
  using (company_id = public.current_user_company_id() and is_deleted = false)
  with check (company_id = public.current_user_company_id());

create policy task_status_history_select on public.task_status_history
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy task_status_history_insert on public.task_status_history
  for insert
  with check (company_id = public.current_user_company_id());

create policy task_status_history_update on public.task_status_history
  for update
  using (company_id = public.current_user_company_id() and is_deleted = false)
  with check (company_id = public.current_user_company_id());

create or replace function public.validate_project_members_company()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_project_company_id uuid;
  v_employee_company_id uuid;
begin
  select company_id
    into v_project_company_id
    from public.projects
   where id = new.project_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_project_company_id);

  select company_id
    into v_employee_company_id
    from public.employees
   where id = new.employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company_id);

  return new;
end;
$$;

create or replace function public.validate_project_tasks_company()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_project_company_id uuid;
  v_employee_company_id uuid;
begin
  select company_id
    into v_project_company_id
    from public.projects
   where id = new.project_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_project_company_id);

  if new.assignee_employee_id is not null then
    select company_id
      into v_employee_company_id
      from public.employees
     where id = new.assignee_employee_id
       and is_deleted = false;

    perform public.validate_company_consistency(new.company_id, v_employee_company_id);
  end if;

  return new;
end;
$$;

create or replace function public.validate_task_comments_company()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_task_company_id uuid;
  v_employee_company_id uuid;
begin
  select company_id
    into v_task_company_id
    from public.project_tasks
   where id = new.task_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_task_company_id);

  select company_id
    into v_employee_company_id
    from public.employees
   where id = new.author_employee_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company_id);

  return new;
end;
$$;

create or replace function public.validate_task_status_history_company()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_task_company_id uuid;
  v_employee_company_id uuid;
begin
  select company_id
    into v_task_company_id
    from public.project_tasks
   where id = new.task_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_task_company_id);

  if new.changed_by is not null then
    select company_id
      into v_employee_company_id
      from public.employees
     where id = new.changed_by
       and is_deleted = false;

    perform public.validate_company_consistency(new.company_id, v_employee_company_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_project_members_updated_at on public.project_members;
create trigger trg_project_members_updated_at
  before update on public.project_members
  for each row execute function public.set_updated_at();

drop trigger if exists trg_project_tasks_updated_at on public.project_tasks;
create trigger trg_project_tasks_updated_at
  before update on public.project_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_task_comments_updated_at on public.task_comments;
create trigger trg_task_comments_updated_at
  before update on public.task_comments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_task_status_history_updated_at on public.task_status_history;
create trigger trg_task_status_history_updated_at
  before update on public.task_status_history
  for each row execute function public.set_updated_at();

drop trigger if exists trg_project_members_company_guard on public.project_members;
create trigger trg_project_members_company_guard
  before insert or update on public.project_members
  for each row execute function public.validate_project_members_company();

drop trigger if exists trg_project_tasks_company_guard on public.project_tasks;
create trigger trg_project_tasks_company_guard
  before insert or update on public.project_tasks
  for each row execute function public.validate_project_tasks_company();

drop trigger if exists trg_task_comments_company_guard on public.task_comments;
create trigger trg_task_comments_company_guard
  before insert or update on public.task_comments
  for each row execute function public.validate_task_comments_company();

drop trigger if exists trg_task_status_history_company_guard on public.task_status_history;
create trigger trg_task_status_history_company_guard
  before insert or update on public.task_status_history
  for each row execute function public.validate_task_status_history_company();
