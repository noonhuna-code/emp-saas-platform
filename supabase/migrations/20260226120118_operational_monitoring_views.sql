-- ============================================
-- Migration: 79_operational_monitoring_views.sql
-- Purpose: Tenant-scoped operational monitoring views
-- Scope: Views only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None (views rely on current_user_company_id())
-- ============================================

create or replace view public.approval_backlog_count as
select
  base.company_id,
  coalesce(lr.pending_count, 0) as leave_pending,
  coalesce(acr.pending_count, 0) as attendance_pending,
  coalesce(lr.pending_count, 0) + coalesce(acr.pending_count, 0) as total_pending
from (select public.current_user_company_id() as company_id) base
left join (
  select company_id, count(*)::integer as pending_count
    from public.leave_requests
   where company_id = public.current_user_company_id()
     and status = 'pending'
     and is_deleted = false
   group by company_id
) lr on lr.company_id = base.company_id
left join (
  select company_id, count(*)::integer as pending_count
    from public.attendance_correction_requests
   where company_id = public.current_user_company_id()
     and status = 'pending'
     and is_deleted = false
   group by company_id
) acr on acr.company_id = base.company_id;

create or replace view public.payroll_run_failures_last_30d as
select
  company_id,
  count(*)::integer as failure_count,
  max(created_at) as last_failure_at
from public.v_request_traces_all
where company_id = public.current_user_company_id()
  and endpoint = '/api/payroll/run'
  and status_code >= 400
  and created_at >= now() - interval '30 days'
group by company_id;

create or replace view public.idempotency_conflicts_last_24h as
select
  company_id,
  count(*)::integer as conflict_count,
  max(created_at) as last_conflict_at
from public.v_request_traces_all
where company_id = public.current_user_company_id()
  and status_code = 409
  and created_at >= now() - interval '24 hours'
group by company_id;

create or replace view public.rate_limit_breaches_last_24h as
select
  company_id,
  count(*)::integer as breach_count,
  max(created_at) as last_breach_at
from public.v_request_traces_all
where company_id = public.current_user_company_id()
  and status_code = 429
  and created_at >= now() - interval '24 hours'
group by company_id;

create or replace view public.request_latency_p95 as
select
  company_id,
  percentile_cont(0.95) within group (order by duration_ms) as p95_duration_ms
from public.v_request_traces_all
where company_id = public.current_user_company_id()
  and duration_ms is not null
  and created_at >= now() - interval '24 hours'
group by company_id;