"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BellDot,
  CalendarCheck2,
  ChartColumnBig,
  ClipboardList,
  Clock3,
  FileStack,
  FolderKanban,
  GraduationCap,
  HandCoins,
  ReceiptText,
  ShieldCheck,
  UserPlus,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tabs } from "@/components/shared/Tabs";
import { MetricCard } from "@/components/ui/MetricCard";
import { ActionCard } from "@/components/ui/ActionCard";
import { SectionContainer } from "@/components/ui/SectionContainer";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import { DashboardRail, FeatureCallout, OverviewChips, PageContainer, PageHeader, SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";

type Mode = "workspace" | "analytics" | "operations";

type Blueprint = {
  eyebrow: string;
  title: string;
  description: string;
  chips: string[];
  metrics: Array<{ label: string; value: string; hint: string; accent?: "default" | "success" | "warning" | "danger" | "info" }>;
  actions: Array<{ title: string; description: string; href: string; icon: LucideIcon }>;
  workflows: Array<{ title: string; description: string; meta: string }>;
  insights: Array<{ title: string; summary: string; footer: string }>;
  feed: Array<{ title: string; detail: string; timestamp: string }>;
};

const BLUEPRINTS: Record<DashboardPersona, Blueprint> = {
  founder: {
    eyebrow: "Executive control center",
    title: "Company health at a glance",
    description: "Monitor workforce growth, productivity, labor cost movement, and enterprise-wide workflow signals from one executive surface.",
    chips: ["Growth ready", "Board review", "Multi-level approvals"],
    metrics: [
      { label: "Active workforce", value: "248", hint: "Across all departments", accent: "info" },
      { label: "Productivity index", value: "+12%", hint: "Compared with last month", accent: "success" },
      { label: "Open escalations", value: "7", hint: "Across HR, payroll, and operations", accent: "warning" },
      { label: "Labor cost trend", value: "PKR 18.4M", hint: "Current monthly projection" }
    ],
    actions: [
      { title: "Review workforce growth", description: "Headcount and hiring momentum", href: "/app/analytics", icon: ChartColumnBig },
      { title: "Open org structure", description: "Departments, managers, and team leads", href: "/app/org-chart", icon: Users },
      { title: "Inspect payroll", description: "Monthly payroll summary and cost", href: "/app/payroll", icon: ReceiptText },
      { title: "Monitor operations", description: "Approvals, alerts, and escalations", href: "/app/monitoring", icon: ShieldCheck }
    ],
    workflows: [
      { title: "Pending executive approvals", description: "Policy exceptions and budget-sensitive approvals waiting for review.", meta: "4 items" },
      { title: "Cross-department variance", description: "Identify attendance and leave anomalies across operating units.", meta: "2 alerts" },
      { title: "Board-ready exports", description: "Package workforce and financial reporting for stakeholder review.", meta: "Ready" }
    ],
    insights: [
      { title: "Growth momentum", summary: "Headcount is pacing ahead of planned hiring by 6%.", footer: "Operations and IT hiring leading" },
      { title: "Leave pressure", summary: "Leave consumption is concentrated in HR and Operations this week.", footer: "Plan coverage in advance" }
    ],
    feed: [
      { title: "Payroll run prepared", detail: "Finance prepared the monthly closeout draft.", timestamp: "12m ago" },
      { title: "Policy update published", detail: "HR published the attendance enforcement policy.", timestamp: "1h ago" }
    ]
  },
  admin: {
    eyebrow: "Administration workspace",
    title: "Company operations command",
    description: "Track people operations, shared approvals, billing posture, and organization-wide execution without leaving the admin workspace.",
    chips: ["Operations ready", "People oversight", "Billing aware"],
    metrics: [
      { label: "Employees", value: "84", hint: "Current active records", accent: "info" },
      { label: "Pending approvals", value: "11", hint: "Leave, attendance, and overtime", accent: "warning" },
      { label: "Seat usage", value: "84 / 100", hint: "Tenant plan capacity", accent: "success" },
      { label: "Department health", value: "92%", hint: "Coverage and compliance readiness" }
    ],
    actions: [
      { title: "Manage employees", description: "Profiles, roles, and assignments", href: "/app/employees", icon: Users },
      { title: "Open approval queue", description: "Review submitted workflow items", href: "/app/approvals", icon: ClipboardList },
      { title: "Inspect billing", description: "Invoices, subscriptions, and seats", href: "/app/billing", icon: HandCoins },
      { title: "Settings", description: "Company preferences and platform setup", href: "/app/settings", icon: ShieldCheck }
    ],
    workflows: [
      { title: "Employee provisioning", description: "Create and align employee records across departments.", meta: "6 pending" },
      { title: "Approval backlog", description: "Coordinate across HR, payroll, and team leads.", meta: "11 items" },
      { title: "Subscription posture", description: "Track seats, plan changes, and invoice health.", meta: "Healthy" }
    ],
    insights: [
      { title: "Attendance lift", summary: "Weekly punctuality improved after the latest shift template update.", footer: "Manager follow-through remains strong" },
      { title: "Approval rhythm", summary: "Median approval time dropped under 8 hours.", footer: "Best in Operations and Finance" }
    ],
    feed: [
      { title: "Team lead assigned", detail: "Operations assigned a new lead for IT Support.", timestamp: "15m ago" },
      { title: "Seat sync updated", detail: "Subscription snapshot refreshed successfully.", timestamp: "43m ago" }
    ]
  },
  hr: {
    eyebrow: "HR operations hub",
    title: "Workforce health and policy execution",
    description: "Manage headcount, onboarding, leave governance, and compliance from a single HR-ready command center.",
    chips: ["Compliance ready", "Onboarding live", "Leave governance"],
    metrics: [
      { label: "Headcount", value: "84", hint: "Active employees", accent: "info" },
      { label: "Onboarding pipeline", value: "5", hint: "Open onboarding journeys", accent: "warning" },
      { label: "Policy alerts", value: "3", hint: "Documents or acknowledgements missing", accent: "danger" },
      { label: "Employees on leave", value: "9", hint: "Today" }
    ],
    actions: [
      { title: "Add employee", description: "Provision employee record and hierarchy", href: "/app/employees", icon: UserPlus },
      { title: "Review leave", description: "Approval queue and distribution", href: "/app/leave/review", icon: CalendarCheck2 },
      { title: "Open payroll", description: "Coordinate salary and payout data", href: "/app/payroll", icon: ReceiptText },
      { title: "Knowledge base", description: "Policies, SOPs, and templates", href: "/app/resources", icon: GraduationCap }
    ],
    workflows: [
      { title: "Probation reviews", description: "Upcoming reviews for recently hired employees.", meta: "4 due" },
      { title: "Leave conflicts", description: "Spot team coverage risk before approvals are finalized.", meta: "2 conflicts" },
      { title: "Document compliance", description: "Track missing agreements, policies, and onboarding paperwork.", meta: "7 open" }
    ],
    insights: [
      { title: "Leave distribution", summary: "Casual leave is pacing higher than sick leave this month.", footer: "Coverage planning recommended" },
      { title: "Onboarding quality", summary: "Average time-to-productivity is down by 1.3 days.", footer: "Best in Operations" }
    ],
    feed: [
      { title: "Leave approved", detail: "HR approved a pending leave request for IT Support.", timestamp: "22m ago" },
      { title: "Document reminder sent", detail: "Three employees received compliance reminders.", timestamp: "57m ago" }
    ]
  },
  finance: {
    eyebrow: "Finance workspace",
    title: "Payroll, payouts, and workforce cost",
    description: "Track payroll readiness, payslip distribution, overtime, and workforce cost signals from a finance-first control center.",
    chips: ["Payroll ready", "Cost aware", "Audit traceable"],
    metrics: [
      { label: "Payroll readiness", value: "94%", hint: "Current close cycle" },
      { label: "Pending payouts", value: "6", hint: "Awaiting final approval", accent: "warning" },
      { label: "Overtime exposure", value: "PKR 124k", hint: "Current month", accent: "info" },
      { label: "Payslip delivery", value: "99.2%", hint: "Last payroll run", accent: "success" }
    ],
    actions: [
      { title: "Open payroll", description: "Runs, approvals, and export readiness", href: "/app/payroll", icon: ReceiptText },
      { title: "Review payslips", description: "Entries and print-ready records", href: "/app/payslips", icon: FileStack },
      { title: "Inspect overtime", description: "Claims and review queue", href: "/app/overtime", icon: Clock3 },
      { title: "Billing operations", description: "Invoices and subscription state", href: "/app/billing", icon: HandCoins }
    ],
    workflows: [
      { title: "Payroll closeout", description: "Validate remaining approvals before release.", meta: "2 blockers" },
      { title: "Payslip publishing", description: "Coordinate secure employee delivery.", meta: "Ready" },
      { title: "Overtime review", description: "Check claim backlog and approval latency.", meta: "8 open" }
    ],
    insights: [
      { title: "Cost trend", summary: "Overtime remains concentrated in Operations and IT support.", footer: "Manager review advised" },
      { title: "Delivery confidence", summary: "Payout delivery stayed above SLA for three consecutive cycles.", footer: "No regressions detected" }
    ],
    feed: [
      { title: "Payroll export prepared", detail: "Finance exported the current payroll batch for review.", timestamp: "18m ago" },
      { title: "Overtime claim escalated", detail: "An overtime request crossed the approval threshold.", timestamp: "1h ago" }
    ]
  },
  manager: {
    eyebrow: "Manager control center",
    title: "Team health, coverage, and approvals",
    description: "Run day-to-day team execution with visibility into attendance, leave impact, shift coverage, and operational approvals.",
    chips: ["Team ready", "Coverage aware", "Approval focused"],
    metrics: [
      { label: "Present today", value: "19 / 22", hint: "Team attendance snapshot", accent: "success" },
      { label: "Pending approvals", value: "5", hint: "Leave, swaps, and corrections", accent: "warning" },
      { label: "Coverage gaps", value: "2", hint: "Shifts needing attention", accent: "danger" },
      { label: "Productivity signal", value: "+7%", hint: "Compared with last week", accent: "info" }
    ],
    actions: [
      { title: "Review team attendance", description: "See presence, lateness, and missing punches", href: "/app/attendance/team", icon: Clock3 },
      { title: "Open approvals", description: "Resolve leave and shift requests", href: "/app/approvals", icon: ClipboardList },
      { title: "Check org map", description: "Managers, team leads, and reporting lines", href: "/app/org-chart", icon: Users },
      { title: "Open projects", description: "Execution and staffing context", href: "/app/projects", icon: FolderKanban }
    ],
    workflows: [
      { title: "Team leave impact", description: "Identify upcoming absences affecting delivery commitments.", meta: "3 conflicts" },
      { title: "Shift swaps", description: "Review swap requests and maintain coverage.", meta: "2 pending" },
      { title: "Attendance exceptions", description: "Correct missing punches and late arrivals quickly.", meta: "4 open" }
    ],
    insights: [
      { title: "Attendance trend", summary: "Punctuality improved after the latest shift notice to the team.", footer: "Continue team lead follow-through" },
      { title: "Capacity outlook", summary: "Tomorrow's staffing is tight for one sub-unit.", footer: "Escalate coverage if needed" }
    ],
    feed: [
      { title: "Shift swap requested", detail: "A coverage change was submitted for tomorrow morning.", timestamp: "9m ago" },
      { title: "Leave request awaiting review", detail: "A team member submitted a casual leave request.", timestamp: "35m ago" }
    ]
  },
  team_lead: {
    eyebrow: "Team lead desk",
    title: "Frontline shift and team coordination",
    description: "Keep your assigned unit aligned on schedules, daily attendance, shift swaps, and frontline workflow execution.",
    chips: ["Frontline ready", "Shift coverage", "Fast approvals"],
    metrics: [
      { label: "Assigned team", value: "12", hint: "Direct reports", accent: "info" },
      { label: "On shift now", value: "10", hint: "Current coverage", accent: "success" },
      { label: "Shift swaps", value: "2", hint: "Pending review", accent: "warning" },
      { label: "Late arrivals", value: "1", hint: "Needs follow-up", accent: "danger" }
    ],
    actions: [
      { title: "Open team attendance", description: "Review current shift presence", href: "/app/attendance/team", icon: Clock3 },
      { title: "Review swaps", description: "Approve or reject swap requests", href: "/app/attendance/shift-swaps", icon: ArrowRightLeft },
      { title: "Open approvals", description: "Handle team workflow requests", href: "/app/approvals", icon: ClipboardList },
      { title: "Team chat", description: "Coordinate updates in real time", href: "/app/chat", icon: BellDot }
    ],
    workflows: [
      { title: "Shift handoff", description: "Coordinate incoming and outgoing shift transitions.", meta: "Today" },
      { title: "Swap coverage", description: "Review each request before it reaches manager escalation.", meta: "2 active" },
      { title: "Missed punches", description: "Work through attendance corrections for your team.", meta: "1 open" }
    ],
    insights: [
      { title: "Coverage trend", summary: "Shift adherence is stable across the current week.", footer: "Low risk of understaffing" },
      { title: "Approval latency", summary: "Your average team request turnaround is under 2 hours.", footer: "Faster than department average" }
    ],
    feed: [
      { title: "Attendance corrected", detail: "A missing punch was updated for a team member.", timestamp: "14m ago" },
      { title: "Swap approved", detail: "Tomorrow's afternoon shift swap was approved.", timestamp: "41m ago" }
    ]
  },
  employee: {
    eyebrow: "Employee workspace",
    title: "Daily work, requests, and collaboration",
    description: "Track your shift, attendance, leave, collaboration, and personal workflow from one clean premium workspace.",
    chips: ["Shift ready", "Leave aware", "Chat connected"],
    metrics: [
      { label: "Attendance", value: "Ready", hint: "Today's shift and status", accent: "info" },
      { label: "Upcoming leave", value: "0", hint: "Approved leaves ahead", accent: "success" },
      { label: "Shift swaps", value: "0", hint: "Pending requests", accent: "warning" },
      { label: "Notifications", value: "0", hint: "Unread updates" }
    ],
    actions: [
      { title: "Open attendance", description: "Clock in/out and review today's record", href: "/app/attendance", icon: Clock3 },
      { title: "Request leave", description: "Submit leave and review balances", href: "/app/leave", icon: CalendarCheck2 },
      { title: "Shift swap", description: "Propose a schedule exchange", href: "/app/attendance/shift-swaps", icon: ArrowRightLeft },
      { title: "Team chat", description: "Collaborate with your team", href: "/app/chat", icon: BellDot },
      { title: "Knowledge base", description: "Access SOPs and company resources", href: "/app/resources", icon: GraduationCap },
      { title: "My notes", description: "Personal notes and reference files", href: "/app/notes", icon: FileStack }
    ],
    workflows: [
      { title: "Attendance today", description: "Clock status, geo verification, and today's punch timeline.", meta: "Today" },
      { title: "Leave requests", description: "Track pending, approved, and cancelled requests.", meta: "0 open" },
      { title: "Team updates", description: "Watch announcements, swaps, and schedule changes.", meta: "Live" }
    ],
    insights: [
      { title: "Attendance momentum", summary: "Track working hours and late marks over the last 10 days.", footer: "Chart-ready trend lane" },
      { title: "Leave balance trend", summary: "Used vs remaining leave by type for the current year.", footer: "Annual leave overview" }
    ],
    feed: [
      { title: "Workspace initialized", detail: "Your personal daily workspace is ready for action.", timestamp: "Just now" },
      { title: "Notifications synced", detail: "Inbox, requests, and team alerts are up to date.", timestamp: "Live" }
    ]
  },
  it: {
    eyebrow: "IT operations",
    title: "Identity, security, and systems monitoring",
    description: "Monitor access posture, security signals, notification failures, and platform reliability from an IT-first command desk.",
    chips: ["Security ready", "Alert aware", "Access governance"],
    metrics: [
      { label: "Security events", value: "3", hint: "Open alerts", accent: "danger" },
      { label: "Failed logins", value: "7", hint: "Last 24 hours", accent: "warning" },
      { label: "Role changes", value: "2", hint: "Recent access modifications", accent: "info" },
      { label: "System health", value: "99.9%", hint: "Current availability", accent: "success" }
    ],
    actions: [
      { title: "Open monitoring", description: "System posture and alerts", href: "/app/monitoring", icon: ShieldCheck },
      { title: "Notifications", description: "Delivery issues and system alerts", href: "/app/notifications", icon: BellDot },
      { title: "Employees", description: "Access context and user assignments", href: "/app/employees", icon: Users },
      { title: "Settings", description: "Security and configuration controls", href: "/app/settings", icon: ShieldCheck }
    ],
    workflows: [
      { title: "Access review", description: "Validate role assignments and privilege changes.", meta: "2 pending" },
      { title: "Delivery failures", description: "Check notification and event delivery signals.", meta: "1 alert" },
      { title: "System monitoring", description: "Track uptime, health, and infrastructure signals.", meta: "Stable" }
    ],
    insights: [
      { title: "Threat surface", summary: "Failed login attempts are concentrated in two user accounts.", footer: "Prompt password reset if repeated" },
      { title: "Platform stability", summary: "Monitoring shows stable throughput and low alert volume.", footer: "No urgent intervention required" }
    ],
    feed: [
      { title: "Security alert reviewed", detail: "A flagged authentication event was closed.", timestamp: "28m ago" },
      { title: "Role change logged", detail: "A manager received a new approval capability.", timestamp: "52m ago" }
    ]
  },
  platform_owner: {
    eyebrow: "Platform oversight",
    title: "Cross-tenant operational oversight",
    description: "Use the isolated platform shell for company-wide metrics, security signals, and subscription governance.",
    chips: ["Cross-tenant", "Governance", "Read only"],
    metrics: [
      { label: "Tenants", value: "14", hint: "Provisioned workspaces", accent: "info" },
      { label: "Open incidents", value: "1", hint: "Platform alerts", accent: "warning" },
      { label: "Seat utilization", value: "82%", hint: "Across active subscriptions", accent: "success" },
      { label: "Compliance score", value: "96%", hint: "Governance posture" }
    ],
    actions: [
      { title: "Open platform shell", description: "Global oversight and operations", href: "/platform", icon: ShieldCheck },
      { title: "Review tenants", description: "Companies and subscription health", href: "/app/billing", icon: HandCoins },
      { title: "Monitoring", description: "Platform alerts and health", href: "/app/monitoring", icon: ChartColumnBig },
      { title: "Approvals", description: "Cross-tenant governance queue", href: "/app/approvals", icon: ClipboardList }
    ],
    workflows: [
      { title: "Subscription integrity", description: "Track billing, delinquency, and provisioning state.", meta: "Healthy" },
      { title: "Platform alerts", description: "Review incidents and operational warnings.", meta: "1 incident" },
      { title: "Governance feed", description: "Audit and lifecycle events across tenants.", meta: "Live" }
    ],
    insights: [
      { title: "Tenant growth", summary: "Seat growth is strongest in Operations-heavy companies.", footer: "Potential expansion targets" },
      { title: "Risk posture", summary: "No critical governance regression detected this week.", footer: "Platform stable" }
    ],
    feed: [
      { title: "Platform sync completed", detail: "Cross-tenant snapshots refreshed successfully.", timestamp: "11m ago" },
      { title: "Audit queue healthy", detail: "No stuck governance events detected.", timestamp: "1h ago" }
    ]
  }
};

const modeTabs = [
  { id: "workspace", label: "Workspace" },
  { id: "analytics", label: "Analytics" },
  { id: "operations", label: "Operations" }
];

export const RoleHomeFoundation = ({ persona }: { persona: DashboardPersona }) => {
  const [mode, setMode] = useState<Mode>("workspace");
  const blueprint = BLUEPRINTS[persona];

  const analyticsFooter = useMemo(
    () => ["Attendance trend lane", "Leave utilization comparison", "Approval backlog comparison"],
    []
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={blueprint.eyebrow}
        title={blueprint.title}
        description={blueprint.description}
        actions={<OverviewChips chips={blueprint.chips} />}
      />

      <DashboardRail>
        <FeatureCallout
          badge="Premium workspace"
          title="Role-ready operating surface"
          description="Use the V2 shell to move between daily execution, analytics, and workflow decisions without switching products or duplicating context."
        />

        <SurfacePanel title="View modes" description="Pick the perspective that matches your current decision horizon.">
          <div className="space-y-4">
            <Tabs tabs={modeTabs} active={mode} onChange={(id) => setMode(id as Mode)} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">Immediate actions, approvals, and daily operating context.</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analytics</div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">Chart-ready insight surfaces for comparison and trend analysis.</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Operations</div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">Queues, policies, and workflow throughput that need action.</div>
              </div>
            </div>
          </div>
        </SurfacePanel>
      </DashboardRail>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {blueprint.metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            accent={metric.accent}
          />
        ))}
      </section>

      {mode === "workspace" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <SectionContainer title="Action center" subtitle="Jump straight into the most relevant workflows for your role.">
            <div className="grid gap-4 md:grid-cols-2">
              {blueprint.actions.map((action) => (
                <ActionCard
                  key={action.title}
                  title={action.title}
                  description={action.description}
                  href={action.href}
                  icon={action.icon}
                />
              ))}
            </div>
          </SectionContainer>

          <SectionContainer title="Workflow focus" subtitle="Track the decisions and queues that need attention right now.">
            <div className="space-y-3">
              {blueprint.workflows.map((workflow) => (
                <div key={workflow.title} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{workflow.title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{workflow.description}</div>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{workflow.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionContainer>
        </div>
      ) : null}

      {mode === "analytics" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionContainer title="Insight panels" subtitle="Comparison-ready analytics surfaces without binding to specific charts yet.">
            <div className="grid gap-4 md:grid-cols-2">
              {blueprint.insights.map((insight) => (
                <div key={insight.title} className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{insight.title}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">{insight.summary}</p>
                  <div className="mt-5 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                    <span>{insight.footer}</span>
                    <ChartColumnBig className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer title="Analytics lanes" subtitle="Reserved lanes for chart widgets, comparisons, and forecast views.">
            <div className="space-y-4">
              {analyticsFooter.map((lane) => (
                <div key={lane} className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{lane}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ready for lazy-loaded chart widgets in the next pass.</div>
                    </div>
                    <ChartColumnBig className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </SectionContainer>
        </div>
      ) : null}

      {mode === "operations" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <SectionContainer title="Operations lanes" subtitle="Queues and approvals configured for rapid execution.">
            <div className="space-y-3">
              {blueprint.workflows.map((workflow) => (
                <div key={workflow.title} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{workflow.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{workflow.description}</div>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{workflow.meta}</div>
                </div>
              ))}
            </div>
          </SectionContainer>

          <SectionContainer title="Role activity" subtitle="Recent workflow signals for this persona.">
            <div className="space-y-3">
              {blueprint.feed.map((event) => (
                <div key={`${event.title}-${event.timestamp}`} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.title}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{event.detail}</div>
                    </div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{event.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionContainer>
        </div>
      ) : null}
    </PageContainer>
  );
};

