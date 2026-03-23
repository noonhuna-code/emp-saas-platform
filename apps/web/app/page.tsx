import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { FAQList } from "@/components/faq-list";
import { HeroVisual } from "@/components/hero-visual";
import { IntegrationGrid } from "@/components/integration-grid";
import { JsonLd } from "@/components/json-ld";
import { OperatingSystemMap } from "@/components/operating-system-map";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { RelatedSolutions } from "@/components/related-solutions";
import { SectionHeading } from "@/components/section-heading";
import {
  comparisonPoints,
  featuredModules,
  getSeoClusterLinks,
  homeFaqs,
  homepageProofStrip,
  implementationJourney,
  integrationCategories,
  operatingCoverage,
  operatingModelLayers,
  pricingTiers,
  proofSectors,
  roleBenefits,
  supportCards,
  trustSignals,
  valueStrip,
  workflowSteps
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { faqSchema, organizationSchema, softwareApplicationSchema, websiteSchema } from "@/lib/schema";

const solutionLinks = getSeoClusterLinks([
  "employeeManagement",
  "attendanceManagement",
  "leaveManagement",
  "payrollManagement",
  "workforceAnalytics"
]);

export const metadata = buildMetadata({
  title: "EMP Workforce OS",
  description:
    "EMP helps teams manage employee records, reporting lines, leave approvals, attendance exceptions, payroll visibility, approvals, and workforce analytics in one system.",
  path: "/",
  keywords: [
    "workforce os",
    "company os",
    "employee management software",
    "attendance and leave platform",
    "operations platform for teams"
  ]
});

export default function HomePage() {
  const proofSectorNotes = {
    "Multi-site operations": "Keeps attendance, staffing pressure, and approvals aligned across locations.",
    "Services teams": "Makes leave coverage, manager reviews, and team ownership easier to follow day to day.",
    "Field operations": "Gives supervisors faster visibility into attendance exceptions and shift pressure.",
    "Corporate departments": "Helps approvals, reporting lines, and admin controls stay consistent as teams grow.",
    "Retail groups": "Makes staffing visibility and store-level escalations easier to manage.",
    "Growing back-office teams": "Brings HR, finance, and operations closer to the same records and approval history."
  } as const;

  return (
    <>
      <JsonLd
        data={[
          organizationSchema(),
          websiteSchema(),
          softwareApplicationSchema(
            "EMP Workforce OS",
            "A connected Workforce OS for company management, attendance, leave, approvals, payroll support, collaboration, analytics, and governance.",
            "/"
          ),
          faqSchema(homeFaqs)
        ]}
      />

      <section className="section relative overflow-hidden pt-16 sm:pt-20 lg:pt-24">
        <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.16),transparent_42%)]" />
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center">
            <div className="max-w-3xl">
              <p className="eyebrow">Employee operations for growing teams</p>
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl xl:text-7xl">
                Bring employee records, approvals, and workforce visibility into one{" "}
                <span className="font-display italic font-normal text-teal-800">
                  clearer system
                </span>
                for the teams running the business.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                EMP gives HR, managers, operations, and leadership one place for employee records,
                reporting lines, leave approvals, attendance exceptions, payroll visibility, admin
                controls, and workforce analytics.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Link
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                  href="/demo"
                >
                  Book Demo
                </Link>
                <Link
                  className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950 sm:w-auto"
                  href="/product"
                >
                  Explore Product
                </Link>
                <Link
                  className="inline-flex items-center text-sm font-semibold text-slate-950 underline"
                  href="/security"
                >
                  Review security posture
                </Link>
              </div>
              <div className="mt-8 rounded-[1.6rem] border border-slate-200/80 bg-white/84 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Buying posture
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      Guided demos, public pricing guidance, and direct product answers without pretending the buying motion is self-serve.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Guided evaluation", "Soft public pricing", "Security review available"].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-200 bg-slate-50/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Built around reporting lines and approvals",
                  "Employee records, projects, and collaboration stay connected",
                  "Made for HR, operations, finance, and leadership"
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 text-sm font-medium text-slate-700 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <HeroVisual />
          </div>
        </div>
      </section>

      <section className="section pt-6">
        <div className="container">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {valueStrip.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/78 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur"
              >
                <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_22px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">What buyers want to verify early</p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  The same site should prove product scope, rollout realism, and operational depth quickly.
                </h2>
              </div>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
                href="/demo"
              >
                Book a walkthrough
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {homepageProofStrip.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm font-medium leading-7 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <PlatformSnapshot
              slotId="homepage-platform-overview"
              eyebrow="Platform overview"
              title="One command layer for workforce execution"
              description="See how approvals, staffing pressure, payroll visibility, and reporting context can live in one operating workspace."
              sidebarTitle="Northstar Group"
              sidebarSubtitle="Regional operations workspace"
              sidebarItems={[
                "Live org hierarchy",
                "Approval routing by owner",
                "Attendance and leave visibility",
                "Audit-friendly workflow history"
              ]}
              metrics={[
                { label: "Active teams", value: "14" },
                { label: "Approval SLA", value: "4.2h" },
                { label: "Workforce coverage", value: "97.1%" }
              ]}
              activityTitle="Executive operating snapshot"
              activityItems={[
                {
                  title: "Payroll readiness review",
                  meta: "7 policy exceptions waiting for resolution",
                  status: "Finance + HR"
                },
                {
                  title: "Shift coverage watch",
                  meta: "Field operations flagged 2 teams for same-day action",
                  status: "Operations"
                },
                {
                  title: "Manager approval pulse",
                  meta: "42 requests processed with full audit context",
                  status: "Managers"
                }
              ]}
              footerNote="Leadership, HR, and operations can review the same live context without leaving the product."
            />
            <div>
              <p className="eyebrow">Designed for serious operators</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Built for teams that need fewer handoffs and clearer ownership.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EMP brings together the work that usually gets split across inboxes, spreadsheets,
                and lightweight point tools, then ties it back to the real reporting lines and
                approval paths of the business.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Leadership can see staffing pressure, approval delays, and org changes without waiting for a stitched report.",
                  "Managers can move from attendance exceptions or leave approvals straight into action with the right context.",
                  "HR and finance stay closer to the records, approvals, and policy issues that shape payroll visibility."
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.25rem] border border-slate-200 bg-white/85 px-4 py-4 text-sm leading-7 text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Premium comparison"
            title="Why teams move to EMP from spreadsheets and scattered tools."
            description="The difference is easier to understand when buyers compare day-to-day workforce operations in one system versus a stack of disconnected tools."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/82 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fragmented stack
              </p>
              <div className="mt-6 space-y-4">
                {comparisonPoints.map((point) => (
                  <div key={point.fragmented} className="rounded-[1.5rem] bg-slate-50 p-5">
                    <p className="text-base leading-7 text-slate-700">{point.fragmented}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-7 text-white shadow-[0_25px_100px_rgba(15,23,42,0.18)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                EMP Workforce OS
              </p>
              <div className="mt-6 space-y-4">
                {comparisonPoints.map((point) => (
                  <div key={point.emp} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-base leading-7 text-slate-200">{point.emp}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <OperatingSystemMap
        description="EMP works best when company structure, approvals, day-to-day workforce workflows, and leadership visibility all follow the same operating model instead of being rebuilt in separate tools."
        layers={operatingModelLayers}
        eyebrow="How EMP works together"
        title="Start with the company structure, then let every workflow inherit the same system."
      />

      <section className="section pt-0">
        <div className="container">
          <SectionHeading
            eyebrow="Work beyond HR admin"
            title="Projects, collaboration, and follow-through belong inside the same operating system."
            description="Repo truth already supports project management, task comments, chat direction, notifications, and knowledge workflows. The public story should show that EMP is built for execution as well as records."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredModules.slice(2, 6).map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_22px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">Platform coverage</p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  The workflows buyers usually compare can still stay tied to one operating layer.
                </h2>
              </div>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950 lg:self-start"
                href="/modules"
              >
                Review modules
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {operatingCoverage.map((item) => (
                <div
                  key={item}
                  className="rounded-full border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <SectionHeading
            eyebrow="Integrations and automation"
            title="Keep EMP connected to the tools teams already rely on."
            description="Messaging, identity, work tracking, exports, and internal automation should support the operating model, not break it into disconnected systems."
          />
          <div className="mt-10">
            <IntegrationGrid categories={integrationCategories.slice(0, 4)} />
          </div>
          <div className="mt-6 flex justify-start">
            <Link
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
              href="/integrations"
            >
              Explore integrations
            </Link>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_22px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">Directional pricing</p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Pricing gives buyers a clear starting point without forcing a buying decision too early.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Start with Starter, Growth, or Enterprise, then shape the conversation around
                  rollout scope, governance, support expectations, and the modules your team actually
                  needs. Most teams begin with a guided demo, with an optional 14-day trial for
                  qualified teams.
                </p>
              </div>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950 lg:self-start"
                href="/pricing"
              >
                Review pricing
              </Link>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {pricingTiers.map((tier) => (
                <article
                  key={tier.name}
                  className={`rounded-[1.6rem] border p-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)] ${
                    tier.featured
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50/85 text-slate-950"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                          tier.featured ? "text-slate-300" : "text-teal-700"
                        }`}
                      >
                        {tier.name}
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight">{tier.price}</p>
                    </div>
                    {tier.featured ? (
                      <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-3 text-sm ${tier.featured ? "text-slate-300" : "text-slate-500"}`}>
                    {tier.cadence}
                  </p>
                  <p className={`mt-4 text-sm leading-7 ${tier.featured ? "text-slate-200" : "text-slate-600"}`}>
                    {tier.audience}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="max-w-xl">
              <p className="eyebrow">Operational flow</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                A cleaner path from org structure to day-to-day execution.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EMP starts with the real reporting lines in the business, then uses that model to
                route approvals, show team ownership, and give leadership a more reliable view of
                workforce activity.
              </p>
            </div>
            <div className="space-y-4">
              {workflowSteps.map((step) => (
                <article
                  key={step.step}
                  className="surface rounded-[1.75rem] p-6 sm:flex sm:items-start sm:gap-6"
                >
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
                    {step.step}
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <h3 className="text-xl font-semibold text-slate-950">{step.title}</h3>
                    <p className="mt-3 text-base leading-7 text-slate-600">{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
            <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-8 text-white shadow-[0_30px_120px_rgba(15,23,42,0.18)]">
              <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">
                Where EMP fits best
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Built for organizations moving beyond spreadsheet-led coordination.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                EMP is most useful for companies growing across departments, sites, teams, or
                functions and needing clearer ownership across employee operations.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {proofSectors.map((sector) => (
                  <div key={sector} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-semibold text-white">{sector}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      {proofSectorNotes[sector]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <article className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                <p className="eyebrow">Company trust</p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                  EMP should read like a real software company before any proof assets arrive.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  That means a product-led story, honest pricing posture, concrete security review paths, and founder access that stays accountable without taking over the brand.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="text-sm font-semibold text-slate-950 underline" href="/company">
                    Read the company note
                  </Link>
                  <Link className="text-sm font-semibold text-slate-950 underline" href="/demo">
                    Book a guided walkthrough
                  </Link>
                </div>
              </article>
              {roleBenefits.slice(1, 3).map((role) => (
                <article
                  key={role.role}
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]"
                >
                  <h2 className="text-lg font-semibold text-slate-950">{role.role}</h2>
                  <p className="mt-4 text-sm font-medium leading-7 text-slate-800">{role.summary}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{role.details}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-8 text-white shadow-[0_30px_120px_rgba(15,23,42,0.18)]">
              <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">
                Trust and buying posture
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                The public site should feel like the same calm operating standard as the product.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                That means clear pricing expectations, direct founder access when buyers need it,
                and a product story grounded in records, approvals, governance, and rollout reality.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  href="/company"
                >
                  Read the company note
                </Link>
                <Link
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  href="/pricing"
                >
                  Review pricing approach
                </Link>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {trustSignals.map((signal) => (
                <article
                  key={signal.title}
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
                >
                  <h2 className="text-xl font-semibold text-slate-950">{signal.title}</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">{signal.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <SectionHeading
            eyebrow="Implementation and rollout"
            title="A rollout story buyers can believe."
            description="EMP works best when setup, approvals, permissions, and adoption are sequenced around the operating model your teams actually use."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {implementationJourney.map((step, index) => (
              <article
                key={step.title}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
                  Step 0{index + 1}
                </p>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">{step.title}</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">{step.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {supportCards.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
              >
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RelatedSolutions
        eyebrow="Start with your use case"
        title="Explore the workflows buyers usually ask about first."
        description="These pages help teams compare attendance, leave, payroll, analytics, and employee management while still leading back into the main product story."
        links={solutionLinks}
      />

      <section className="section">
        <div className="container">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="FAQ preview"
              title="Questions teams usually ask before they book a first conversation."
              description="These answers help clarify how EMP fits before a buyer commits to a live walkthrough."
            />
            <Link className="text-sm font-semibold text-slate-950 underline" href="/docs">
              Explore docs and help
            </Link>
          </div>
          <div className="mt-10">
            <FAQList items={homeFaqs} />
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="See EMP in action"
        title="Bring employee records, approvals, and workforce visibility into one system your team can actually run."
        description="If you are replacing spreadsheets, disconnected HR tools, or improvised manager workflows, EMP gives you a clearer way to run the work."
        primary={{ href: "/demo", label: "Book Demo" }}
        secondary={{ href: "/pricing", label: "Review pricing approach" }}
      />
    </>
  );
}
