# AtoZ / PlanMatrix Companion - Enterprise Org Phase 1

This file is the normalized source artifact created for the AtoZ requirement in this pass.

No workbook or existing `AtoZ` / `PlanMatrix` spreadsheet source file was present in the repository, so this document and its matching JSON companion were created as the update target instead of silently skipping the requirement.

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
