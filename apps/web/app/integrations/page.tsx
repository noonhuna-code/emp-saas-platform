import { CTASection } from "@/components/cta-section";
import { IntegrationGrid } from "@/components/integration-grid";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { SectionHeading } from "@/components/section-heading";
import {
  implementationJourney,
  integrationCategories,
  integrationSupportPoints,
  integrationWorkflows
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata = buildMetadata({
  title: "Integrations",
  description:
    "Review how EMP connects with messaging, identity, work tracking, exports, and automation workflows without losing workforce structure and approval context.",
  path: "/integrations",
  keywords: [
    "workforce software integrations",
    "employee management integrations",
    "slack approvals integration",
    "workforce operations automation"
  ]
});

function IntegrationsAside() {
  return (
    <div className="surface rounded-[2rem] p-6">
      <p className="eyebrow">What this page covers</p>
      <div className="mt-5 grid gap-3">
        {[
          "Communication and approval notifications",
          "Identity and access alignment",
          "Linear, Jira, and rollout workflows",
          "Exports, APIs, and internal automation"
        ].map((item) => (
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

export default function IntegrationsPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Integrations",
            "Public overview of EMP integrations, exports, APIs, and automation workflows for workforce operations teams.",
            "/integrations"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Integrations", path: "/integrations" }
          ])
        ]}
      />

      <PageHero
        eyebrow="Integrations and automation"
        title={
          <>
            Connect EMP to the systems your teams already{" "}
            <span className="font-display italic font-normal text-teal-800">work inside</span>.
          </>
        }
        description="EMP should not force a disconnected rollout. It should fit your communication tools, identity layer, work tracking systems, and downstream reporting needs while keeping workforce structure and approvals in one source of truth."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Integrations" }
        ]}
        actions={[
          { href: "/demo", label: "Book Demo" },
          { href: "/product", label: "Review product" }
        ]}
        aside={<IntegrationsAside />}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Integration categories"
            title="A practical integration story for workforce operations."
            description="This page focuses on the systems most teams ask about first: notifications, identity, work tracking, exports, and internal automation."
          />
          <div className="mt-10">
            <IntegrationGrid categories={integrationCategories} />
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
              <div className="max-w-xl">
                <p className="eyebrow">How the workflow moves</p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Keep EMP as the source of structure, then let connected tools handle the right next step.
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">
                  The strongest integration pattern is simple: EMP keeps ownership paths, employee records,
                  approvals, and operational context clean, while connected tools handle communication,
                  task movement, downstream exports, and internal automation.
                </p>
              </div>
              <div className="grid gap-4">
                {integrationWorkflows.map((workflow) => (
                  <article
                    key={workflow.title}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50/85 p-5"
                  >
                    <h2 className="text-lg font-semibold text-slate-950">{workflow.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{workflow.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Implementation guidance"
            title="Connect the right systems in the right order."
            description="The goal is not to integrate everything on day one. It is to sequence identity, notifications, exports, and automation around a stable workforce operating model."
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
            {integrationSupportPoints.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
              >
                <h2 className="text-xl font-semibold">{item.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-300">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Plan the right integration path"
        title="Use a guided demo to review which systems should connect first."
        description="We can walk through messaging, identity, work tracking, exports, and automation needs without overcomplicating the rollout."
        primary={{ href: "/demo", label: "Book Demo" }}
        secondary={{ href: "/pricing", label: "Review pricing approach" }}
      />
    </>
  );
}
