-- ============================================
-- Migration: 20260302183000_employee_workspace_collaboration.sql
-- Purpose: Employee workspace collaboration primitives (notes, resources, chat)
-- Scope: additive only
-- ============================================

create table if not exists public.company_resources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  title text not null,
  resource_type text not null default 'sop',
  summary text,
  link_url text,
  file_url text,
  department_id uuid references public.departments(id) on delete restrict,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint company_resources_title_chk check (btrim(title) <> ''),
  constraint company_resources_resource_type_chk check (resource_type in ('sop', 'policy', 'guide', 'link', 'announcement')),
  constraint company_resources_sort_order_chk check (sort_order >= 0)
);

create table if not exists public.employee_workspace_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  title text not null,
  body text not null,
  file_url text,
  file_name text,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  updated_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint employee_workspace_notes_title_chk check (btrim(title) <> ''),
  constraint employee_workspace_notes_body_chk check (btrim(body) <> '')
);

create table if not exists public.employee_chat_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  sender_employee_id uuid not null references public.employees(id) on delete restrict,
  recipient_employee_id uuid not null references public.employees(id) on delete restrict,
  message_text text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.user_profiles(id) on delete restrict,
  constraint employee_chat_messages_message_text_chk check (btrim(message_text) <> ''),
  constraint employee_chat_messages_distinct_participants_chk check (sender_employee_id <> recipient_employee_id)
);

create index if not exists company_resources_company_active_idx
  on public.company_resources (company_id, is_active, sort_order, created_at desc)
  where is_deleted = false;

create index if not exists company_resources_company_type_idx
  on public.company_resources (company_id, resource_type, created_at desc)
  where is_deleted = false;

create index if not exists employee_workspace_notes_company_employee_created_idx
  on public.employee_workspace_notes (company_id, employee_id, created_at desc)
  where is_deleted = false;

create index if not exists employee_workspace_notes_company_employee_file_idx
  on public.employee_workspace_notes (company_id, employee_id)
  where is_deleted = false and file_url is not null;

create index if not exists employee_chat_messages_company_sender_created_idx
  on public.employee_chat_messages (company_id, sender_employee_id, created_at desc)
  where is_deleted = false;

create index if not exists employee_chat_messages_company_recipient_created_idx
  on public.employee_chat_messages (company_id, recipient_employee_id, created_at desc)
  where is_deleted = false;

create index if not exists employee_chat_messages_company_pair_created_idx
  on public.employee_chat_messages (company_id, sender_employee_id, recipient_employee_id, created_at desc)
  where is_deleted = false;

alter table public.company_resources enable row level security;
alter table public.company_resources force row level security;
alter table public.employee_workspace_notes enable row level security;
alter table public.employee_workspace_notes force row level security;
alter table public.employee_chat_messages enable row level security;
alter table public.employee_chat_messages force row level security;

drop policy if exists company_resources_select on public.company_resources;
drop policy if exists company_resources_insert on public.company_resources;
drop policy if exists company_resources_update on public.company_resources;

create policy company_resources_select on public.company_resources
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and (
      is_active = true
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy company_resources_insert on public.company_resources
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

create policy company_resources_update on public.company_resources
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

drop policy if exists employee_workspace_notes_select on public.employee_workspace_notes;
drop policy if exists employee_workspace_notes_insert on public.employee_workspace_notes;
drop policy if exists employee_workspace_notes_update on public.employee_workspace_notes;

create policy employee_workspace_notes_select on public.employee_workspace_notes
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_workspace_notes_insert on public.employee_workspace_notes
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_workspace_notes_update on public.employee_workspace_notes
  for update
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and employee_id in (select * from public.current_user_scope_employee_ids())
  )
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

drop policy if exists employee_chat_messages_select on public.employee_chat_messages;
drop policy if exists employee_chat_messages_insert on public.employee_chat_messages;

create policy employee_chat_messages_select on public.employee_chat_messages
  for select
  using (
    company_id = public.current_user_company_id()
    and is_deleted = false
    and (
      sender_employee_id = public.current_user_employee_id()
      or recipient_employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_chat_messages_insert on public.employee_chat_messages
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      sender_employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
    and sender_employee_id in (
      select id from public.employees
      where company_id = public.current_user_company_id()
        and is_deleted = false
    )
    and recipient_employee_id in (
      select id from public.employees
      where company_id = public.current_user_company_id()
        and is_deleted = false
    )
  );

create or replace function public.validate_company_resources_department_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_department_company uuid;
begin
  if new.department_id is null then
    return new;
  end if;

  select company_id into v_department_company
  from public.departments
  where id = new.department_id
    and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_department_company);
  return new;
end;
$$;

create or replace function public.validate_employee_workspace_note_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_employee_company uuid;
begin
  select company_id into v_employee_company
  from public.employees
  where id = new.employee_id
    and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_employee_company);
  return new;
end;
$$;

create or replace function public.validate_employee_chat_message_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sender_company uuid;
  v_recipient_company uuid;
begin
  select company_id into v_sender_company
  from public.employees
  where id = new.sender_employee_id
    and is_deleted = false;

  select company_id into v_recipient_company
  from public.employees
  where id = new.recipient_employee_id
    and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_sender_company);
  perform public.validate_company_consistency(new.company_id, v_recipient_company);
  return new;
end;
$$;

drop trigger if exists trg_company_resources_department_company_guard on public.company_resources;
create trigger trg_company_resources_department_company_guard
  before insert or update on public.company_resources
  for each row execute function public.validate_company_resources_department_company();

drop trigger if exists trg_company_resources_updated_at on public.company_resources;
create trigger trg_company_resources_updated_at
  before update on public.company_resources
  for each row execute function public.set_updated_at();

drop trigger if exists trg_employee_workspace_note_company_guard on public.employee_workspace_notes;
create trigger trg_employee_workspace_note_company_guard
  before insert or update on public.employee_workspace_notes
  for each row execute function public.validate_employee_workspace_note_company();

drop trigger if exists trg_employee_workspace_notes_updated_at on public.employee_workspace_notes;
create trigger trg_employee_workspace_notes_updated_at
  before update on public.employee_workspace_notes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_employee_chat_message_company_guard on public.employee_chat_messages;
create trigger trg_employee_chat_message_company_guard
  before insert on public.employee_chat_messages
  for each row execute function public.validate_employee_chat_message_company();
