-- EMP/supabase/phase1_11_notification_email_engine.sql

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  recipient_user_id uuid not null references auth.users(id) on delete restrict,
  subject text not null,
  body text not null,
  status text not null default 'pending',
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'email_queue_status_chk'
       AND conrelid = 'public.email_queue'::regclass
  ) THEN
    ALTER TABLE public.email_queue
      ADD CONSTRAINT email_queue_status_chk
      CHECK (status in ('pending','sent','failed'));
  END IF;
END $$;

create index if not exists email_queue_company_id_idx
  on public.email_queue(company_id)
  where is_deleted = false;

create index if not exists email_queue_recipient_user_id_idx
  on public.email_queue(recipient_user_id)
  where is_deleted = false;

alter table public.email_queue enable row level security;
alter table public.email_queue force row level security;

drop policy if exists email_queue_select on public.email_queue;
drop policy if exists email_queue_insert on public.email_queue;
drop policy if exists email_queue_update on public.email_queue;

create policy email_queue_select on public.email_queue
  for select
  using (company_id = public.current_user_company_id() and is_deleted = false);

create policy email_queue_insert on public.email_queue
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy email_queue_update on public.email_queue
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create trigger trg_email_queue_updated_at
  before update on public.email_queue
  for each row execute function public.set_updated_at();

create or replace function public.enqueue_email(
  p_company_id uuid,
  p_recipient uuid,
  p_subject text,
  p_body text
) returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_id uuid;
begin
  if p_company_id is distinct from public.current_user_company_id() then
    raise exception 'company mismatch for enqueue_email';
  end if;

  select id
    into v_profile_id
    from public.user_profiles
   where user_id = auth.uid()
     and is_deleted = false
   limit 1;

  insert into public.email_queue (
    company_id,
    recipient_user_id,
    subject,
    body,
    status,
    retry_count,
    created_by,
    updated_by
  ) values (
    p_company_id,
    p_recipient,
    p_subject,
    p_body,
    'pending',
    0,
    v_profile_id,
    v_profile_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================
-- PHASE 1 MODULE SUMMARY
-- Tables created: email_queue
-- Columns added: none
-- Constraints added: email_queue_status_chk
-- Functions created: enqueue_email
-- Indexes added: email_queue_company_id_idx, email_queue_recipient_user_id_idx
-- RLS policies added: email_queue_select/insert/update
-- ============================================
