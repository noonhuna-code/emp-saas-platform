create table if not exists public.leave_request_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  file_name text not null,
  storage_bucket text not null,
  storage_path text not null,
  storage_mime_type text,
  storage_size bigint,
  storage_checksum text,
  uploaded_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  is_deleted boolean not null default false
);

create index if not exists idx_leave_request_attachments_company_request
  on public.leave_request_attachments(company_id, leave_request_id)
  where is_deleted = false;

create index if not exists idx_leave_request_attachments_employee
  on public.leave_request_attachments(company_id, employee_id)
  where is_deleted = false;

alter table public.leave_request_attachments enable row level security;

drop policy if exists leave_request_attachments_select on public.leave_request_attachments;
create policy leave_request_attachments_select on public.leave_request_attachments
  for select
  using (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

drop policy if exists leave_request_attachments_insert on public.leave_request_attachments;
create policy leave_request_attachments_insert on public.leave_request_attachments
  for insert
  with check (
    company_id = public.current_user_company_id()
    and employee_id in (select * from public.current_user_scope_employee_ids())
  );

insert into storage.buckets (id, name, public)
values ('leave-attachments', 'leave-attachments', false)
on conflict (id) do nothing;

drop policy if exists leave_attachments_storage_select on storage.objects;
drop policy if exists leave_attachments_storage_insert on storage.objects;

create policy leave_attachments_storage_select on storage.objects
  for select
  using (
    bucket_id = 'leave-attachments'
    and split_part(name, '/', 1)::uuid = public.current_user_company_id()
    and split_part(name, '/', 2)::uuid in (select * from public.current_user_scope_employee_ids())
  );

create policy leave_attachments_storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'leave-attachments'
    and split_part(name, '/', 1)::uuid = public.current_user_company_id()
    and split_part(name, '/', 2)::uuid in (select * from public.current_user_scope_employee_ids())
  );
