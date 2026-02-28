-- EMP/supabase/phase2_salary_governance_patch.sql

alter table public.salary_structures
  add column if not exists status text default 'draft';

alter table public.salary_structures
  add column if not exists approved_by uuid references public.user_profiles(id) on delete restrict;

alter table public.salary_structures
  add column if not exists approved_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'salary_structures_status_chk'
      AND conrelid = 'public.salary_structures'::regclass
  ) THEN
    ALTER TABLE public.salary_structures
      ADD CONSTRAINT salary_structures_status_chk
      CHECK (status in ('draft','approved','active','superseded'));
  END IF;
END $$;

insert into public.permissions (key, description)
values
  ('manage_salary','Manage salary structures'),
  ('approve_salary','Approve salary structures'),
  ('run_payroll','Run payroll processing'),
  ('finalize_payroll','Finalize payroll runs')
on conflict (key) do nothing;

create or replace function public.validate_salary_structure_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_manage_salary boolean;
  v_approve_salary boolean;
  v_old_status text;
  v_new_status text;
  v_apply_scope_company uuid;
begin
  v_profile_id := (
    select id from public.user_profiles
    where user_id = auth.uid()
      and is_deleted = false
    limit 1
  );

  v_manage_salary := public.current_user_has_permission('manage_salary');
  v_approve_salary := public.current_user_has_permission('approve_salary');

  v_old_status := coalesce(old.status, 'draft');
  v_new_status := coalesce(new.status, 'draft');

  if tg_op = 'INSERT' then
    if not v_manage_salary then
      raise exception 'manage_salary permission required to create salary structures';
    end if;
    if new.status is null then
      new.status := 'draft';
    end if;
    return new;
  end if;

  if v_old_status in ('approved','active','superseded') then
    if (new.base_salary is distinct from old.base_salary)
       or (new.salary_type is distinct from old.salary_type)
       or (new.effective_from is distinct from old.effective_from) then
      raise exception 'salary fields immutable after approval';
    end if;
  end if;

  if v_new_status is distinct from v_old_status then
    if v_old_status = 'draft' and v_new_status = 'approved' then
      if not v_approve_salary then
        raise exception 'approve_salary permission required';
      end if;
      if new.approved_at is null then
        new.approved_at := now();
      end if;
      if new.approved_by is null then
        new.approved_by := v_profile_id;
      end if;
    elsif v_old_status = 'approved' and v_new_status = 'active' then
      if not v_approve_salary then
        raise exception 'approve_salary permission required to activate';
      end if;
    elsif v_new_status = 'active' and v_old_status <> 'approved' then
      raise exception 'only approved salary can be activated';
    elsif v_new_status = 'draft' then
      raise exception 'cannot revert salary structure to draft';
    end if;
  end if;

  if v_new_status = 'active' and v_old_status <> 'active' then
    v_apply_scope_company := new.company_id;

    if new.employee_id is not null then
      update public.salary_structures
         set status = 'superseded',
             is_active = false,
             updated_at = now(),
             updated_by = v_profile_id
       where company_id = v_apply_scope_company
         and employee_id = new.employee_id
         and id <> new.id
         and is_deleted = false
         and status = 'active';
    else
      update public.salary_structures
         set status = 'superseded',
             is_active = false,
             updated_at = now(),
             updated_by = v_profile_id
       where company_id = v_apply_scope_company
         and id <> new.id
         and is_deleted = false
         and status = 'active';
    end if;
  end if;

  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_salary_structures_status_guard'
  ) THEN
    CREATE TRIGGER trg_salary_structures_status_guard
      BEFORE INSERT OR UPDATE ON public.salary_structures
      FOR EACH ROW EXECUTE FUNCTION public.validate_salary_structure_status();
  END IF;
END $$;

create or replace function public.validate_payroll_entry_salary_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_company_id uuid;
begin
  select company_id, status
    into v_company_id, v_status
    from public.salary_structures
   where id = new.salary_structure_id
     and is_deleted = false;

  if v_company_id is null then
    raise exception 'salary structure not found';
  end if;

  if v_company_id <> new.company_id then
    raise exception 'salary structure company mismatch';
  end if;

  if v_status not in ('approved','active') then
    raise exception 'salary structure must be approved or active';
  end if;

  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payroll_entries_salary_status'
  ) THEN
    CREATE TRIGGER trg_payroll_entries_salary_status
      BEFORE INSERT ON public.payroll_entries
      FOR EACH ROW EXECUTE FUNCTION public.validate_payroll_entry_salary_status();
  END IF;
END $$;

-- ============================================
-- GOVERNANCE PATCH SUMMARY
-- Tables created: none
-- Columns added: salary_structures.status, salary_structures.approved_by, salary_structures.approved_at
-- Constraints added: salary_structures_status_chk
-- Functions created: validate_salary_structure_status, validate_payroll_entry_salary_status
-- Triggers created: trg_salary_structures_status_guard, trg_payroll_entries_salary_status
-- RLS policies added: none
-- Idempotent: YES
-- Non-destructive: YES
-- ============================================
