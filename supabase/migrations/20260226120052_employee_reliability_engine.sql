-- ============================================
-- Migration: 53_employee_reliability_engine.sql
-- Purpose: Workforce reliability scoring and company/department reliability analytics
-- Scope: Reliability metrics views, scoring function, aggregation views, ranking materialized view, reporting indexes
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: No RLS changes; user-facing views are company-scoped and rely on underlying RLS
-- Financial Impact: None
-- ============================================

create index if not exists attendance_records_company_employee_date_status_90d_idx
  on public.attendance_records (company_id, employee_id, attendance_date, status)
  where is_deleted = false;

create index if not exists attendance_correction_requests_company_status_reviewed_at_idx
  on public.attendance_correction_requests (company_id, status, reviewed_at)
  where is_deleted = false;

create index if not exists leave_requests_company_employee_status_dates_idx
  on public.leave_requests (company_id, employee_id, status, start_date, end_date)
  where is_deleted = false;

create or replace view public.v_employee_reliability_metrics_90d_base as
with window_bounds as (
  select
    (current_date - 89)::date as window_start,
    current_date::date as window_end
),
employee_dates as (
  select
    e.company_id,
    e.id as employee_id,
    e.department_id,
    d.work_date
  from public.employees e
  cross join window_bounds wb
  cross join lateral generate_series(wb.window_start, wb.window_end, interval '1 day') as d(work_date)
  where e.is_deleted = false
    and (e.joining_date is null or d.work_date::date >= e.joining_date)
    and (e.exit_date is null or d.work_date::date <= e.exit_date)
),
working_days as (
  select
    ed.company_id,
    ed.employee_id,
    ed.department_id,
    ed.work_date::date as work_date
  from employee_dates ed
  where public.is_company_working_day(ed.company_id, ed.work_date::date)
    and not exists (
      select 1
      from public.company_holidays h
      where h.company_id = ed.company_id
        and h.holiday_date = ed.work_date::date
        and h.is_deleted = false
    )
),
approved_leave_days as (
  select distinct
    lr.company_id,
    lr.employee_id,
    gs.leave_date::date as leave_date
  from public.leave_requests lr
  cross join lateral generate_series(lr.start_date, lr.end_date, interval '1 day') as gs(leave_date)
  cross join window_bounds wb
  where lr.is_deleted = false
    and lr.status = 'approved'
    and gs.leave_date::date between wb.window_start and wb.window_end
),
denominator_days as (
  select
    wd.company_id,
    wd.employee_id,
    wd.department_id,
    wd.work_date
  from working_days wd
  left join approved_leave_days ald
    on ald.company_id = wd.company_id
   and ald.employee_id = wd.employee_id
   and ald.leave_date = wd.work_date
  where ald.leave_date is null
),
attendance_for_days as (
  select
    dd.company_id,
    dd.employee_id,
    dd.department_id,
    dd.work_date,
    ar.id as attendance_id,
    ar.status
  from denominator_days dd
  left join public.attendance_records ar
    on ar.company_id = dd.company_id
   and ar.employee_id = dd.employee_id
   and ar.attendance_date = dd.work_date
   and ar.is_deleted = false
),
approved_corrections as (
  select
    ar.company_id,
    ar.employee_id,
    count(acr.id)::integer as approved_correction_count
  from public.attendance_correction_requests acr
  join public.attendance_records ar
    on ar.id = acr.attendance_id
   and ar.company_id = acr.company_id
   and ar.is_deleted = false
  cross join window_bounds wb
  where acr.is_deleted = false
    and acr.status = 'approved'
    and ar.attendance_date between wb.window_start and wb.window_end
  group by ar.company_id, ar.employee_id
),
metrics as (
  select
    afd.company_id,
    afd.employee_id,
    afd.department_id,
    count(*)::integer as working_days_count,
    coalesce(sum(
      case
        when afd.status in ('present', 'late') then 1.0
        when afd.status = 'half_day' then 0.5
        else 0.0
      end
    ), 0.0)::numeric as attendance_present_equivalent_days,
    count(*) filter (where afd.status = 'late')::integer as late_days_count,
    count(*) filter (where afd.status = 'absent')::integer as unapproved_absence_days_count,
    count(*) filter (where afd.status = 'on_leave')::integer as unapproved_leave_days_count,
    coalesce(ac.approved_correction_count, 0)::integer as approved_correction_count
  from attendance_for_days afd
  left join approved_corrections ac
    on ac.company_id = afd.company_id
   and ac.employee_id = afd.employee_id
  group by
    afd.company_id,
    afd.employee_id,
    afd.department_id,
    ac.approved_correction_count
)
select
  m.company_id,
  m.employee_id,
  m.department_id,
  (current_date - 89)::date as window_start_date,
  current_date::date as window_end_date,
  m.working_days_count,
  m.attendance_present_equivalent_days,
  m.late_days_count,
  m.unapproved_absence_days_count,
  m.unapproved_leave_days_count,
  m.approved_correction_count,
  case
    when m.working_days_count = 0 then 100.00
    else round((m.attendance_present_equivalent_days / m.working_days_count::numeric) * 100.0, 2)
  end as attendance_percentage,
  case
    when m.working_days_count = 0 then 0.00
    else round((m.late_days_count::numeric / m.working_days_count::numeric) * 100.0, 2)
  end as late_frequency_percentage,
  case
    when m.working_days_count = 0 then 0.00
    else round((m.unapproved_absence_days_count::numeric / m.working_days_count::numeric) * 100.0, 2)
  end as absence_frequency_percentage,
  case
    when m.working_days_count = 0 then 0.00
    else round((m.unapproved_leave_days_count::numeric / m.working_days_count::numeric) * 100.0, 2)
  end as leave_frequency_percentage,
  case
    when m.working_days_count = 0 then 0.00
    else round((m.approved_correction_count::numeric / m.working_days_count::numeric) * 100.0, 2)
  end as correction_frequency_percentage,
  greatest(
    0,
    least(
      100,
      round(
        (
          (case when m.working_days_count = 0 then 100.0 else (m.attendance_present_equivalent_days / m.working_days_count::numeric) * 100.0 end) * 0.40
          + (100.0 - (case when m.working_days_count = 0 then 0.0 else (m.late_days_count::numeric / m.working_days_count::numeric) * 100.0 end)) * 0.15
          + (100.0 - (case when m.working_days_count = 0 then 0.0 else (m.unapproved_absence_days_count::numeric / m.working_days_count::numeric) * 100.0 end)) * 0.20
          + (100.0 - (case when m.working_days_count = 0 then 0.0 else (m.unapproved_leave_days_count::numeric / m.working_days_count::numeric) * 100.0 end)) * 0.10
          + (100.0 - (case when m.working_days_count = 0 then 0.0 else (m.approved_correction_count::numeric / m.working_days_count::numeric) * 100.0 end)) * 0.15
        )
      )::integer
    )
  )::integer as reliability_score
from metrics m;

create or replace view public.v_employee_reliability_metrics_90d as
select *
from public.v_employee_reliability_metrics_90d_base
where company_id = public.current_user_company_id();

create or replace function public.calculate_employee_reliability_score(
  p_employee_id uuid,
  p_as_of_date date default current_date
)
returns integer
language plpgsql
stable
set search_path = public
as $$
declare
  v_score integer;
begin
  if p_employee_id is null then
    return null;
  end if;

  if p_as_of_date is distinct from current_date then
    -- Current implementation is computed from a rolling window ending on current_date.
    -- Parameter retained for forward compatibility without changing function signature later.
    null;
  end if;

  select erm.reliability_score
    into v_score
    from public.v_employee_reliability_metrics_90d_base erm
   where erm.employee_id = p_employee_id;

  return v_score;
end;
$$;

create or replace view public.v_department_reliability_aggregation_90d as
select
  erm.company_id,
  erm.department_id,
  min(erm.window_start_date) as window_start_date,
  max(erm.window_end_date) as window_end_date,
  count(*)::integer as employee_count,
  round(avg(erm.reliability_score)::numeric, 2) as avg_reliability_score,
  round(avg(erm.attendance_percentage)::numeric, 2) as avg_attendance_percentage,
  round(avg(erm.late_frequency_percentage)::numeric, 2) as avg_late_frequency_percentage,
  round(avg(erm.absence_frequency_percentage)::numeric, 2) as avg_absence_frequency_percentage,
  round(avg(erm.leave_frequency_percentage)::numeric, 2) as avg_leave_frequency_percentage,
  round(avg(erm.correction_frequency_percentage)::numeric, 2) as avg_correction_frequency_percentage
from public.v_employee_reliability_metrics_90d_base erm
where erm.company_id = public.current_user_company_id()
group by erm.company_id, erm.department_id;

create or replace view public.v_company_reliability_aggregation_90d as
select
  erm.company_id,
  min(erm.window_start_date) as window_start_date,
  max(erm.window_end_date) as window_end_date,
  count(*)::integer as employee_count,
  round(avg(erm.reliability_score)::numeric, 2) as avg_reliability_score,
  round(avg(erm.attendance_percentage)::numeric, 2) as avg_attendance_percentage,
  round(avg(erm.late_frequency_percentage)::numeric, 2) as avg_late_frequency_percentage,
  round(avg(erm.absence_frequency_percentage)::numeric, 2) as avg_absence_frequency_percentage,
  round(avg(erm.leave_frequency_percentage)::numeric, 2) as avg_leave_frequency_percentage,
  round(avg(erm.correction_frequency_percentage)::numeric, 2) as avg_correction_frequency_percentage
from public.v_employee_reliability_metrics_90d_base erm
where erm.company_id = public.current_user_company_id()
group by erm.company_id;

create materialized view if not exists public.mv_employee_reliability_ranking_90d as
select
  erm.company_id,
  erm.employee_id,
  erm.department_id,
  erm.window_start_date,
  erm.window_end_date,
  erm.reliability_score,
  erm.attendance_percentage,
  erm.late_frequency_percentage,
  erm.absence_frequency_percentage,
  erm.leave_frequency_percentage,
  erm.correction_frequency_percentage,
  row_number() over (
    partition by erm.company_id
    order by erm.reliability_score desc, erm.attendance_percentage desc, erm.employee_id
  ) as company_rank,
  row_number() over (
    partition by erm.company_id, erm.department_id
    order by erm.reliability_score desc, erm.attendance_percentage desc, erm.employee_id
  ) as department_rank
from public.v_employee_reliability_metrics_90d_base erm;

create unique index if not exists mv_employee_reliability_ranking_90d_company_employee_uniq
  on public.mv_employee_reliability_ranking_90d (company_id, employee_id);

create index if not exists mv_employee_reliability_ranking_90d_company_rank_idx
  on public.mv_employee_reliability_ranking_90d (company_id, company_rank);

create index if not exists mv_employee_reliability_ranking_90d_company_department_rank_idx
  on public.mv_employee_reliability_ranking_90d (company_id, department_id, department_rank);

create or replace view public.v_employee_reliability_ranking_90d as
select *
from public.mv_employee_reliability_ranking_90d
where company_id = public.current_user_company_id();
