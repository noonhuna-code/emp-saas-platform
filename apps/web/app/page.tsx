import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { FAQList } from "@/components/faq-list";
import { HeroVisual } from "@/components/hero-visual";
import { JsonLd } from "@/components/json-ld";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { RelatedSolutions } from "@/components/related-solutions";
import { SectionHeading } from "@/components/section-heading";
import {
  comparisonPoints,
  getSeoClusterLinks,
  homeFaqs,
  operatingCoverage,
  pricingTiers,
  proofSectors,
  roleBenefits,
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
    "EMP is a premium Workforce OS for modern organizations that need company structure, approvals, attendance, leave, collaboration, payroll support, and leadership insight in one system.",
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

      <section className="section relative overflow-hidden pt-10 sm:pt-14">
        <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.16),transparent_42%)]" />
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center">
            <div className="max-w-3xl">
              <p className="eyebrow">Workforce OS for modern organizations</p>
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl xl:text-7xl">
                Replace fragmented HR and operations tooling with one{" "}
                <span className="font-display italic font-normal text-teal-800">
                  premium operating system
                </span>
                .
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                EMP gives leadership, HR, finance, and managers one connected platform for company
                structure, workforce workflows, approvals, collaboration, payroll readiness, and
                executive insight.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Link
                  className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                  href="/contact"
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
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Built for multi-team organizations",
                  "Designed around hierarchy and approvals",
                  "Structured for executive visibility"
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

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <PlatformSnapshot
              slotId="homepage-platform-overview"
              eyebrow="Platform overview"
              title="One command layer for workforce execution"
              description="See how approvals, staffing pressure, payroll readiness, and team context can live in one operating workspace."
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
              footerNote="Use this section to show leadership views, live workflows, or a tailored product walkthrough."
            />
            <div>
              <p className="eyebrow">Designed for serious operators</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                A structured operating model creates a more credible product story.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EMP gives leadership, HR, finance, and managers one system for the workflows that
                usually get scattered across spreadsheets, inboxes, and disconnected tools.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Leadership gets a live command view across teams, approvals, and workforce pressure.",
                  "Managers can move from exceptions to action without losing operating context.",
                  "HR and finance stay closer to the records that shape payroll, policy, and reporting."
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
            title="Why EMP converts better than a fragmented workforce stack."
            description="A clear side-by-side comparison makes the product positioning sharper for enterprise buyers and founders evaluating operating risk."
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

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Platform coverage"
            title="Built to cover the workforce and company workflows that usually get split apart."
            description="The EMP story is strongest when buyers can immediately see that the platform spans both people operations and broader company coordination."
          />
          <div className="mt-10 rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_22px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_22px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">Directional pricing</p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Public pricing gives buyers a clear starting point without forcing checkout too early.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Use Starter, Growth, and Enterprise guidance to assess fit, then tailor commercial
                  details around rollout scope, governance, and support expectations. Most buyers start
                  with a guided demo, with an optional 14-day trial available for qualified teams.
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
                A cleaner buying story from structure to execution.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EMP starts with how the company is actually shaped, then uses that model to route
                requests, show accountability, and give leadership a live view of workforce motion.
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
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
            <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-8 text-white shadow-[0_30px_120px_rgba(15,23,42,0.18)]">
              <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">
                Enterprise proof points
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Built for organizations replacing spreadsheet-led coordination.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                EMP is especially relevant for companies that are growing across departments,
                teams, sites, or functions and need a cleaner operating layer than a patchwork of
                point tools can offer.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {proofSectors.map((sector) => (
                  <div key={sector} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-semibold text-white">{sector}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      Strong fit when managers, HR, and leadership all need shared operational context.
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
              {roleBenefits.slice(0, 3).map((role) => (
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

      <RelatedSolutions
        eyebrow="Start with your use case"
        title="Move from high-intent search pages into a live product conversation."
        description="The SEO cluster stays active, but these pages now route buyers more cleanly into product evaluation, security review, and demo conversion."
        links={solutionLinks}
      />

      <section className="section">
        <div className="container">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="FAQ preview"
              title="Questions teams usually ask before they book a first conversation."
              description="Clear positioning matters when a platform spans both people operations and company execution."
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
        title="Bring company structure, workforce workflows, and leadership visibility into one serious system."
        description="If you are replacing spreadsheets, fragmented HR tools, or improvised manager workflows, EMP gives you a cleaner operating foundation."
        primary={{ href: "/contact", label: "Book Demo" }}
        secondary={{ href: "/pricing", label: "Review pricing approach" }}
      />
    </>
  );
}
