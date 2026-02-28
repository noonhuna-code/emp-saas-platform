-- EMP/supabase/phase1_10_employee_portal_modules.sql

create table if not exists public.employee_education (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  grade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.employee_skills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  skill_name text not null,
  proficiency text,
  years_experience numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.employee_trainings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  title text not null,
  provider text,
  completion_date date,
  certificate_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.employee_languages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  language text not null,
  proficiency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.employee_employment_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  employer_name text not null,
  title text,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists employee_education_company_id_idx
  on public.employee_education(company_id)
  where is_deleted = false;
create index if not exists employee_education_employee_id_idx
  on public.employee_education(employee_id)
  where is_deleted = false;

create index if not exists employee_skills_company_id_idx
  on public.employee_skills(company_id)
  where is_deleted = false;
create index if not exists employee_skills_employee_id_idx
  on public.employee_skills(employee_id)
  where is_deleted = false;

create index if not exists employee_trainings_company_id_idx
  on public.employee_trainings(company_id)
  where is_deleted = false;
create index if not exists employee_trainings_employee_id_idx
  on public.employee_trainings(employee_id)
  where is_deleted = false;

create index if not exists employee_languages_company_id_idx
  on public.employee_languages(company_id)
  where is_deleted = false;
create index if not exists employee_languages_employee_id_idx
  on public.employee_languages(employee_id)
  where is_deleted = false;

create index if not exists employee_employment_history_company_id_idx
  on public.employee_employment_history(company_id)
  where is_deleted = false;
create index if not exists employee_employment_history_employee_id_idx
  on public.employee_employment_history(employee_id)
  where is_deleted = false;

alter table public.employee_education enable row level security;
alter table public.employee_education force row level security;
alter table public.employee_skills enable row level security;
alter table public.employee_skills force row level security;
alter table public.employee_trainings enable row level security;
alter table public.employee_trainings force row level security;
alter table public.employee_languages enable row level security;
alter table public.employee_languages force row level security;
alter table public.employee_employment_history enable row level security;
alter table public.employee_employment_history force row level security;

drop policy if exists employee_education_select on public.employee_education;
drop policy if exists employee_education_insert on public.employee_education;
drop policy if exists employee_education_update on public.employee_education;

drop policy if exists employee_skills_select on public.employee_skills;
drop policy if exists employee_skills_insert on public.employee_skills;
drop policy if exists employee_skills_update on public.employee_skills;

drop policy if exists employee_trainings_select on public.employee_trainings;
drop policy if exists employee_trainings_insert on public.employee_trainings;
drop policy if exists employee_trainings_update on public.employee_trainings;

drop policy if exists employee_languages_select on public.employee_languages;
drop policy if exists employee_languages_insert on public.employee_languages;
drop policy if exists employee_languages_update on public.employee_languages;

drop policy if exists employee_employment_history_select on public.employee_employment_history;
drop policy if exists employee_employment_history_insert on public.employee_employment_history;
drop policy if exists employee_employment_history_update on public.employee_employment_history;

create policy employee_education_select on public.employee_education
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_education_insert on public.employee_education
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_education_update on public.employee_education
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_skills_select on public.employee_skills
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_skills_insert on public.employee_skills
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_skills_update on public.employee_skills
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_trainings_select on public.employee_trainings
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_trainings_insert on public.employee_trainings
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_trainings_update on public.employee_trainings
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_languages_select on public.employee_languages
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_languages_insert on public.employee_languages
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_languages_update on public.employee_languages
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_employment_history_select on public.employee_employment_history
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_employment_history_insert on public.employee_employment_history
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_employment_history_update on public.employee_employment_history
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create trigger trg_employee_education_updated_at
  before update on public.employee_education
  for each row execute function public.set_updated_at();

create trigger trg_employee_skills_updated_at
  before update on public.employee_skills
  for each row execute function public.set_updated_at();

create trigger trg_employee_trainings_updated_at
  before update on public.employee_trainings
  for each row execute function public.set_updated_at();

create trigger trg_employee_languages_updated_at
  before update on public.employee_languages
  for each row execute function public.set_updated_at();

create trigger trg_employee_employment_history_updated_at
  before update on public.employee_employment_history
  for each row execute function public.set_updated_at();

-- ============================================
-- PHASE 1 MODULE SUMMARY
-- Tables created: employee_education, employee_skills, employee_trainings, employee_languages, employee_employment_history
-- Columns added: none
-- Constraints added: none
-- Functions created: none
-- Indexes added: company_id/employee_id indexes for all portal tables
-- RLS policies added: select/insert/update for all portal tables
-- ============================================
