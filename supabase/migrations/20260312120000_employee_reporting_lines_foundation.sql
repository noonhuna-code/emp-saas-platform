alter table public.departments
  add column if not exists head_employee_id uuid references public.employees(id) on delete set null;

create index if not exists idx_departments_head_employee_id on public.departments(head_employee_id);

create table if not exists public.employee_reporting_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  manager_employee_id uuid not null references public.employees(id) on delete restrict,
  relation_type text not null,
  is_primary boolean not null default false,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete restrict,
  constraint employee_reporting_lines_relation_type_check
    check (
      relation_type in (
        'direct_manager',
        'dotted_line',
        'senior_manager',
        'team_lead',
        'hr_manager',
        'payroll_reviewer',
        'project_manager'
      )
    ),
  constraint employee_reporting_lines_no_self_reference
    check (employee_id <> manager_employee_id),
  constraint employee_reporting_lines_effective_window_check
    check (effective_to is null or effective_to >= effective_from)
);

create index if not exists idx_employee_reporting_lines_company_id
  on public.employee_reporting_lines(company_id);

create index if not exists idx_employee_reporting_lines_employee_id
  on public.employee_reporting_lines(employee_id);

create index if not exists idx_employee_reporting_lines_manager_employee_id
  on public.employee_reporting_lines(manager_employee_id);

create index if not exists idx_employee_reporting_lines_relation_type
  on public.employee_reporting_lines(relation_type);

create unique index if not exists idx_employee_reporting_lines_primary_active
  on public.employee_reporting_lines(employee_id)
  where is_primary = true and effective_to is null;

create or replace function public.validate_department_head_company()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_employee_company uuid;
begin
  if new.head_employee_id is null then
    return new;
  end if;

  select e.company_id
    into v_employee_company
  from public.employees e
  where e.id = new.head_employee_id
    and e.is_deleted = false;

  if v_employee_company is null then
    raise exception 'Department head employee not found';
  end if;

  if v_employee_company is distinct from new.company_id then
    raise exception 'Department head must belong to the same company';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_departments_head_company_validate on public.departments;
create trigger trg_departments_head_company_validate
before insert or update of head_employee_id, company_id
on public.departments
for each row
execute function public.validate_department_head_company();

create or replace function public.validate_employee_reporting_line_company()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_employee_company uuid;
  v_manager_company uuid;
begin
  select e.company_id
    into v_employee_company
  from public.employees e
  where e.id = new.employee_id
    and e.is_deleted = false;

  if v_employee_company is null then
    raise exception 'Employee not found for reporting line';
  end if;

  select e.company_id
    into v_manager_company
  from public.employees e
  where e.id = new.manager_employee_id
    and e.is_deleted = false;

  if v_manager_company is null then
    raise exception 'Manager employee not found for reporting line';
  end if;

  if new.company_id is distinct from v_employee_company
     or new.company_id is distinct from v_manager_company then
    raise exception 'Reporting line must remain inside the same company';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employee_reporting_lines_company_validate on public.employee_reporting_lines;
create trigger trg_employee_reporting_lines_company_validate
before insert or update of company_id, employee_id, manager_employee_id
on public.employee_reporting_lines
for each row
execute function public.validate_employee_reporting_line_company();

alter table public.employee_reporting_lines enable row level security;

drop policy if exists employee_reporting_lines_select on public.employee_reporting_lines;
create policy employee_reporting_lines_select on public.employee_reporting_lines
  for select
  using (company_id = public.current_user_company_id());

drop policy if exists employee_reporting_lines_insert on public.employee_reporting_lines;
create policy employee_reporting_lines_insert on public.employee_reporting_lines
  for insert
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

drop policy if exists employee_reporting_lines_update on public.employee_reporting_lines;
create policy employee_reporting_lines_update on public.employee_reporting_lines
  for update
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  )
  with check (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

drop policy if exists employee_reporting_lines_delete on public.employee_reporting_lines;
create policy employee_reporting_lines_delete on public.employee_reporting_lines
  for delete
  using (
    company_id = public.current_user_company_id()
    and public.current_user_has_permission('manage_employees')
  );

insert into public.employee_reporting_lines (
  company_id,
  employee_id,
  manager_employee_id,
  relation_type,
  is_primary,
  effective_from,
  created_by
)
select
  e.company_id,
  e.id,
  e.manager_id,
  'direct_manager',
  true,
  current_date,
  e.user_profile_id
from public.employees e
where e.manager_id is not null
  and e.is_deleted = false
  and not exists (
    select 1
    from public.employee_reporting_lines erl
    where erl.employee_id = e.id
      and erl.manager_employee_id = e.manager_id
      and erl.relation_type = 'direct_manager'
      and erl.is_primary = true
      and erl.effective_to is null
  );
