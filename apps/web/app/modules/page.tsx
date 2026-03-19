import { CTASection } from "@/components/cta-section";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { SectionHeading } from "@/components/section-heading";
import { modules } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata = buildMetadata({
  title: "Modules",
  description:
    "Review EMP modules for attendance, leave, employee records, organization structure, payroll visibility, projects, collaboration, approval routing, analytics, knowledge, and governance.",
  path: "/modules",
  keywords: [
    "attendance software",
    "leave management software",
    "employee profiles",
    "org structure tools",
    "workforce analytics"
  ]
});

function ModulesAside() {
  return (
    <div className="surface rounded-[2rem] p-6">
      <p className="eyebrow">Core modules</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {["Employee Records", "Organization", "Attendance", "Leave", "Approval Routing", "Analytics"].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModulesPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Modules",
            "Detailed module coverage for workforce operations, company structure, approvals, collaboration, analytics, and governance.",
            "/modules"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Modules", path: "/modules" }
          ])
        ]}
      />

      <PageHero
        eyebrow="Module breakdown"
        title={
          <>
            Modules built to work as one{" "}
            <span className="font-display italic font-normal text-teal-800">connected product</span>.
          </>
        }
        description="EMP brings employee records, reporting lines, attendance, leave, payroll visibility, approvals, governance, and analytics into one module system tied to the same org structure."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Modules" }
        ]}
        actions={[{ href: "/contact", label: "Book Demo" }]}
        aside={<ModulesAside />}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Module catalog"
            title="A cleaner module catalog for the workflows teams run every day."
            description="The catalog is built around real operating jobs: employee records, reporting lines, leave approvals, attendance review, payroll visibility, project ownership, approval routing, and admin controls."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <article key={module.name} className="surface rounded-[1.75rem] p-6">
                <h2 className="text-xl font-semibold text-slate-950">{module.name}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{module.value}</p>
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Why teams need it
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{module.problem}</p>
                </div>
                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Operational example
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{module.useCase}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">Why the modules work together</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                The value is not just the list of modules. It is the shared operating model behind them.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Every module inherits the same org hierarchy, departments and teams, reporting
                lines, approval routing, and employee records. That means requests follow the right
                ownership path, payroll visibility stays closer to attendance and leave, and
                leadership sees one operational picture instead of separate systems.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Employee records, attendance, leave, and reporting stay tied to one org structure.",
                  "Requests and approvals inherit the same managers, teams, and policy boundaries.",
                  "Leadership sees staffing pressure, unresolved exceptions, and operating trends from one view."
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
            <PlatformSnapshot
              slotId="modules-workspace-overview"
              eyebrow="Connected system view"
              title="One shared model across every workflow"
              description="Attendance, leave, approvals, payroll visibility, and analytics stay connected because the modules share the same operating structure."
              sidebarTitle="Module workspace"
              sidebarSubtitle="One org model across every module"
              sidebarItems={[
                "Employee records and reporting lines",
                "Attendance, leave, and approval routing",
                "Payroll visibility and manager reviews",
                "Governance settings and workforce analytics"
              ]}
              metrics={[
                { label: "Core modules", value: "11" },
                { label: "Shared org model", value: "1" },
                { label: "Approval paths", value: "6" }
              ]}
              activityTitle="How the modules connect"
              activityItems={[
                {
                  title: "Attendance flows into payroll visibility",
                  meta: "Cleaner daily records reduce late reconciliation for finance and HR",
                  status: "Connected"
                },
                {
                  title: "Leave approvals affect staffing",
                  meta: "Managers see overlap and team pressure before approvals are finalized",
                  status: "Visible"
                },
                {
                  title: "Leadership sees one picture",
                  meta: "Analytics reflects live activity across records, requests, and approvals",
                  status: "Shared view"
                }
              ]}
              footerNote="Each module works on its own, but they create more value when they share the same structure and approval logic."
            />
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="max-w-3xl">
              <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">Next step</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Start with the module creating the most friction today, then expand from a stable foundation.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                A demo can focus on the workflow you care about first, then show how employee
                records, approvals, payroll visibility, admin controls, and analytics connect as the
                rollout grows.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="See the modules in context"
        title="Walk through the EMP modules that matter most to your team."
        description="We can start with the workflow creating the most friction today and show how the rest of the system connects around it."
        primary={{ href: "/contact", label: "Book Demo" }}
        secondary={{ href: "/pricing", label: "Review pricing approach" }}
      />
    </>
  );
}
