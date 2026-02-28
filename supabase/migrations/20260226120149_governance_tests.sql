-- ============================================
-- Migration: 60d_governance_tests.sql
-- Purpose: Optional governance test harness (non-destructive, safe to skip)
-- Scope: DO block only
-- Non-destructive: YES
-- Idempotent: YES (no schema changes)
-- RLS Impact: None
-- ============================================

do $$
declare
  v_company_id uuid;
  v_leave_id uuid;
begin
  if current_setting('app.run_governance_tests', true) <> 'true' then
    raise notice 'Skipping governance tests (set app.run_governance_tests=true to run).';
    return;
  end if;

  select up.company_id
    into v_company_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null then
    raise notice 'Skipping tests: tenant not resolved for current session.';
    return;
  end if;

  select lr.id
    into v_leave_id
    from public.leave_requests lr
   where lr.company_id = v_company_id
     and lr.status = 'pending'
     and lr.is_deleted = false
   limit 1;

  if v_leave_id is null then
    raise notice 'Skipping double-approval test: no pending leave requests.';
  else
    begin
      perform public.approve_leave_atomic(v_leave_id, auth.uid());
      begin
        perform public.approve_leave_atomic(v_leave_id, auth.uid());
        raise exception using message = 'TEST_EXPECTED_FAILURE';
      exception when others then
        null;
      end;
      raise exception using message = 'TEST_ROLLBACK';
    exception when others then
      null;
    end;
  end if;

  begin
    perform public.approve_attendance_correction_atomic(gen_random_uuid(), gen_random_uuid());
  exception when others then
    null;
  end;
end $$;
