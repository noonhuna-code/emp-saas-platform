-- ============================================
-- Migration: 20260302213000_attendance_geo_events.sql
-- Purpose : Attendance geolocation event log (append-only)
-- Scope   : Additive, tenant-scoped, immutable
-- ============================================

create table if not exists public.attendance_geo_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  attendance_id uuid not null references public.attendance_records(id) on delete restrict,
  event_type text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  accuracy_meters numeric(8, 2),
  source text not null default 'web',
  captured_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint attendance_geo_events_event_type_chk check (event_type in ('clock_in', 'clock_out')),
  constraint attendance_geo_events_latitude_chk check (latitude between -90 and 90),
  constraint attendance_geo_events_longitude_chk check (longitude between -180 and 180),
  constraint attendance_geo_events_accuracy_chk check (accuracy_meters is null or accuracy_meters >= 0),
  constraint attendance_geo_events_source_chk check (btrim(source) <> '')
);

create index if not exists attendance_geo_events_company_employee_captured_idx
  on public.attendance_geo_events (company_id, employee_id, captured_at desc);

create index if not exists attendance_geo_events_company_attendance_captured_idx
  on public.attendance_geo_events (company_id, attendance_id, captured_at desc);

create index if not exists attendance_geo_events_company_event_captured_idx
  on public.attendance_geo_events (company_id, event_type, captured_at desc);

alter table public.attendance_geo_events enable row level security;
alter table public.attendance_geo_events force row level security;

drop policy if exists attendance_geo_events_select on public.attendance_geo_events;
drop policy if exists attendance_geo_events_insert on public.attendance_geo_events;

create policy attendance_geo_events_select on public.attendance_geo_events
  for select
  using (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy attendance_geo_events_insert on public.attendance_geo_events
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
    and exists (
      select 1
      from public.attendance_records ar
      where ar.id = attendance_id
        and ar.company_id = public.current_user_company_id()
        and ar.employee_id = employee_id
        and ar.is_deleted = false
    )
  );

create or replace function public.raise_attendance_geo_events_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'attendance_geo_events are immutable';
end;
$$;

drop trigger if exists trg_attendance_geo_events_immutable_update on public.attendance_geo_events;
create trigger trg_attendance_geo_events_immutable_update
  before update on public.attendance_geo_events
  for each row
  execute function public.raise_attendance_geo_events_immutable();

drop trigger if exists trg_attendance_geo_events_immutable_delete on public.attendance_geo_events;
create trigger trg_attendance_geo_events_immutable_delete
  before delete on public.attendance_geo_events
  for each row
  execute function public.raise_attendance_geo_events_immutable();
