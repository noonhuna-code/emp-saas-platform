-- EMP/supabase/employee_profile_extension.sql
alter table public.employees add column if not exists employee_code text;
alter table public.employees add column if not exists profile_image_url text;
alter table public.employees add column if not exists profile_image_updated_at timestamptz;
alter table public.employees add column if not exists employment_type text;
alter table public.employees add column if not exists work_mode text;
alter table public.employees add column if not exists job_level text;
alter table public.employees add column if not exists confirmation_date date;
alter table public.employees add column if not exists probation_end_date date;
alter table public.employees add column if not exists employment_status text;
alter table public.employees add column if not exists exit_date date;
alter table public.employees add column if not exists termination_reason text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employment_type_chk') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_employment_type_chk
      CHECK (employment_type IN ('Permanent','Contract','Intern') OR employment_type IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_work_mode_chk') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_work_mode_chk
      CHECK (work_mode IN ('Remote','Onsite','Hybrid') OR work_mode IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employment_status_chk') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_employment_status_chk
      CHECK (employment_status IN ('Active','Suspended','Terminated') OR employment_status IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_exit_date_chk') THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_exit_date_chk
      CHECK (exit_date IS NULL OR confirmation_date IS NULL OR exit_date >= confirmation_date);
  END IF;
END $$;

create unique index if not exists employees_company_employee_code_uniq
  on public.employees (company_id, employee_code)
  where is_deleted = false and employee_code is not null;

create index if not exists employees_company_employment_status_idx
  on public.employees (company_id, employment_status)
  where is_deleted = false and employment_status is not null;

create index if not exists employees_company_work_mode_idx
  on public.employees (company_id, work_mode)
  where is_deleted = false and work_mode is not null;
