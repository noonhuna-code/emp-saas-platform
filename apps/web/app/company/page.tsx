import { CTASection } from "@/components/cta-section";
import { FounderSection } from "@/components/founder-section";
import { JsonLd } from "@/components/json-ld";
import { OperatingSystemMap } from "@/components/operating-system-map";
import { PageHero } from "@/components/page-hero";
import { SectionHeading } from "@/components/section-heading";
import {
  companyPrinciples,
  operatingModelLayers,
  pricingTruthNotes,
  trustSignals
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, organizationSchema, websiteSchema } from "@/lib/schema";

export const metadata = buildMetadata({
  title: "Company",
  description:
    "Learn why EMP exists, how the product is evaluated, and what shapes its focus on workforce operations, approvals, governance, and operational clarity.",
  path: "/company",
  keywords: [
    "about emp workforce os",
    "emp company",
    "founder workforce software",
    "workforce operations company"
  ]
});

function CompanyAside() {
  return (
    <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
      <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">What this page clarifies</p>
      <div className="mt-5 grid gap-3">
        {[
          "Why EMP is positioned around workforce operations, not just generic HR software",
          "How founder presence stays visible without overpowering the company story",
          "Why pricing stays public enough to be useful and soft enough to stay honest"
        ].map((item) => (
          <div
            key={item}
            className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompanyPage() {
  return (
    <>
      <JsonLd
        data={[
          organizationSchema(),
          websiteSchema(),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Company", path: "/company" }
          ])
        ]}
      />

      <PageHero
        eyebrow="Company"
        title={
          <>
            EMP is being built as a calmer, more operationally credible{" "}
            <span className="font-display italic font-normal text-teal-800">
              workforce platform
            </span>
            .
          </>
        }
        description="This is not a generic HR brand story. EMP is intentionally shaped around employee records, reporting lines, approvals, attendance exceptions, leave workflows, payroll visibility, admin controls, and leadership review."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Company" }
        ]}
        actions={[
          { href: "/demo", label: "Book Demo" },
          { href: "/pricing", label: "Review pricing" }
        ]}
        aside={<CompanyAside />}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="What shapes EMP"
            title="The company note stays simple: build software serious teams can actually run."
            description="That means clearer ownership, better operational review, more believable pricing posture, and less distance between the company story and the product reality."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {companyPrinciples.map((item) => (
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

      <OperatingSystemMap
        description="EMP is strongest when buyers understand that the product is meant to start with structure, continue through requests and approvals, and end with clearer leadership visibility."
        layers={operatingModelLayers}
        eyebrow="Why the product is structured this way"
        title="The product story is deliberately built around operating logic, not feature-list theater."
      />

      <section className="section pt-0">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/88 p-7 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
              <p className="eyebrow">How evaluation is handled</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                The commercial story is intentionally honest about rollout, governance, and implementation context.
              </h2>
              <div className="mt-8 grid gap-3">
                {pricingTruthNotes.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.4rem] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm leading-7 text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              {trustSignals.map((item) => (
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
        </div>
      </section>

      <FounderSection />

      <CTASection
        eyebrow="Move into a real product conversation"
        title="Use a guided demo to review EMP with your structure, workflows, and rollout questions in view."
        description="That keeps the next step practical for founders, HR leaders, operations teams, and buyers who need the product story to hold up in detail."
        primary={{ href: "/demo", label: "Book Demo" }}
        secondary={{ href: "/security", label: "Review security" }}
      />
    </>
  );
}
