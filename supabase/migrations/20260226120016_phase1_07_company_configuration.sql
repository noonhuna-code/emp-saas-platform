-- EMP/supabase/phase1_07_company_configuration.sql

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete restrict,
  company_name text,
  logo_url text,
  timezone text,
  default_working_hours_per_day numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists company_settings_company_id_idx
  on public.company_settings(company_id)
  where is_deleted = false;

alter table public.company_settings enable row level security;
alter table public.company_settings force row level security;

drop policy if exists company_settings_select on public.company_settings;
drop policy if exists company_settings_insert on public.company_settings;
drop policy if exists company_settings_update on public.company_settings;

create policy company_settings_select on public.company_settings
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy company_settings_insert on public.company_settings
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_company')
  );

create policy company_settings_update on public.company_settings
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

create trigger trg_company_settings_updated_at
  before update on public.company_settings
  for each row execute function public.set_updated_at();

-- ============================================
-- PHASE 1 MODULE SUMMARY
-- Tables created: company_settings
-- Columns added: none
-- Constraints added: company_settings company_id unique
-- Functions created: none
-- Indexes added: company_settings_company_id_idx
-- RLS policies added: company_settings_select/insert/update
-- ============================================
