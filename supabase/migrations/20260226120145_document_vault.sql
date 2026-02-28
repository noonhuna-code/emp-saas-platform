-- ============================================
-- Migration: 107_document_vault.sql
-- Purpose: Advanced document vault (versions + access log + storage policies)
-- Scope: employee_documents extension, document versions/access logs, RLS, storage policies
-- Non-destructive: YES
-- Idempotent: YES
-- RLS Impact: Enabled + forced; tenant scoped
-- Financial Impact: None
-- ============================================

alter table public.employee_documents
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists storage_mime_type text,
  add column if not exists storage_size bigint,
  add column if not exists storage_checksum text,
  add column if not exists current_version integer,
  add column if not exists last_uploaded_at timestamptz,
  add column if not exists last_uploaded_by uuid references public.user_profiles(id) on delete restrict;

create table if not exists public.employee_document_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  document_id uuid not null references public.employee_documents(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  version_number integer not null,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  storage_mime_type text,
  storage_size bigint,
  storage_checksum text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.user_profiles(id) on delete restrict
);

create table if not exists public.employee_document_access_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  document_id uuid not null references public.employee_documents(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  action text not null,
  actor_profile_id uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists employee_document_versions_doc_version_idx
  on public.employee_document_versions (document_id, version_number);

create index if not exists employee_document_versions_company_id_idx
  on public.employee_document_versions (company_id);

create index if not exists employee_document_versions_document_id_idx
  on public.employee_document_versions (document_id);

create index if not exists employee_document_versions_employee_id_idx
  on public.employee_document_versions (employee_id);

create index if not exists employee_document_access_log_company_id_idx
  on public.employee_document_access_log (company_id);

create index if not exists employee_document_access_log_document_id_idx
  on public.employee_document_access_log (document_id);

alter table public.employee_document_versions enable row level security;
alter table public.employee_document_versions force row level security;
alter table public.employee_document_access_log enable row level security;
alter table public.employee_document_access_log force row level security;

drop policy if exists employee_document_versions_select on public.employee_document_versions;
drop policy if exists employee_document_versions_insert on public.employee_document_versions;
drop policy if exists employee_document_access_log_select on public.employee_document_access_log;
drop policy if exists employee_document_access_log_insert on public.employee_document_access_log;

create policy employee_document_versions_select on public.employee_document_versions
  for select
  using (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_document_versions_insert on public.employee_document_versions
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create policy employee_document_access_log_select on public.employee_document_access_log
  for select
  using (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_document_access_log_insert on public.employee_document_access_log
  for insert
  with check (
    company_id = public.current_user_company_id()
    and (
      employee_id = public.current_user_employee_id()
      or public.current_user_has_permission('manage_employees')
    )
  );

create or replace function public.validate_employee_document_versions_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_document_company uuid;
  v_document_employee uuid;
begin
  select company_id, employee_id
    into v_document_company, v_document_employee
    from public.employee_documents
   where id = new.document_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_document_company);

  if v_document_employee is null or v_document_employee <> new.employee_id then
    raise exception 'Document employee mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employee_document_versions_company_guard on public.employee_document_versions;
create trigger trg_employee_document_versions_company_guard
  before insert on public.employee_document_versions
  for each row execute function public.validate_employee_document_versions_company();

create or replace function public.validate_employee_document_access_log_company()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_document_company uuid;
  v_document_employee uuid;
begin
  select company_id, employee_id
    into v_document_company, v_document_employee
    from public.employee_documents
   where id = new.document_id
     and is_deleted = false;

  perform public.validate_company_consistency(new.company_id, v_document_company);

  if v_document_employee is null or v_document_employee <> new.employee_id then
    raise exception 'Document employee mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employee_document_access_log_company_guard on public.employee_document_access_log;
create trigger trg_employee_document_access_log_company_guard
  before insert on public.employee_document_access_log
  for each row execute function public.validate_employee_document_access_log_company();

create or replace function public.prevent_employee_document_versions_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'employee_document_versions are immutable';
end;
$$;

drop trigger if exists trg_employee_document_versions_block_update on public.employee_document_versions;
create trigger trg_employee_document_versions_block_update
  before update on public.employee_document_versions
  for each row execute function public.prevent_employee_document_versions_mutation();

drop trigger if exists trg_employee_document_versions_block_delete on public.employee_document_versions;
create trigger trg_employee_document_versions_block_delete
  before delete on public.employee_document_versions
  for each row execute function public.prevent_employee_document_versions_mutation();

create or replace function public.prevent_employee_document_access_log_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'employee_document_access_log is immutable';
end;
$$;

drop trigger if exists trg_employee_document_access_log_block_update on public.employee_document_access_log;
create trigger trg_employee_document_access_log_block_update
  before update on public.employee_document_access_log
  for each row execute function public.prevent_employee_document_access_log_mutation();

drop trigger if exists trg_employee_document_access_log_block_delete on public.employee_document_access_log;
create trigger trg_employee_document_access_log_block_delete
  before delete on public.employee_document_access_log
  for each row execute function public.prevent_employee_document_access_log_mutation();

create or replace function public.register_employee_document_version(
  p_document_id uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_file_name text,
  p_storage_size bigint,
  p_storage_mime_type text,
  p_storage_checksum text,
  p_uploaded_by uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_employee_id uuid;
  v_version_number integer;
  v_version_id uuid;
  v_actor_company uuid;
begin
  v_company_id := public.current_user_company_id();
  if v_company_id is null then
    raise exception 'Tenant resolution failed';
  end if;

  select company_id into v_actor_company
  from public.user_profiles
  where id = p_uploaded_by
    and is_deleted = false
  limit 1;

  if v_actor_company is null or v_actor_company <> v_company_id then
    raise exception 'Actor mismatch';
  end if;

  select employee_id
    into v_employee_id
    from public.employee_documents
   where id = p_document_id
     and company_id = v_company_id
     and is_deleted = false
   for update;

  if v_employee_id is null then
    raise exception 'Document not found';
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_version_number
    from public.employee_document_versions
   where document_id = p_document_id
     and company_id = v_company_id;

  v_version_id := gen_random_uuid();

  insert into public.employee_document_versions (
    id,
    company_id,
    document_id,
    employee_id,
    version_number,
    file_name,
    storage_bucket,
    storage_path,
    storage_mime_type,
    storage_size,
    storage_checksum,
    uploaded_by
  ) values (
    v_version_id,
    v_company_id,
    p_document_id,
    v_employee_id,
    v_version_number,
    p_file_name,
    p_storage_bucket,
    p_storage_path,
    p_storage_mime_type,
    p_storage_size,
    p_storage_checksum,
    p_uploaded_by
  );

  update public.employee_documents
     set storage_bucket = p_storage_bucket,
         storage_path = p_storage_path,
         storage_mime_type = p_storage_mime_type,
         storage_size = p_storage_size,
         storage_checksum = p_storage_checksum,
         current_version = v_version_number,
         last_uploaded_at = now(),
         last_uploaded_by = p_uploaded_by,
         updated_at = now(),
         updated_by = p_uploaded_by
   where id = p_document_id
     and company_id = v_company_id
     and is_deleted = false;

  insert into public.employee_document_access_log (
    company_id,
    document_id,
    employee_id,
    action,
    actor_profile_id
  ) values (
    v_company_id,
    p_document_id,
    v_employee_id,
    'upload',
    p_uploaded_by
  );

  return jsonb_build_object(
    'document_id', p_document_id,
    'version_id', v_version_id,
    'version_number', v_version_number
  );
end;
$$;

-- Storage bucket + policies
insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

drop policy if exists employee_documents_storage_select on storage.objects;
drop policy if exists employee_documents_storage_insert on storage.objects;

create policy employee_documents_storage_select on storage.objects
  for select
  using (
    bucket_id = 'employee-documents'
    and split_part(name, '/', 1)::uuid = public.current_user_company_id()
    and split_part(name, '/', 2)::uuid in (select * from public.current_user_scope_employee_ids())
  );

create policy employee_documents_storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'employee-documents'
    and split_part(name, '/', 1)::uuid = public.current_user_company_id()
    and split_part(name, '/', 2)::uuid in (select * from public.current_user_scope_employee_ids())
  );
