-- ============================================
-- Migration: 57_workforce_analytics_views.sql
-- Purpose: Workforce intelligence analytics views (company-scoped, read-only)
-- Scope: Standard views only for reliability, attendance variance, leave utilization density, and workforce stability
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: No RLS changes; views rely on underlying RLS and explicit company filtering
-- Financial Impact: None
-- ============================================

create index if not exists employment_change_history_company_changed_at_idx
  on public.employment_change_history (company_id, changed_at);

create or replace view public.v_workforce_company_reliability_index as
select
  c.company_id,
  c.window_start_date,
  c.window_end_date,
  c.employee_count,
  c.avg_reliability_score as reliability_index,
  c.avg_attendance_percentage,
  c.avg_late_frequency_percentage,
  c.avg_absence_frequency_percentage,
  c.avg_leave_frequency_percentage,
  c.avg_correction_frequency_percentage,
  case
    when c.avg_reliability_score >= 90 then 'excellent'
    when c.avg_reliability_score >= 75 then 'good'
    when c.avg_reliability_score >= 60 then 'watch'
    else 'critical'
  end as reliability_band
from public.v_company_reliability_aggregation_90d c
where c.company_id = public.current_user_company_id();

create or replace view public.v_workforce_department_reliability_index as
select
  d.company_id,
  d.department_id,
  d.window_start_date,
  d.window_end_date,
  d.employee_count,
  d.avg_reliability_score as reliability_index,
  d.avg_attendance_percentage,
  d.avg_late_frequency_percentage,
  d.avg_absence_frequency_percentage,
  d.avg_leave_frequency_percentage,
  d.avg_correction_frequency_percentage,
  case
    when d.avg_reliability_score >= 90 then 'excellent'
    when d.avg_reliability_score >= 75 then 'good'
    when d.avg_reliability_score >= 60 then 'watch'
    else 'critical'
  end as reliability_band
from public.v_department_reliability_aggregation_90d d
where d.company_id = public.current_user_company_id();

create or replace view public.v_workforce_attendance_variance_90d as
select
  erm.company_id,
  erm.department_id,
  min(erm.window_start_date) as window_start_date,
  max(erm.window_end_date) as window_end_date,
  count(*)::integer as employee_count,
  sum(erm.working_days_count)::integer as total_working_days,
  round(avg(erm.attendance_percentage)::numeric, 2) as avg_attendance_percentage,
  round(coalesce(stddev_pop(erm.attendance_percentage), 0)::numeric, 2) as attendance_percentage_variance,
  round(avg(erm.late_frequency_percentage)::numeric, 2) as avg_late_frequency_percentage,
  round(avg(erm.absence_frequency_percentage)::numeric, 2) as avg_absence_frequency_percentage,
  round(avg(erm.correction_frequency_percentage)::numeric, 2) as avg_correction_frequency_percentage
from public.v_employee_reliability_metrics_90d erm
group by erm.company_id, erm.department_id;

create or replace view public.v_workforce_leave_utilization_density_90d as
with window_bounds as (
  select
    (current_date - 89)::date as window_start,
    current_date::date as window_end
),
overlapping_requests as (
  select
    lr.company_id,
    lr.employee_id,
    lr.leave_type_id,
    lr.start_date,
    lr.end_date,
    lr.total_days,
    lr.status
  from public.leave_requests lr
  cross join window_bounds wb
  where lr.company_id = public.current_user_company_id()
    and lr.is_deleted = false
    and lr.end_date >= wb.window_start
    and lr.start_date <= wb.window_end
),
headcount_by_department as (
  select
    e.company_id,
    e.department_id,
    count(*)::integer as headcount
  from public.employees e
  where e.company_id = public.current_user_company_id()
    and e.is_deleted = false
    and coalesce(e.employment_status, 'Active') <> 'Terminated'
  group by e.company_id, e.department_id
)
select
  e.company_id,
  e.department_id,
  o.leave_type_id,
  count(*)::integer as overlapping_request_count,
  count(*) filter (where o.status = 'approved')::integer as approved_request_count,
  round(coalesce(sum(o.total_days), 0)::numeric, 2) as total_requested_days,
  round(coalesce(sum(case when o.status = 'approved' then o.total_days else 0 end), 0)::numeric, 2) as approved_leave_days,
  hb.headcount,
  case
    when coalesce(hb.headcount, 0) = 0 then 0.00
    else round(
      coalesce(sum(case when o.status = 'approved' then o.total_days else 0 end), 0)::numeric
      / hb.headcount::numeric,
      2
    )
  end as approved_leave_days_per_employee
from overlapping_requests o
join public.employees e
  on e.id = o.employee_id
 and e.company_id = o.company_id
 and e.is_deleted = false
left join headcount_by_department hb
  on hb.company_id = e.company_id
 and hb.department_id is not distinct from e.department_id
group by
  e.company_id,
  e.department_id,
  o.leave_type_id,
  hb.headcount;

create or replace view public.v_workforce_stability_index as
with window_bounds as (
  select
    (current_date - 89)::date as window_start,
    current_date::date as window_end
),
active_headcount as (
  select
    e.company_id,
    count(*)::integer as active_headcount
  from public.employees e
  where e.company_id = public.current_user_company_id()
    and e.is_deleted = false
    and coalesce(e.employment_status, 'Active') <> 'Terminated'
  group by e.company_id
),
change_counts as (
  select
    h.company_id,
    count(*)::integer as total_change_events,
    count(*) filter (where h.change_kind in ('department_change', 'transfer_promotion'))::integer as department_transfer_events,
    count(*) filter (where h.change_kind = 'manager_change')::integer as manager_change_events,
    count(*) filter (where h.change_kind in ('job_level_change', 'designation_change', 'transfer_promotion'))::integer as promotion_change_events,
    count(*) filter (
      where h.change_kind = 'employment_status_change'
        and coalesce(h.new_employment_status, '') in ('Terminated', 'Suspended')
    )::integer as destabilizing_status_events
  from public.employment_change_history h
  cross join window_bounds wb
  where h.company_id = public.current_user_company_id()
    and h.changed_at::date between wb.window_start and wb.window_end
  group by h.company_id
)
select
  ah.company_id,
  wb.window_start,
  wb.window_end,
  ah.active_headcount,
  coalesce(cc.total_change_events, 0) as total_change_events,
  coalesce(cc.department_transfer_events, 0) as department_transfer_events,
  coalesce(cc.manager_change_events, 0) as manager_change_events,
  coalesce(cc.promotion_change_events, 0) as promotion_change_events,
  coalesce(cc.destabilizing_status_events, 0) as destabilizing_status_events,
  greatest(
    0,
    least(
      100,
      round(
        100
        - (
          case
            when ah.active_headcount = 0 then 0
            else (
              (
                coalesce(cc.department_transfer_events, 0) * 1.0
                + coalesce(cc.manager_change_events, 0) * 1.5
                + coalesce(cc.promotion_change_events, 0) * 0.75
                + coalesce(cc.destabilizing_status_events, 0) * 4.0
              ) / ah.active_headcount::numeric
            ) * 10
          end
        )
      )::integer
    )
  ) as workforce_stability_index
from active_headcount ah
cross join window_bounds wb
left join change_counts cc
  on cc.company_id = ah.company_id;

