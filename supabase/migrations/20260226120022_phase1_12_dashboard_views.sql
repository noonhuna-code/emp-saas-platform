-- EMP/supabase/phase1_12_dashboard_views.sql

create materialized view if not exists public.dashboard_company_summary as
select
  c.id as company_id,
  coalesce((select count(*) from public.employees e where e.company_id = c.id and e.is_deleted = false), 0) as total_employees,
  coalesce((select count(*) from public.employees e where e.company_id = c.id and e.is_deleted = false and e.is_active = true), 0) as active_employees,
  coalesce((select count(*) from public.attendance_records ar where ar.company_id = c.id and ar.is_deleted = false and ar.attendance_date = current_date and ar.status in ('present','late','half_day')), 0) as today_present,
  coalesce((select count(*) from public.attendance_records ar where ar.company_id = c.id and ar.is_deleted = false and ar.attendance_date = current_date and ar.status = 'absent'), 0) as today_absent,
  coalesce((select count(*) from public.leave_requests lr where lr.company_id = c.id and lr.is_deleted = false and lr.status = 'pending'), 0) as pending_leave_requests,
  false as is_deleted
from public.companies c
where c.is_active = true;

create materialized view if not exists public.dashboard_manager_summary as
select
  e.company_id as company_id,
  e.manager_id as manager_id,
  count(*) filter (where e.is_deleted = false) as total_reports,
  count(*) filter (
    where e.is_deleted = false
      and ar.attendance_date = current_date
      and ar.status in ('present','late','half_day')
  ) as present_today,
  count(*) filter (
    where e.is_deleted = false
      and ar.attendance_date = current_date
      and ar.status = 'absent'
  ) as absent_today,
  count(*) filter (
    where e.is_deleted = false
      and lr.status = 'pending'
  ) as pending_leave_requests,
  false as is_deleted
from public.employees e
left join public.attendance_records ar
  on ar.employee_id = e.id
  and ar.company_id = e.company_id
  and ar.is_deleted = false
left join public.leave_requests lr
  on lr.employee_id = e.id
  and lr.company_id = e.company_id
  and lr.is_deleted = false
where e.manager_id is not null
group by e.company_id, e.manager_id;

create index if not exists dashboard_company_summary_company_id_idx
  on public.dashboard_company_summary(company_id);

create index if not exists dashboard_manager_summary_company_id_idx
  on public.dashboard_manager_summary(company_id);

create index if not exists dashboard_manager_summary_manager_id_idx
  on public.dashboard_manager_summary(manager_id);

create or replace function public.refresh_dashboard_views(p_company_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  refresh materialized view public.dashboard_company_summary;
  refresh materialized view public.dashboard_manager_summary;
end;
$$;

-- ============================================
-- PHASE 1 MODULE SUMMARY
-- Tables created: dashboard_company_summary, dashboard_manager_summary (materialized views)
-- Columns added: none
-- Constraints added: none
-- Functions created: refresh_dashboard_views
-- Indexes added: dashboard_company_summary_company_id_idx, dashboard_manager_summary_company_id_idx, dashboard_manager_summary_manager_id_idx
-- RLS policies added: none (materialized views do not support RLS)
-- ============================================
