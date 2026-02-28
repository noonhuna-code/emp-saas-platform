-- EMP/supabase/phase1_09_branch_management.sql

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  address text,
  timezone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create unique index if not exists branches_company_name_uniq
  on public.branches(company_id, name)
  where is_deleted = false;

create index if not exists branches_company_id_idx
  on public.branches(company_id)
  where is_deleted = false;

alter table public.branches enable row level security;
alter table public.branches force row level security;

drop policy if exists branches_select on public.branches;
drop policy if exists branches_insert on public.branches;
drop policy if exists branches_update on public.branches;

create policy branches_select on public.branches
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy branches_insert on public.branches
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_company')
  );

create policy branches_update on public.branches
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_company')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_company')
  );

create trigger trg_branches_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();

alter table public.employees
  add column if not exists branch_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'employees_branch_id_fk'
       AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_branch_id_fk
      FOREIGN KEY (branch_id)
      REFERENCES public.branches(id)
      ON DELETE SET NULL;
  END IF;
END $$;

create index if not exists employees_branch_id_idx
  on public.employees(branch_id)
  where is_deleted = false;

-- ============================================
-- PHASE 1 MODULE SUMMARY
-- Tables created: branches
-- Columns added: employees.branch_id
-- Constraints added: employees_branch_id_fk, branches_company_name_uniq
-- Functions created: none
-- Indexes added: branches_company_id_idx, employees_branch_id_idx
-- RLS policies added: branches_select/insert/update
-- ============================================
