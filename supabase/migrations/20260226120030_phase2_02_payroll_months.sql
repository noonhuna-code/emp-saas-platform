-- EMP/supabase/phase2_02_payroll_months.sql

create table if not exists public.payroll_months (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  year integer not null,
  month integer not null,
  status text not null default 'draft',
  is_locked boolean not null default false,
  finalized_at timestamptz,
  finalized_by uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_months_status_chk') THEN
    ALTER TABLE public.payroll_months
      ADD CONSTRAINT payroll_months_status_chk
      CHECK (status in ('draft','finalized','paid'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_months_year_month_uniq') THEN
    ALTER TABLE public.payroll_months
      ADD CONSTRAINT payroll_months_year_month_uniq
      UNIQUE (company_id, year, month);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_months_lock_finalized_chk') THEN
    ALTER TABLE public.payroll_months
      ADD CONSTRAINT payroll_months_lock_finalized_chk
      CHECK (status <> 'finalized' or is_locked = true);
  END IF;
END $$;

create index if not exists payroll_months_company_id_idx
  on public.payroll_months (company_id)
  where is_deleted = false;

create index if not exists payroll_months_year_month_idx
  on public.payroll_months (year, month)
  where is_deleted = false;

create or replace function public.block_update_if_locked_payroll_month()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.is_locked then
    raise exception 'Payroll month is locked';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payroll_months_locked_update on public.payroll_months;
create trigger trg_payroll_months_locked_update
  before update on public.payroll_months
  for each row execute function public.block_update_if_locked_payroll_month();

-- ============================================
-- PHASE 2 PAYROLL ENGINE SUMMARY
-- Tables created: payroll_months
-- Constraints added: payroll_months_status_chk, payroll_months_year_month_uniq, payroll_months_lock_finalized_chk
-- Functions created: block_update_if_locked_payroll_month
-- Triggers created: trg_payroll_months_locked_update
-- RLS policies added: none (handled in phase2_06_payroll_rls.sql)
-- ============================================
