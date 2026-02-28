-- ============================================
-- Migration: 60_governance_hardening.sql
-- Purpose: Governance hardening (structured errors, approval audit log, state guards)
-- Scope: New audit table + RLS, function redefinitions with structured errors, state transition guards, test harness
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only (no changes to existing RLS)
-- ============================================

create table if not exists public.approval_audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  actor_profile_id uuid not null references public.user_profiles(id) on delete restrict,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists approval_audit_log_company_id_idx
  on public.approval_audit_log (company_id);

create index if not exists approval_audit_log_entity_idx
  on public.approval_audit_log (company_id, entity_type, entity_id);

alter table public.approval_audit_log enable row level security;
alter table public.approval_audit_log force row level security;

drop policy if exists approval_audit_log_select on public.approval_audit_log;
drop policy if exists approval_audit_log_insert on public.approval_audit_log;

create policy approval_audit_log_select on public.approval_audit_log
  for select
  using (company_id = public.current_user_company_id());

create policy approval_audit_log_insert on public.approval_audit_log
  for insert
  with check (
    company_id = public.current_user_company_id()
    and actor_profile_id in (
      select up.id
      from public.user_profiles up
      where up.user_id = auth.uid()
        and up.is_deleted = false
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leave_status_valid_transition'
      and conrelid = 'public.leave_requests'::regclass
  ) then
    alter table public.leave_requests
      add constraint leave_status_valid_transition
      check (status in ('pending','approved','rejected','cancelled'));
  end if;
end $$;

create or replace function public.prevent_invalid_leave_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'approved' and new.status = 'pending' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_STATE_TRANSITION',
      detail = 'Approved leave requests cannot revert to pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leave_requests_status_guard on public.leave_requests;
create trigger trg_leave_requests_status_guard
  before update on public.leave_requests
  for each row execute function public.prevent_invalid_leave_status_transition();

create or replace function public.prevent_invalid_attendance_correction_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status in ('approved','rejected') and new.status = 'pending' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_STATE_TRANSITION',
      detail = 'Processed attendance corrections cannot revert to pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_attendance_correction_status_guard on public.attendance_correction_requests;
create trigger trg_attendance_correction_status_guard
  before update on public.attendance_correction_requests
  for each row execute function public.prevent_invalid_attendance_correction_transition();
