-- ============================================
-- Migration: 91_login_events_engine.sql
-- Purpose: Immutable login event log + risk evaluation
-- Scope: New table, RLS, immutability triggers, risk function
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references public.companies(id) on delete restrict,
  profile_id uuid null references public.user_profiles(id) on delete restrict,
  email_hash text not null,
  ip_hash text not null,
  device_hash text null,
  geo_country text null,
  success boolean not null,
  risk_score integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists login_events_company_id_idx
  on public.login_events (company_id);

create index if not exists login_events_company_created_at_idx
  on public.login_events (company_id, created_at);

create index if not exists login_events_profile_created_at_idx
  on public.login_events (profile_id, created_at);

alter table public.login_events enable row level security;
alter table public.login_events force row level security;

drop policy if exists login_events_select on public.login_events;
drop policy if exists login_events_insert on public.login_events;
drop policy if exists login_events_update on public.login_events;
drop policy if exists login_events_delete on public.login_events;

create policy login_events_select on public.login_events
  for select
  using (company_id = public.current_user_company_id());

create policy login_events_insert on public.login_events
  for insert
  with check (
    (company_id = public.current_user_company_id())
    or
    (
      company_id is null
      and coalesce(current_setting('request.jwt.claim.role', true), '') in ('anon','authenticated')
    )
  );

create or replace function public.prevent_login_events_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'LOGIN_EVENTS_IMMUTABLE';
end;
$$;

drop trigger if exists trg_login_events_block_update on public.login_events;
create trigger trg_login_events_block_update
  before update on public.login_events
  for each row execute function public.prevent_login_events_mutation();

drop trigger if exists trg_login_events_block_delete on public.login_events;
create trigger trg_login_events_block_delete
  before delete on public.login_events
  for each row execute function public.prevent_login_events_mutation();

create or replace function public.evaluate_login_risk(
  p_company_id uuid,
  p_profile_id uuid,
  p_ip_hash text,
  p_device_hash text
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
  v_country_count integer := 0;
  v_recent_country_change boolean := false;
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

  select count(distinct le.geo_country)
    into v_country_count
    from public.login_events le
   where le.company_id = p_company_id
     and le.profile_id = p_profile_id
     and le.geo_country is not null
     and le.created_at >= now() - interval '1 hour';

  select exists (
    select 1
      from public.login_events le
     where le.company_id = p_company_id
       and le.profile_id = p_profile_id
       and le.geo_country is not null
       and le.created_at >= now() - interval '10 minutes'
     group by le.geo_country
     having count(distinct le.geo_country) > 1
  ) into v_recent_country_change;

  if v_new_device then
    v_score := v_score + 50;
  end if;
  if v_new_ip then
    v_score := v_score + 30;
  end if;
  if v_failed_count > 0 then
    v_score := v_score + 40;
  end if;
  if v_country_count > 1 then
    v_score := v_score + 70;
  end if;
  if v_recent_country_change then
    v_score := v_score + 100;
  end if;

  return v_score;
end;
$$;
