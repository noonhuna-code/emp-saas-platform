-- EMP/supabase/phase2_01_salary_structure.sql

alter table public.salary_structures add column if not exists employee_id uuid;
alter table public.salary_structures add column if not exists salary_type text;
alter table public.salary_structures add column if not exists base_salary numeric(14,2);
alter table public.salary_structures add column if not exists effective_from date;
alter table public.salary_structures add column if not exists effective_to date;
alter table public.salary_structures add column if not exists is_active boolean not null default true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_structures_employee_fk') THEN
    ALTER TABLE public.salary_structures
      ADD CONSTRAINT salary_structures_employee_fk
      FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_structures_salary_type_chk') THEN
    ALTER TABLE public.salary_structures
      ADD CONSTRAINT salary_structures_salary_type_chk
      CHECK (salary_type in ('monthly','daily','hourly') or salary_type is null);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_structures_effective_dates_chk') THEN
    ALTER TABLE public.salary_structures
      ADD CONSTRAINT salary_structures_effective_dates_chk
      CHECK (effective_to is null or effective_to >= effective_from);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_structures_employee_effective_uniq') THEN
    ALTER TABLE public.salary_structures
      ADD CONSTRAINT salary_structures_employee_effective_uniq
      UNIQUE (employee_id, effective_from);
  END IF;
END $$;

create index if not exists salary_structures_employee_id_idx
  on public.salary_structures (employee_id)
  where is_deleted = false;

create index if not exists salary_structures_effective_from_idx
  on public.salary_structures (effective_from)
  where is_deleted = false;

create or replace function public.prevent_salary_base_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.base_salary is distinct from new.base_salary then
    raise exception 'base_salary is immutable; create a new salary row';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_salary_structures_base_salary_lock on public.salary_structures;
create trigger trg_salary_structures_base_salary_lock
  before update on public.salary_structures
  for each row execute function public.prevent_salary_base_update();

alter table public.salary_components add column if not exists value numeric(14,2);
alter table public.salary_components add column if not exists is_recurring boolean not null default false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_components_component_type_chk_v2') THEN
    ALTER TABLE public.salary_components
      ADD CONSTRAINT salary_components_component_type_chk_v2
      CHECK (component_type in ('allowance','deduction','bonus','commission'));
  END IF;
END $$;

-- ============================================
-- PHASE 2 PAYROLL ENGINE SUMMARY
-- Tables created:
-- Constraints added: salary_structures_employee_fk, salary_structures_salary_type_chk, salary_structures_effective_dates_chk, salary_structures_employee_effective_uniq, salary_components_component_type_chk_v2
-- Functions created: prevent_salary_base_update
-- Triggers created: trg_salary_structures_base_salary_lock
-- RLS policies added: none (handled in phase2_06_payroll_rls.sql)
-- ============================================
