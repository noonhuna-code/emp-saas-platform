insert into public.leave_types (
  company_id,
  name,
  description,
  is_paid
)
select
  companies.id,
  'Unpaid Leave',
  'Non-pay leave day with salary deduction.',
  false
from public.companies
where not exists (
  select 1
  from public.leave_types
  where leave_types.company_id = companies.id
    and lower(leave_types.name) = lower('Unpaid Leave')
    and leave_types.is_deleted = false
);

with unpaid_leave_types as (
  select id, company_id
  from public.leave_types
  where lower(name) = lower('Unpaid Leave')
    and is_deleted = false
),
active_employees as (
  select id, company_id
  from public.employees
  where is_deleted = false
),
target_year as (
  select extract(year from current_date)::integer as year_value
)
insert into public.leave_balances (
  company_id,
  employee_id,
  leave_type_id,
  year,
  entitled_days,
  used_days
)
select
  employees.company_id,
  employees.id,
  leave_types.id,
  target_year.year_value,
  0,
  0
from active_employees employees
join unpaid_leave_types leave_types
  on leave_types.company_id = employees.company_id
cross join target_year
where not exists (
  select 1
  from public.leave_balances
  where leave_balances.company_id = employees.company_id
    and leave_balances.employee_id = employees.id
    and leave_balances.leave_type_id = leave_types.id
    and leave_balances.year = target_year.year_value
    and leave_balances.is_deleted = false
);
