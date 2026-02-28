-- ============================================
-- Migration: 70_soft_delete_employees_select_self.sql
-- Purpose: Ensure employees_select_self excludes soft-deleted rows
-- Scope: RLS policy replacement only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Tightens select policy for employees self access
-- ============================================

drop policy if exists employees_select_self on public.employees;
create policy employees_select_self on public.employees
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and user_profile_id = (
      select up.id
      from public.user_profiles up
      where up.user_id = auth.uid()
        and up.is_deleted = false
      limit 1
    )
  );

