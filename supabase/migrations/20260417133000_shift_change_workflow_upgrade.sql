alter table public.shift_change_requests
  add column if not exists request_mode text not null default 'shift_change',
  add column if not exists target_employee_id uuid references public.employees(id) on delete restrict,
  add column if not exists target_employee_shift_template_id uuid references public.shift_templates(id) on delete restrict,
  add column if not exists team_lead_reviewed_by uuid references public.user_profiles(id) on delete restrict,
  add column if not exists team_lead_reviewed_at timestamptz,
  add column if not exists team_lead_note text,
  add column if not exists hr_reviewed_by uuid references public.user_profiles(id) on delete restrict,
  add column if not exists hr_reviewed_at timestamptz,
  add column if not exists hr_note text;

update public.shift_change_requests
set request_mode = 'shift_change'
where request_mode is distinct from 'shift_change'
  and target_employee_id is null;

update public.shift_change_requests
set status = 'pending_team_lead'
where status = 'pending';

alter table public.shift_change_requests
  drop constraint if exists shift_change_status_check;

alter table public.shift_change_requests
  add constraint shift_change_status_check
  check (status in ('pending_team_lead', 'pending_hr', 'approved', 'rejected'));

alter table public.shift_change_requests
  drop constraint if exists shift_change_request_mode_check;

alter table public.shift_change_requests
  add constraint shift_change_request_mode_check
  check (request_mode in ('shift_change', 'swap_with_agent'));

create index if not exists shift_change_requests_target_employee_id_idx
  on public.shift_change_requests (company_id, target_employee_id)
  where is_deleted = false;

create index if not exists shift_change_requests_status_idx
  on public.shift_change_requests (company_id, status)
  where is_deleted = false;

with template_seed(name, start_time, end_time) as (
  values
    ('Morning 09:00-17:00', '09:00'::time, '17:00'::time),
    ('Mid 10:00-18:00', '10:00'::time, '18:00'::time),
    ('Late Mid 11:00-19:00', '11:00'::time, '19:00'::time),
    ('Evening 12:00-20:00', '12:00'::time, '20:00'::time),
    ('Late Evening 13:00-21:00', '13:00'::time, '21:00'::time)
)
insert into public.shift_templates (
  company_id,
  name,
  start_time,
  end_time,
  timezone,
  grace_minutes,
  auto_absent_after_minutes,
  min_half_day_minutes,
  min_full_day_minutes,
  is_night_shift,
  is_active
)
select
  companies.id,
  template_seed.name,
  template_seed.start_time,
  template_seed.end_time,
  'Asia/Karachi',
  15,
  60,
  240,
  480,
  false,
  true
from public.companies
cross join template_seed
where not exists (
  select 1
  from public.shift_templates existing
  where existing.company_id = companies.id
    and existing.start_time = template_seed.start_time
    and existing.end_time = template_seed.end_time
    and existing.is_deleted = false
);
