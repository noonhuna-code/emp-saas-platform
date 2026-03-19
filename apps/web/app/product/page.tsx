import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { RelatedSolutions } from "@/components/related-solutions";
import { SectionHeading } from "@/components/section-heading";
import {
  comparisonPoints,
  getSeoClusterLinks,
  internalLinkCards,
  productPillars,
  roleBenefits,
  workflowSteps
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

const solutionLinks = getSeoClusterLinks([
  "employeeManagement",
  "attendanceManagement",
  "leaveManagement",
  "payrollManagement",
  "workforceAnalytics"
]);

export const metadata = buildMetadata({
  title: "Product",
  description:
    "Explore how EMP connects org structure, workforce workflows, approvals, collaboration, and leadership insight into one operating system.",
  path: "/product",
  keywords: [
    "connected workforce platform",
    "company operating system",
    "employee workflow platform",
    "org structure software"
  ]
});

function ArchitectureAside() {
  return (
    <div className="surface rounded-[2rem] p-6">
      <p className="eyebrow">Platform layers</p>
      <div className="mt-5 space-y-4">
        {[
          {
            title: "Foundation",
            body: "Company structure, employee records, policies, and governance."
          },
          {
            title: "Execution",
            body: "Attendance, leave, projects, collaboration, notifications, and approvals."
          },
          {
            title: "Insight",
            body: "Leadership visibility, auditability, operational reporting, and decision support."
          }
        ].map((item) => (
          <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5">
            <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Product Overview",
            "A connected Workforce OS and Company OS that links people, operations, approvals, collaboration, and leadership insight.",
            "/product"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Product", path: "/product" }
          ])
        ]}
      />

      <PageHero
        eyebrow="Product overview"
        title={
          <>
            One platform for the way a modern organization{" "}
            <span className="font-display italic font-normal text-teal-800">actually operates</span>.
          </>
        }
        description="EMP brings together company structure, workforce operations, approvals, collaboration, knowledge, and reporting so teams can run daily work from the same operating system."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Product" }
        ]}
        actions={[
          { href: "/contact", label: "Book Demo" },
          { href: "/security", label: "Review security" }
        ]}
        aside={<ArchitectureAside />}
      />

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">Platform narrative</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Understand the platform as a system, not a bundle of modules.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EMP connects command views, approvals, org structure, payroll readiness, and
                leadership reporting inside one operating layer built for real teams.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "The same company structure powers execution, permissions, and reporting.",
                  "Operational workflows stay closer to ownership, approvals, and policy context.",
                  "Leadership sees cross-functional bottlenecks without stitched-together reporting."
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
              slotId="product-workspace-overview"
              eyebrow="Product walkthrough"
              title="A single workspace for teams, approvals, and leadership decisions"
              description="A product view that brings structure, execution, and leadership context into one workspace."
              sidebarTitle="Northstar Group"
              sidebarSubtitle="Multi-team workforce control"
              sidebarItems={[
                "Departments and reporting lines",
                "Live approvals and inbox ownership",
                "Attendance, leave, and payroll visibility",
                "Governance-friendly audit history"
              ]}
              metrics={[
                { label: "Pending approvals", value: "42" },
                { label: "Team coverage", value: "97%" },
                { label: "Payroll flags", value: "7" }
              ]}
              activityTitle="Connected operations panel"
              activityItems={[
                {
                  title: "Attendance exception review",
                  meta: "Managers see missing punches with policy context",
                  status: "Resolved faster"
                },
                {
                  title: "Leave overlap signal",
                  meta: "HR spots staffing pressure before approvals finalize",
                  status: "Shared context"
                },
                {
                  title: "Executive summary view",
                  meta: "Leadership sees bottlenecks without stitched reporting",
                  status: "Live insight"
                }
              ]}
              footerNote="Use this section for product views, annotated walkthroughs, or team-specific operating examples."
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Premium comparison"
            title="EMP is built for companies that have outgrown fragmented tools."
            description="Most growing organizations end up with attendance in one place, leave in another, approvals in email, structure in slides, and reporting in spreadsheets. EMP replaces that fragmentation with a connected operating layer."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
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

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="max-w-xl">
              <p className="eyebrow">Feature architecture</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                One system, multiple operating layers.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EMP is structured so foundational company data can power daily workflows, while
                governance and analytics stay close to the work instead of arriving as an afterthought.
              </p>
            </div>
            <div className="grid gap-5">
              {productPillars.map((pillar) => (
                <article key={pillar.title} className="surface rounded-[1.75rem] p-6">
                  <h3 className="text-xl font-semibold text-slate-950">{pillar.title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">{pillar.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Operating model"
            title="A workflow narrative that starts with structure and ends with leadership clarity."
            description="EMP is strongest when the company wants operating discipline, not just record keeping."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {workflowSteps.map((step) => (
              <article
                key={step.step}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
                  Step {step.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Role-based usage"
            title="Different users, one shared operating context."
            description="EMP works because it gives each role what they need without breaking the system into disconnected experiences."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {roleBenefits.map((role) => (
              <article key={role.role} className="surface rounded-[1.75rem] p-6">
                <h3 className="text-lg font-semibold text-slate-950">{role.role}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-800">{role.summary}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{role.details}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RelatedSolutions
        eyebrow="Use-case entry points"
        title="Let buyers enter through category pages without losing the product story."
        description="These internal links preserve the SEO cluster while routing high-intent traffic toward product understanding and a live demo."
        links={solutionLinks}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Keep exploring"
            title="Follow the product story from platform vision to buying and rollout."
            description="These next pages support evaluation, trust review, and stronger conversion flow."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {internalLinkCards.map((item) => (
              <article
                key={item.href}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{item.body}</p>
                <Link className="mt-5 inline-flex text-sm font-semibold text-slate-950 underline" href={item.href}>
                  {item.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="See the connected system"
        title="Walk through how EMP replaces fragmented workforce processes with one operating platform."
        description="A guided demo is the fastest way to see how structure, workflows, permissions, and reporting fit together."
        primary={{ href: "/contact", label: "Book Demo" }}
        secondary={{ href: "/pricing", label: "Review pricing approach" }}
      />
    </>
  );
}
