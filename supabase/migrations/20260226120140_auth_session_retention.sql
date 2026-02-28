-- ============================================
-- Migration: 102_auth_session_retention.sql
-- Purpose: Non-destructive auth session cleanup + login_events retention report
-- Scope: New functions only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

create or replace function public.run_auth_session_retention(
  p_idle_minutes integer default 30,
  p_absolute_hours integer default 24
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_rowcount integer := 0;
  v_cutoff_idle timestamptz;
  v_cutoff_absolute timestamptz;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  v_company_id := public.current_user_company_id();
  if v_company_id is null then
    raise exception 'TENANT_RESOLUTION_FAILED';
  end if;

  v_cutoff_idle := now() - make_interval(mins => p_idle_minutes);
  v_cutoff_absolute := now() - make_interval(hours => p_absolute_hours);

  update public.auth_sessions
     set revoked_at = now(),
         revoked_reason = 'retention_cleanup',
         last_seen_at = now()
   where company_id = v_company_id
     and revoked_at is null
     and (
       expires_at <= now()
       or last_seen_at < v_cutoff_idle
       or created_at < v_cutoff_absolute
     );

  get diagnostics v_rowcount = row_count;

  return jsonb_build_object(
    'revoked_count', v_rowcount,
    'idle_minutes', p_idle_minutes,
    'absolute_hours', p_absolute_hours
  );
end;
$$;

create or replace function public.run_login_events_retention_report(
  p_retention_days integer default 365
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_cutoff timestamptz;
  v_total integer := 0;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  v_company_id := public.current_user_company_id();
  if v_company_id is null then
    raise exception 'TENANT_RESOLUTION_FAILED';
  end if;

  v_cutoff := now() - make_interval(days => p_retention_days);

  select count(*)
    into v_total
    from public.login_events le
   where le.company_id = v_company_id
     and le.created_at < v_cutoff;

  return jsonb_build_object(
    'company_id', v_company_id,
    'retention_days', p_retention_days,
    'older_than_cutoff', v_total,
    'cutoff_at', v_cutoff
  );
end;
$$;
