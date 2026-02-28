-- EMP/supabase/phase1_shift_governance_patch.sql

create table if not exists public.company_shift_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  minimum_rest_hours numeric(5,2) not null default 8,
  max_consecutive_work_days integer not null default 6,
  allow_cross_department_swap boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'company_shift_rules_company_id_uniq'
      AND conrelid = 'public.company_shift_rules'::regclass
  ) THEN
    ALTER TABLE public.company_shift_rules
      ADD CONSTRAINT company_shift_rules_company_id_uniq UNIQUE (company_id);
  END IF;
END $$;

create index if not exists company_shift_rules_company_id_idx
  on public.company_shift_rules (company_id)
  where is_deleted = false;

alter table public.company_shift_rules enable row level security;
alter table public.company_shift_rules force row level security;

drop policy if exists company_shift_rules_select on public.company_shift_rules;
drop policy if exists company_shift_rules_insert on public.company_shift_rules;
drop policy if exists company_shift_rules_update on public.company_shift_rules;

create policy company_shift_rules_select on public.company_shift_rules
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy company_shift_rules_insert on public.company_shift_rules
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_shifts')
  );

create policy company_shift_rules_update on public.company_shift_rules
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_shifts')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_shifts')
  );

create trigger trg_company_shift_rules_updated_at
  before update on public.company_shift_rules
  for each row execute function public.set_updated_at();

alter table public.shift_swap_requests
  add column if not exists requested_by uuid references public.user_profiles(id) on delete restrict;

alter table public.shift_swap_requests
  add column if not exists partner_id uuid references public.employees(id) on delete restrict;

alter table public.shift_swap_requests
  add column if not exists approved_by uuid references public.user_profiles(id) on delete restrict;

alter table public.shift_swap_requests
  add column if not exists requested_at timestamptz;

alter table public.shift_swap_requests
  add column if not exists partner_confirmed_at timestamptz;

alter table public.shift_swap_requests
  add column if not exists approved_at timestamptz;

alter table public.shift_swap_requests
  add column if not exists old_shift_id uuid;

alter table public.shift_swap_requests
  add column if not exists new_shift_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shift_swap_requests_old_shift_fk'
      AND conrelid = 'public.shift_swap_requests'::regclass
  ) THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT shift_swap_requests_old_shift_fk
      FOREIGN KEY (old_shift_id)
      REFERENCES public.shift_templates(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shift_swap_requests_new_shift_fk'
      AND conrelid = 'public.shift_swap_requests'::regclass
  ) THEN
    ALTER TABLE public.shift_swap_requests
      ADD CONSTRAINT shift_swap_requests_new_shift_fk
      FOREIGN KEY (new_shift_id)
      REFERENCES public.shift_templates(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

create or replace function public.validate_shift_swap_employee_constraints(
  p_employee_id uuid,
  p_shift_template_id uuid,
  p_shift_date date,
  p_min_rest_hours numeric,
  p_max_consecutive integer
) returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_shift record;
  v_shift_start timestamptz;
  v_shift_end timestamptz;
  v_last record;
  v_last_end timestamptz;
  v_rest_hours numeric;
  v_count integer := 1;
  v_date date;
  v_has_attendance boolean;
begin
  if p_shift_template_id is null or p_shift_date is null then
    return;
  end if;

  select start_time, end_time, timezone, is_night_shift
    into v_shift
    from public.shift_templates
   where id = p_shift_template_id
     and is_deleted = false;

  if v_shift is null then
    raise exception 'shift template not found for swap validation';
  end if;

  v_shift_start := (p_shift_date::timestamp + v_shift.start_time) at time zone v_shift.timezone;
  if v_shift.is_night_shift or v_shift.end_time < v_shift.start_time then
    v_shift_end := ((p_shift_date + 1)::timestamp + v_shift.end_time) at time zone v_shift.timezone;
  else
    v_shift_end := (p_shift_date::timestamp + v_shift.end_time) at time zone v_shift.timezone;
  end if;

  select attendance_date, check_out, shift_end_time, shift_timezone, is_night_shift
    into v_last
    from public.attendance_records
   where employee_id = p_employee_id
     and is_deleted = false
     and attendance_date < p_shift_date
   order by attendance_date desc
   limit 1;

  if v_last is not null then
    if v_last.check_out is not null then
      v_last_end := v_last.check_out;
    else
      if v_last.is_night_shift then
        v_last_end := ((v_last.attendance_date + 1)::timestamp + v_last.shift_end_time) at time zone v_last.shift_timezone;
      else
        v_last_end := (v_last.attendance_date::timestamp + v_last.shift_end_time) at time zone v_last.shift_timezone;
      end if;
    end if;

    v_rest_hours := extract(epoch from (v_shift_start - v_last_end)) / 3600.0;
    if p_min_rest_hours is not null and v_rest_hours < p_min_rest_hours then
      raise exception 'minimum rest rule violated for employee %', p_employee_id;
    end if;
  end if;

  if p_max_consecutive is not null then
    v_date := p_shift_date - 1;
    loop
      select exists (
        select 1 from public.attendance_records ar
        where ar.employee_id = p_employee_id
          and ar.attendance_date = v_date
          and ar.is_deleted = false
          and ar.status in ('present','late','half_day')
      ) into v_has_attendance;

      if v_has_attendance then
        v_count := v_count + 1;
        v_date := v_date - 1;
      else
        exit;
      end if;
    end loop;

    if v_count > p_max_consecutive then
      raise exception 'consecutive work days limit violated for employee %', p_employee_id;
    end if;
  end if;
end;
$$;

create or replace function public.validate_shift_swap_governance()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_rule record;
  v_profile_id uuid;
  v_requester_dept uuid;
  v_target_dept uuid;
  v_manager_ok boolean;
  v_employee_ok boolean;
begin
  v_profile_id := (
    select id from public.user_profiles
    where user_id = auth.uid()
      and is_deleted = false
    limit 1
  );

  if new.status = 'pending_manager' then
    new.status := 'pending_supervisor';
  end if;

  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := 'pending_partner';
    end if;

    if new.requested_at is null then
      new.requested_at := now();
    end if;

    if new.requested_by is null then
      new.requested_by := v_profile_id;
    end if;

    if new.partner_id is null then
      new.partner_id := new.target_employee_id;
    end if;

    if new.status <> 'pending_partner' then
      raise exception 'shift swap must start at pending_partner';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'approved' then
      raise exception 'approved swap requests are immutable';
    end if;

    if new.status = old.status then
      return new;
    end if;

    v_manager_ok := public.current_user_has_permission('manage_shifts');
    v_employee_ok := (public.current_user_employee_id() in (new.requester_employee_id, new.target_employee_id));

    if old.status = 'pending_partner' and new.status = 'pending_supervisor' then
      if public.current_user_employee_id() is distinct from new.target_employee_id then
        raise exception 'only partner can confirm';
      end if;
      if new.partner_confirmed_at is null then
        new.partner_confirmed_at := now();
      end if;
    elsif old.status = 'pending_partner' and new.status = 'rejected' then
      if not (v_employee_ok or v_manager_ok) then
        raise exception 'not authorized to reject';
      end if;
    elsif old.status = 'pending_supervisor' and new.status = 'approved' then
      if not v_manager_ok then
        raise exception 'manager approval required';
      end if;
      if new.approved_at is null then
        new.approved_at := now();
      end if;
      if new.approved_by is null then
        new.approved_by := v_profile_id;
      end if;

      if new.old_shift_id is null or new.new_shift_id is null then
        raise exception 'old_shift_id and new_shift_id required for approval';
      end if;

      select * into v_rule
        from public.company_shift_rules
       where company_id = new.company_id
         and is_deleted = false
       order by created_at desc
       limit 1;

      if v_rule is null then
        v_rule.minimum_rest_hours := 8;
        v_rule.max_consecutive_work_days := 6;
        v_rule.allow_cross_department_swap := false;
      end if;

      select department_id into v_requester_dept
        from public.employees
       where id = new.requester_employee_id
         and is_deleted = false;

      select department_id into v_target_dept
        from public.employees
       where id = new.target_employee_id
         and is_deleted = false;

      if coalesce(v_rule.allow_cross_department_swap, false) = false
         and v_requester_dept is distinct from v_target_dept then
        raise exception 'cross-department swap not allowed';
      end if;

      perform public.validate_shift_swap_employee_constraints(
        new.requester_employee_id,
        new.new_shift_id,
        new.shift_date,
        v_rule.minimum_rest_hours,
        v_rule.max_consecutive_work_days
      );

      perform public.validate_shift_swap_employee_constraints(
        new.target_employee_id,
        new.old_shift_id,
        new.shift_date,
        v_rule.minimum_rest_hours,
        v_rule.max_consecutive_work_days
      );
    elsif old.status = 'pending_supervisor' and new.status = 'rejected' then
      if not v_manager_ok then
        raise exception 'manager rejection required';
      end if;
    else
      raise exception 'invalid shift swap status transition';
    end if;
  end if;

  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_shift_swap_governance'
  ) THEN
    CREATE TRIGGER trg_shift_swap_governance
      BEFORE INSERT OR UPDATE ON public.shift_swap_requests
      FOR EACH ROW EXECUTE FUNCTION public.validate_shift_swap_governance();
  END IF;
END $$;

-- ============================================
-- GOVERNANCE PATCH SUMMARY
-- Tables created: company_shift_rules
-- Columns added: shift_swap_requests.requested_by, partner_id, approved_by, requested_at, partner_confirmed_at, approved_at, old_shift_id, new_shift_id
-- Constraints added: company_shift_rules_company_id_uniq, shift_swap_requests_old_shift_fk, shift_swap_requests_new_shift_fk
-- Functions created: validate_shift_swap_employee_constraints, validate_shift_swap_governance
-- Triggers created: trg_company_shift_rules_updated_at, trg_shift_swap_governance
-- RLS policies added: company_shift_rules_select/insert/update
-- Idempotent: YES
-- Non-destructive: YES
-- ============================================
