-- ============================================
-- Migration: 94_geo_velocity_risk_patch.sql
-- Purpose: Add geo-velocity signal to login risk evaluation
-- Scope: Function replacement only
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: None
-- ============================================

drop function if exists public.evaluate_login_risk(uuid, uuid, text, text);

create or replace function public.evaluate_login_risk(
  p_company_id uuid,
  p_profile_id uuid,
  p_ip_hash text,
  p_device_hash text,
  p_geo_country text default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_score integer := 0;
  v_new_device boolean := false;
  v_new_ip boolean := false;
  v_failed_count integer := 0;
  v_last_geo_country text;
  v_last_geo_at timestamptz;
  v_geo_velocity boolean := false;
  v_geo_impossible boolean := false;
begin
  if p_company_id is null or p_profile_id is null then
    return 0;
  end if;

  if p_device_hash is not null then
    select not exists (
      select 1
        from public.device_fingerprints df
       where df.company_id = p_company_id
         and df.profile_id = p_profile_id
         and df.device_hash = p_device_hash
         and df.is_deleted = false
    ) into v_new_device;
  end if;

  if p_ip_hash is not null then
    select not exists (
      select 1
        from public.login_events le
       where le.company_id = p_company_id
         and le.profile_id = p_profile_id
         and le.ip_hash = p_ip_hash
    ) into v_new_ip;
  end if;

  select count(*)
    into v_failed_count
    from public.login_events le
   where le.company_id = p_company_id
     and le.profile_id = p_profile_id
     and le.success = false
     and le.created_at >= now() - interval '10 minutes';

  if p_geo_country is not null then
    select le.geo_country, le.created_at
      into v_last_geo_country, v_last_geo_at
      from public.login_events le
     where le.company_id = p_company_id
       and le.profile_id = p_profile_id
       and le.geo_country is not null
     order by le.created_at desc
     limit 1;

    if v_last_geo_country is not null
      and v_last_geo_country <> p_geo_country
      and v_last_geo_at is not null then
      if v_last_geo_at >= now() - interval '10 minutes' then
        v_geo_impossible := true;
      elsif v_last_geo_at >= now() - interval '1 hour' then
        v_geo_velocity := true;
      end if;
    end if;
  end if;

  if v_new_device then
    v_score := v_score + 50;
  end if;
  if v_new_ip then
    v_score := v_score + 30;
  end if;
  if v_failed_count > 0 then
    v_score := v_score + 40;
  end if;
  if v_geo_velocity then
    v_score := v_score + 70;
  end if;
  if v_geo_impossible then
    v_score := v_score + 100;
  end if;

  return v_score;
end;
$$;
