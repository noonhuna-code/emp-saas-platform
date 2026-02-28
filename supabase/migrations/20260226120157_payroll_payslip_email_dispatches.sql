-- ============================================
-- Migration: 20260226120157_payroll_payslip_email_dispatches.sql
-- Purpose: Track payslip email queue dispatches with payroll/run linkage
-- Scope: New append-only tenant-scoped table + RLS policies
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.payroll_payslip_email_dispatches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete restrict,
  payroll_entry_id uuid not null references public.payroll_entries(id) on delete restrict,
  email_queue_id uuid not null references public.email_queue(id) on delete restrict,
  queued_by_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payroll_payslip_email_dispatches_email_queue_id_uniq'
      and conrelid = 'public.payroll_payslip_email_dispatches'::regclass
  ) then
    alter table public.payroll_payslip_email_dispatches
      add constraint payroll_payslip_email_dispatches_email_queue_id_uniq
      unique (email_queue_id);
  end if;
end $$;

create index if not exists pped_company_run_created_idx
  on public.payroll_payslip_email_dispatches (company_id, payroll_run_id, created_at desc);

create index if not exists pped_company_entry_created_idx
  on public.payroll_payslip_email_dispatches (company_id, payroll_entry_id, created_at desc);

create index if not exists pped_company_queue_idx
  on public.payroll_payslip_email_dispatches (company_id, email_queue_id);

alter table public.payroll_payslip_email_dispatches enable row level security;
alter table public.payroll_payslip_email_dispatches force row level security;

drop policy if exists payroll_payslip_email_dispatches_select on public.payroll_payslip_email_dispatches;
drop policy if exists payroll_payslip_email_dispatches_insert on public.payroll_payslip_email_dispatches;

create policy payroll_payslip_email_dispatches_select on public.payroll_payslip_email_dispatches
  for select
  using (company_id = public.current_user_company_id());

create policy payroll_payslip_email_dispatches_insert on public.payroll_payslip_email_dispatches
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
    and queued_by_profile_id in (
      select up.id
      from public.user_profiles up
      where up.user_id = auth.uid()
        and up.is_deleted = false
    )
  );

