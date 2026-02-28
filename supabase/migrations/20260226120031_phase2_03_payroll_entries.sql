-- EMP/supabase/phase2_03_payroll_entries.sql

alter table public.payroll_entries add column if not exists payroll_month_id uuid;
alter table public.payroll_entries add column if not exists salary_structure_id uuid;
alter table public.payroll_entries add column if not exists base_salary_snapshot numeric(14,2);
alter table public.payroll_entries add column if not exists total_allowances numeric(14,2);
alter table public.payroll_entries add column if not exists total_deductions numeric(14,2);
alter table public.payroll_entries add column if not exists net_salary numeric(14,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_entries_payroll_month_fk') THEN
    ALTER TABLE public.payroll_entries
      ADD CONSTRAINT payroll_entries_payroll_month_fk
      FOREIGN KEY (payroll_month_id) REFERENCES public.payroll_months(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_entries_salary_structure_fk') THEN
    ALTER TABLE public.payroll_entries
      ADD CONSTRAINT payroll_entries_salary_structure_fk
      FOREIGN KEY (salary_structure_id) REFERENCES public.salary_structures(id) ON DELETE RESTRICT;
  END IF;
END $$;

create index if not exists payroll_entries_payroll_month_id_idx
  on public.payroll_entries (payroll_month_id)
  where is_deleted = false;

create index if not exists payroll_entries_salary_structure_id_idx
  on public.payroll_entries (salary_structure_id)
  where is_deleted = false;

create index if not exists payroll_entries_company_id_idx
  on public.payroll_entries (company_id)
  where is_deleted = false;

create or replace function public.validate_payroll_entry_lock()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_locked boolean;
begin
  select is_locked into v_locked
  from public.payroll_months
  where id = new.payroll_month_id
    and is_deleted = false;

  if v_locked then
    raise exception 'Payroll month is locked';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payroll_entries_month_lock on public.payroll_entries;
create trigger trg_payroll_entries_month_lock
  before update on public.payroll_entries
  for each row execute function public.validate_payroll_entry_lock();

create or replace function public.block_delete_payroll_entries()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Deleting payroll entries is not allowed';
end;
$$;

drop trigger if exists trg_payroll_entries_block_delete on public.payroll_entries;
create trigger trg_payroll_entries_block_delete
  before delete on public.payroll_entries
  for each row execute function public.block_delete_payroll_entries();

-- ============================================
-- PHASE 2 PAYROLL ENGINE SUMMARY
-- Tables created: none (extended payroll_entries)
-- Constraints added: payroll_entries_payroll_month_fk, payroll_entries_salary_structure_fk
-- Functions created: validate_payroll_entry_lock, block_delete_payroll_entries
-- Triggers created: trg_payroll_entries_month_lock, trg_payroll_entries_block_delete
-- RLS policies added: none (handled in phase2_06_payroll_rls.sql)
-- ============================================
