# AtoZ / PlanMatrix Companion - Enterprise Org Phase 1

This file is the normalized source artifact created for the AtoZ requirement in this pass.

No workbook or existing `AtoZ` / `PlanMatrix` spreadsheet source file was present in the repository, so this document and its matching JSON companion were created as the update target instead of silently skipping the requirement.

The exact file named `Product_PlanMatrix_FINALIZED_AtoZ` is not present in this repository. The PTCL operations status below was updated in this companion artifact instead of pretending a missing workbook was edited.

## Phase 1 Status

- Status: implemented foundation
- Scope: backend/schema/shared-service foundation, conservative dashboard-v2 exposure, normalized AtoZ companion
- Workbook state: missing from repo during this pass

## Implemented Foundation

| Area | Capability | Phase 1 status | Repo implementation |
| --- | --- | --- | --- |
| Ownership hierarchy | Founder, board, chairman, CEO, EVP/SVP/VP structures | Implemented foundation | System job role families and executive job roles seeded |
| Business structure | Holding company, company, subsidiary, brand, business unit, legal entity | Implemented foundation | Generic org units + org unit links |
| Geography / offices | Country, region, province/state, zone, territory, city, branch, office, site, building, floor, remote teams | Implemented foundation | Geography org unit catalog + branch backfill |
| Functional structure | Division, department, sub-department, team, sub-team, pod, desk, shift group, temporary project structures | Implemented foundation | Functional/workspace/temporary unit types + department/team backfill |
| People / reporting | Primary, dotted-line, secondary, acting, delegate, skip-level, matrix reporting | Implemented foundation | Expanded `employee_reporting_lines` + `position_relationships` |
| Positions | Roles separate from people and positions | Implemented foundation | `job_roles`, `org_positions`, `employee_position_assignments` |
| Approval / delegation | Delegate approver and routing foundation | Implemented foundation | `approval_delegations`, `approval_routing_rules` |
| Admin controls | Enterprise org admin permissions | Implemented foundation | New org/position/routing/delegation permissions |

## Role Families Added

- Governance / Executive
- Strategy
- Finance / Accounts / Treasury / Tax
- HR / Payroll / Talent / L&D
- Admin / Office / Assets
- IT / Helpdesk / Infrastructure / IAM
- Security / InfoSec / Physical Security
- Legal / Compliance / Audit / Risk
- Product / Project / Program / PMO / Delivery
- Engineering / QA / Architecture / DevOps / Support Engineering
- Data / BI / Reporting / Research / Planning
- Operations / Service Delivery / Field Ops
- Customer Support / Contact Center / Escalations / Retention
- Sales / Channel / Retail / Enterprise / Partner
- Marketing / Content / Brand / Growth / Comms
- Procurement / Supply Chain / Vendor / Inventory
- Facilities / Logistics / Transport
- Telecom / Network / NOC / Technical Ops

## Recommended Workbook Export Tabs

- Capability Matrix
- Org Unit Types
- Role Families
- Seeded Enterprise Job Roles
- Reporting Relation Types
- Admin Permissions
- Validation / Deployment Status

## Next Phase Targets

- Add managed CRUD flows for org units, positions, delegations, and approval routing
- Add approval-resolution services that consume `approval_routing_rules`
- Add position planning UI, org graph drilldown, and assignment history UI
- Add import/export flow from this normalized artifact into a workbook if a spreadsheet becomes the required delivery format

## PTCL Operations Pass Status

- Status: implemented and deployed
- Scope: `apps/dashboard-v2` attendance/day-state logic, calendar alignment, shifts visibility, GO assignment flow, Late Login requests, settings tables
- Validation: `lint`, `typecheck`, `build` passed for `apps/dashboard-v2`
- Deployment: live on the dashboard Vercel production alias
- Workbook state: exact requested workbook file still not present in repo

| Area | Capability | PTCL status | Evidence / implementation |
| --- | --- | --- | --- |
| Attendance day-state classifier | Explicit PTCL states for `present`, `on_break`, `clocked_out`, `late`, `absent`, `off_day`, `leave_paid`, `leave_unpaid`, `go_active`, `go_applied` | Done | Shared classifier updated in services and consumed by attendance, dashboard, team view, and calendar |
| Absent handling | `absent` only from explicit attendance truth | Done | Never inferred from missing shift or missing attendance |
| Off day handling | `off_day` separate from `absent` and non-deduction by default | Done | Shift/roster truth maps to `off_day` |
| Late Login trigger | Late after shift start + 5 minutes | Done | Derived from shift assignment truth + actual clock-in |
| Late Login request flow | Attendance-exception request using existing correction workflow | Done | Reused `attendance_correction_requests` with `Late Login` reason and one-request-per-day guard |
| Leadership late visibility | Team lead / leadership can see `late` and request status | Done | Team attendance/workforce rows include late-login request state |
| GO Active | Holiday + worked attendance | Done | Derived from `company_holidays` + worked attendance truth |
| GO Applied | Explicit employee holiday-off assignment by leadership only | Done | Reused `attendance_records.status = 'holiday'` plus guarded GO assignment route |
| Unpaid Leave contract | Real leave type with `is_paid = false` | Done | Migration created, backfill migration created, and remote DB push completed |
| Employee shifts visibility | Dedicated employee shifts view for Today / 7 days / 30 days | Done | New `/app/shifts` page added and linked in Workday nav |
| Shift swap option control | Uses real PTCL-valid 8-hour templates in 9 AM–9 PM window | Done | Filtered from real `shift_templates`, not hardcoded |
| Calendar state labels | Compact labels for `P`, `P (Late)`, `A`, `GO`, `P · GO`, `Off`, `Unpaid Leave`, leave labels | Done | Calendar shaping updated to reuse classifier truth |
| Settings tables | Active sessions and known devices converted to compact searchable tables | Done | Settings visibility surface updated |
| Live authenticated PTCL browser QA | Employee/supervisor authenticated runtime verification | Partial / pending | Code deployed, backend truth checked, but authenticated PTCL browser session QA was not completed from terminal |

## Workbook Sync Notes

- External workbook synced: `EMP_AtoZ_BillionDollar_2026.xlsx`
- Latest feature sync: `feature.audit_timeline_dashboard` moved to implemented in the product pass, backed by the new monitoring security audit timeline in `apps/dashboard-v2`
- Latest feature sync: `feature.people_directory_search` moved to implemented in the product pass, backed by the searchable employee directory in `apps/dashboard-v2`
- Latest experience pass: `apps/dashboard-v2` login routing now prefers the public website sign-in in production, and the TailAdmin shell header/navigation was expanded for role-aware active-page coverage across workday, intelligence, operations, and control routes
