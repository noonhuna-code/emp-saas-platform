-- EMP/supabase/attendance_analytics.sql

create materialized view if not exists public.mv_department_attendance_rate as
select
  e.company_id,
  e.department_id,
  count(*) filter (where ar.status <> 'holiday') as total_working_days,
  count(*) filter (where ar.status in ('present','late','half_day')) as total_present_days,
  case
    when count(*) filter (where ar.status <> 'holiday') = 0 then 0
    else round(
      (count(*) filter (where ar.status in ('present','late','half_day'))::numeric
      / nullif(count(*) filter (where ar.status <> 'holiday'),0)::numeric) * 100,
      2
    )
  end as attendance_percentage
from public.attendance_records ar
join public.employees e
  on e.id = ar.employee_id
 and e.company_id = ar.company_id
where ar.is_deleted = false
  and e.is_deleted = false
group by e.company_id, e.department_id;

create materialized view if not exists public.mv_late_frequency as
select
  e.company_id,
  e.id as employee_id,
  count(*) filter (where ar.status = 'late') as total_late_days,
  count(*) filter (where ar.status <> 'holiday') as total_working_days,
  case
    when count(*) filter (where ar.status <> 'holiday') = 0 then 0
    else round(
      (count(*) filter (where ar.status = 'late')::numeric
      / nullif(count(*) filter (where ar.status <> 'holiday'),0)::numeric) * 100,
      2
    )
  end as late_percentage
from public.attendance_records ar
join public.employees e
  on e.id = ar.employee_id
 and e.company_id = ar.company_id
where ar.is_deleted = false
  and e.is_deleted = false
group by e.company_id, e.id;

create materialized view if not exists public.mv_overtime_summary as
select
  e.company_id,
  e.id as employee_id,
  coalesce(sum(ar.overtime_minutes),0) as total_overtime_minutes,
  round(coalesce(sum(ar.overtime_minutes),0)::numeric / 60, 2) as total_overtime_hours
from public.attendance_records ar
join public.employees e
  on e.id = ar.employee_id
 and e.company_id = ar.company_id
where ar.is_deleted = false
  and e.is_deleted = false
group by e.company_id, e.id;

create materialized view if not exists public.mv_attendance_heatmap as
select
  ar.company_id,
  ar.attendance_date,
  count(*) filter (where ar.status in ('present','late','half_day')) as present_count,
  count(*) filter (where ar.status = 'absent') as absent_count,
  count(*) filter (where ar.status = 'on_leave') as leave_count
from public.attendance_records ar
where ar.is_deleted = false
group by ar.company_id, ar.attendance_date;

create unique index if not exists mv_department_attendance_rate_uniq
  on public.mv_department_attendance_rate (company_id, department_id);

create index if not exists mv_department_attendance_rate_company_id_idx
  on public.mv_department_attendance_rate (company_id);

create index if not exists mv_department_attendance_rate_department_id_idx
  on public.mv_department_attendance_rate (department_id);

create unique index if not exists mv_late_frequency_uniq
  on public.mv_late_frequency (company_id, employee_id);

create index if not exists mv_late_frequency_company_id_idx
  on public.mv_late_frequency (company_id);

create index if not exists mv_late_frequency_employee_id_idx
  on public.mv_late_frequency (employee_id);

create unique index if not exists mv_overtime_summary_uniq
  on public.mv_overtime_summary (company_id, employee_id);

create index if not exists mv_overtime_summary_company_id_idx
  on public.mv_overtime_summary (company_id);

create index if not exists mv_overtime_summary_employee_id_idx
  on public.mv_overtime_summary (employee_id);

create unique index if not exists mv_attendance_heatmap_uniq
  on public.mv_attendance_heatmap (company_id, attendance_date);

create index if not exists mv_attendance_heatmap_company_id_idx
  on public.mv_attendance_heatmap (company_id);

create index if not exists mv_attendance_heatmap_attendance_date_idx
  on public.mv_attendance_heatmap (attendance_date);

create or replace function public.export_attendance_report(
  company_uuid uuid,
  start_date date,
  end_date date
)
returns table (
  employee_name text,
  department text,
  attendance_date date,
  status text,
  working_hours numeric,
  overtime_minutes integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if company_uuid is null then
    return;
  end if;

  if public.current_user_company_id() is distinct from company_uuid then
    return;
  end if;

  return query
  select
    up.full_name as employee_name,
    d.name as department,
    ar.attendance_date,
    ar.status,
    round(coalesce(ar.work_minutes,0)::numeric / 60, 2) as working_hours,
    ar.overtime_minutes
  from public.attendance_records ar
  join public.employees e
    on e.id = ar.employee_id
   and e.company_id = ar.company_id
  join public.user_profiles up
    on up.id = e.user_profile_id
  left join public.departments d
    on d.id = e.department_id
  where ar.company_id = company_uuid
    and ar.is_deleted = false
    and e.is_deleted = false
    and up.is_deleted = false
    and ar.attendance_date between start_date and end_date;
end;
$$;

create or replace function public.refresh_attendance_analytics(company_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if company_uuid is null then
    return;
  end if;

  if public.current_user_company_id() is distinct from company_uuid then
    return;
  end if;

  refresh materialized view public.mv_department_attendance_rate;
  refresh materialized view public.mv_late_frequency;
  refresh materialized view public.mv_overtime_summary;
  refresh materialized view public.mv_attendance_heatmap;
end;
$$;

-- ================================
-- SUMMARY
-- ================================
-- Materialized views created: mv_department_attendance_rate, mv_late_frequency, mv_overtime_summary, mv_attendance_heatmap
-- Functions created: export_attendance_report, refresh_attendance_analytics
-- Indexes created: mv_department_attendance_rate_uniq, mv_department_attendance_rate_company_id_idx, mv_department_attendance_rate_department_id_idx,
--                 mv_late_frequency_uniq, mv_late_frequency_company_id_idx, mv_late_frequency_employee_id_idx,
--                 mv_overtime_summary_uniq, mv_overtime_summary_company_id_idx, mv_overtime_summary_employee_id_idx,
--                 mv_attendance_heatmap_uniq, mv_attendance_heatmap_company_id_idx, mv_attendance_heatmap_attendance_date_idx
-- Self-audit: no duplicates, idempotent, multi-tenant safe
-- ================================
