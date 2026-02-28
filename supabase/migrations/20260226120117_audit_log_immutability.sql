-- ============================================
-- Migration: 78_audit_log_immutability.sql
-- Purpose: Enforce append-only audit logs
-- Scope: New guard function + triggers
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'AUDIT_IMMUTABLE';
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_approval_audit_log_block_update') then
    create trigger trg_approval_audit_log_block_update
      before update on public.approval_audit_log
      for each row execute function public.prevent_audit_mutation();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_approval_audit_log_block_delete') then
    create trigger trg_approval_audit_log_block_delete
      before delete on public.approval_audit_log
      for each row execute function public.prevent_audit_mutation();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_salary_revision_audit_log_block_update') then
    create trigger trg_salary_revision_audit_log_block_update
      before update on public.salary_revision_audit_log
      for each row execute function public.prevent_audit_mutation();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_salary_revision_audit_log_block_delete') then
    create trigger trg_salary_revision_audit_log_block_delete
      before delete on public.salary_revision_audit_log
      for each row execute function public.prevent_audit_mutation();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_task_status_history_block_update') then
    create trigger trg_task_status_history_block_update
      before update on public.task_status_history
      for each row execute function public.prevent_audit_mutation();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_task_status_history_block_delete') then
    create trigger trg_task_status_history_block_delete
      before delete on public.task_status_history
      for each row execute function public.prevent_audit_mutation();
  end if;
end $$;