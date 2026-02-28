-- ============================================
-- Migration: 61_idempotency_enforcement.sql
-- Purpose: API idempotency key infrastructure (table + atomic helpers)
-- Scope: New table, RLS policies, helper functions
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: New table only
-- ============================================

create table if not exists public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  key text not null,
  endpoint text not null,
  response jsonb,
  status text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint api_idempotency_keys_unique unique (company_id, key, endpoint)
);

create index if not exists api_idempotency_keys_company_id_idx
  on public.api_idempotency_keys (company_id);

create index if not exists api_idempotency_keys_company_endpoint_status_idx
  on public.api_idempotency_keys (company_id, endpoint, status);

create index if not exists api_idempotency_keys_expires_at_idx
  on public.api_idempotency_keys (expires_at);

alter table public.api_idempotency_keys enable row level security;
alter table public.api_idempotency_keys force row level security;

drop policy if exists api_idempotency_keys_select on public.api_idempotency_keys;
drop policy if exists api_idempotency_keys_insert on public.api_idempotency_keys;
drop policy if exists api_idempotency_keys_update on public.api_idempotency_keys;

create policy api_idempotency_keys_select on public.api_idempotency_keys
  for select
  using (company_id = public.current_user_company_id());

create policy api_idempotency_keys_insert on public.api_idempotency_keys
  for insert
  with check (company_id = public.current_user_company_id());

create policy api_idempotency_keys_update on public.api_idempotency_keys
  for update
  using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

create or replace function public.idempotency_begin(
  p_key text,
  p_endpoint text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_status text;
  v_response jsonb;
  v_inserted boolean;
begin
  if p_key is null or p_endpoint is null or p_expires_at is null then
    raise exception using
      errcode = 'P0001',
      message = 'IDEMPOTENCY_INVALID';
  end if;

  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'UNAUTHENTICATED';
  end if;

  select up.company_id
    into v_company_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'TENANT_RESOLUTION_FAILED';
  end if;

  insert into public.api_idempotency_keys (
    company_id,
    key,
    endpoint,
    response,
    status,
    created_at,
    expires_at
  ) values (
    v_company_id,
    p_key,
    p_endpoint,
    null,
    'processing',
    now(),
    p_expires_at
  )
  on conflict (company_id, key, endpoint) do update
    set status = case
        when public.api_idempotency_keys.expires_at < now() then 'processing'
        else public.api_idempotency_keys.status
      end,
      response = case
        when public.api_idempotency_keys.expires_at < now() then null
        else public.api_idempotency_keys.response
      end,
      expires_at = case
        when public.api_idempotency_keys.expires_at < now() then excluded.expires_at
        else public.api_idempotency_keys.expires_at
      end
  returning status, response, (xmax = 0) into v_status, v_response, v_inserted;

  return jsonb_build_object(
    'status', v_status,
    'response', v_response,
    'is_new', v_inserted
  );
end;
$$;

create or replace function public.idempotency_complete(
  p_key text,
  p_endpoint text,
  p_response jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_rowcount integer;
begin
  if p_key is null or p_endpoint is null then
    raise exception using
      errcode = 'P0001',
      message = 'IDEMPOTENCY_INVALID';
  end if;

  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'UNAUTHENTICATED';
  end if;

  select up.company_id
    into v_company_id
    from public.user_profiles up
   where up.user_id = auth.uid()
     and up.is_deleted = false
   limit 1;

  if v_company_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'TENANT_RESOLUTION_FAILED';
  end if;

  update public.api_idempotency_keys
     set status = 'completed',
         response = p_response
   where company_id = v_company_id
     and key = p_key
     and endpoint = p_endpoint
     and status = 'processing';

  get diagnostics v_rowcount = row_count;
  if v_rowcount <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'IDEMPOTENCY_NOT_FOUND';
  end if;

  return jsonb_build_object('status', 'completed');
end;
$$;
