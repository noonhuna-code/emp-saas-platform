import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { RelatedSolutions } from "@/components/related-solutions";
import { SectionHeading } from "@/components/section-heading";
import { getSeoClusterLinks, modules } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

const solutionLinks = getSeoClusterLinks([
  "attendanceManagement",
  "leaveManagement",
  "payrollManagement",
  "employeeDirectory",
  "workforceAnalytics"
]);

export const metadata = buildMetadata({
  title: "Modules",
  description:
    "Review EMP modules for attendance, leave, employee profiles, org structure, payroll support, projects, collaboration, approvals, analytics, knowledge, and governance.",
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
      <p className="eyebrow">Connected modules</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {["Attendance", "Leave", "Projects", "Approvals", "Analytics", "Knowledge"].map((item) => (
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
            Detailed modules built to work like one{" "}
            <span className="font-display italic font-normal text-teal-800">company system</span>.
          </>
        }
        description="Each EMP module solves a specific operational problem while staying connected to the same company structure, roles, approvals, and reporting model."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Modules" }
        ]}
        actions={[
          { href: "/contact", label: "Book Demo" },
          { href: "/product", label: "Explore Product" }
        ]}
        aside={<ModulesAside />}
      />

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">Module orchestration</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                See how each module inherits the same operating foundation.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Attendance, leave, approvals, analytics, and governance all inherit the same
                company model, so teams gain depth without creating another disconnected stack.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Core workflows stay aligned to one org structure and permissions model.",
                  "Shared records reduce duplicate entry, reconciliation, and admin friction.",
                  "Companies can start with one pain point and expand without rebuilding the foundation."
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
              eyebrow="Module overview"
              title="Shared context across every workflow"
              description="A unified module view that shows how attendance, leave, approvals, and reporting work together."
              sidebarTitle="Module workspace"
              sidebarSubtitle="Connected through one org model"
              sidebarItems={[
                "Attendance and leave",
                "Approvals and notifications",
                "Payroll support and reporting",
                "Admin settings and governance"
              ]}
              metrics={[
                { label: "Core workflows", value: "11" },
                { label: "Shared data model", value: "1" },
                { label: "Approval touchpoints", value: "6" }
              ]}
              activityTitle="How modules reinforce each other"
              activityItems={[
                {
                  title: "Attendance affects payroll support",
                  meta: "Cleaner upstream records reduce downstream reconciliation",
                  status: "Connected"
                },
                {
                  title: "Leave affects team coverage",
                  meta: "Managers see overlap and staffing impact before approval",
                  status: "Visible"
                },
                {
                  title: "Analytics reflects live execution",
                  meta: "Leadership sees activity from the same operating layer",
                  status: "Actionable"
                }
              ]}
              footerNote="Use this area for module walkthroughs, product views, or category-specific workflow examples."
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Module catalog"
            title="From workforce basics to broader company coordination."
            description="EMP covers the workflows that usually get split across HR tools, operations tools, chat threads, inboxes, and reporting spreadsheets."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <article key={module.name} className="surface rounded-[1.75rem] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                  {module.name}
                </p>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">{module.value}</h2>
                <div className="mt-6 rounded-[1.5rem] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Problem solved
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{module.problem}</p>
                </div>
                <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Example use case
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
          <SectionHeading
            eyebrow="Premium comparison"
            title="Why connected modules outperform a point-tool stack."
            description="Enterprise buyers want the module story to explain why the platform is easier to govern, expand, and operate over time."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              {
                title: "Shared context matters",
                body: "The real advantage is not any single module. It is the fact that each one inherits the same structure, users, and ownership paths."
              },
              {
                title: "Less duplicate work",
                body: "When profiles, attendance, approvals, and reporting all refer to the same operating model, teams stop re-entering or reconciling the same facts."
              },
              {
                title: "Cleaner expansion path",
                body: "Companies can start with core workflows and expand into analytics, knowledge, collaboration, and governance without rebuilding the foundation."
              }
            ].map((item) => (
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

      <RelatedSolutions
        eyebrow="High-intent entry points"
        title="Connect module exploration to the SEO solution cluster."
        description="Use these routes to catch buyer intent around specific software categories while still guiding visitors into a demo and broader product review."
        links={solutionLinks}
      />

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
              <div>
                <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">Buying flow</p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  Start with your highest-friction workflow, then expand with confidence.
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  The module story should make it easy for a buyer to begin with attendance, leave,
                  payroll support, or analytics, then see how a broader rollout creates more value.
                </p>
              </div>
              <div className="space-y-3">
                <Link
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  href="/contact"
                >
                  Book Demo
                </Link>
                <Link
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  href="/product"
                >
                  Review product
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Choose your starting point"
        title="See which EMP modules matter most for your current operating stage."
        description="We can start with the workflows creating the most friction today and expand the platform footprint as your teams mature."
        primary={{ href: "/contact", label: "Book Demo" }}
        secondary={{ href: "/pricing", label: "Review pricing approach" }}
      />
    </>
  );
}
