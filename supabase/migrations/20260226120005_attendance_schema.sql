create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  start_time time not null,
  end_time time not null,
  timezone text not null default 'UTC',
  grace_minutes integer not null default 15,
  auto_absent_after_minutes integer not null default 60,
  min_half_day_minutes integer not null,
  min_full_day_minutes integer not null,
  is_night_shift boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists shift_templates_company_id_idx on public.shift_templates (company_id);
create unique index if not exists shift_templates_company_name_uniq on public.shift_templates (company_id, name) where is_deleted = false;

create table if not exists public.employee_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  shift_template_id uuid not null references public.shift_templates(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  assigned_by uuid not null references public.user_profiles(id) on delete restrict,
  assignment_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint employee_shift_assignments_date_check check (effective_to is null or effective_to >= effective_from)
);

create index if not exists employee_shift_assignments_company_id_idx on public.employee_shift_assignments (company_id);
create index if not exists employee_shift_assignments_employee_id_idx on public.employee_shift_assignments (employee_id);
create index if not exists employee_shift_assignments_shift_template_id_idx on public.employee_shift_assignments (shift_template_id);
create index if not exists employee_shift_assignments_effective_from_idx on public.employee_shift_assignments (effective_from);

alter table public.employee_shift_assignments
  add constraint employee_shift_assignments_no_overlap
  exclude using gist (
    company_id with =,
    employee_id with =,
    daterange(
      effective_from,
      coalesce((effective_to + 1), 'infinity'::date),
      '[)'
    ) with &&
  )
  where (is_deleted = false);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  attendance_date date not null,
  shift_template_id uuid not null references public.shift_templates(id) on delete restrict,
  shift_start_time time not null,
  shift_end_time time not null,
  shift_timezone text not null default 'UTC',
  grace_minutes integer not null,
  auto_absent_after_minutes integer not null,
  min_half_day_minutes integer not null,
  min_full_day_minutes integer not null,
  is_night_shift boolean not null default false,
  check_in timestamptz,
  check_out timestamptz,
  late_minutes integer,
  work_minutes integer,
  status text not null,
  auto_marked boolean not null default false,
  marked_by uuid references public.user_profiles(id) on delete restrict,
  override_reason text,
  approval_status text not null default 'none',
  approved_by uuid references public.user_profiles(id) on delete restrict,
  approved_at timestamptz,
  attendance_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint attendance_status_check
    check (status in ('pending','present','late','half_day','absent','on_leave','holiday')),
  constraint attendance_approval_status_check
    check (approval_status in ('none','pending','approved','rejected'))
);

create index if not exists attendance_records_company_id_idx on public.attendance_records (company_id);
create index if not exists attendance_records_employee_id_idx on public.attendance_records (employee_id);
create index if not exists attendance_records_shift_template_id_idx on public.attendance_records (shift_template_id);
create unique index if not exists attendance_records_unique_day
  on public.attendance_records (company_id, employee_id, attendance_date)
  where is_deleted = false;

create table if not exists public.shift_change_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  attendance_date date not null,
  old_shift_template_id uuid not null references public.shift_templates(id) on delete restrict,
  requested_shift_template_id uuid not null references public.shift_templates(id) on delete restrict,
  reason text not null,
  status text not null,
  requested_by uuid references public.user_profiles(id) on delete restrict,
  reviewed_by uuid references public.user_profiles(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint shift_change_status_check check (status in ('pending','approved','rejected'))
);

create index if not exists shift_change_requests_company_id_idx on public.shift_change_requests (company_id);
create index if not exists shift_change_requests_employee_id_idx on public.shift_change_requests (employee_id);
create index if not exists shift_change_requests_old_shift_idx on public.shift_change_requests (old_shift_template_id);
create index if not exists shift_change_requests_requested_shift_idx on public.shift_change_requests (requested_shift_template_id);

create table if not exists public.attendance_escalations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  attendance_id uuid not null references public.attendance_records(id) on delete restrict,
  escalated_to uuid not null references public.employees(id) on delete restrict,
  escalation_level integer not null default 1,
  resolved boolean not null default false,
  resolved_by uuid references public.user_profiles(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists attendance_escalations_company_id_idx on public.attendance_escalations (company_id);
create index if not exists attendance_escalations_attendance_id_idx on public.attendance_escalations (attendance_id);
create index if not exists attendance_escalations_escalated_to_idx on public.attendance_escalations (escalated_to);

create table if not exists public.attendance_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  attendance_id uuid not null references public.attendance_records(id) on delete restrict,
  action text not null,
  old_status text,
  new_status text,
  reason text,
  changed_by uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists attendance_audit_events_company_id_idx on public.attendance_audit_events (company_id);
create index if not exists attendance_audit_events_attendance_id_idx on public.attendance_audit_events (attendance_id);

create table if not exists public.company_holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  holiday_date date not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

create index if not exists company_holidays_company_id_idx on public.company_holidays (company_id);
create unique index if not exists company_holidays_company_date_uniq
  on public.company_holidays (company_id, holiday_date)
  where is_deleted = false;
