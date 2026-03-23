import { CTASection } from "@/components/cta-section";
import { FAQList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { PricingExperience } from "@/components/pricing-experience";
import { SectionHeading } from "@/components/section-heading";
import {
  comparisonTable,
  pricingCommercialGuidance,
  pricingComparisonGroups,
  pricingDrivers,
  pricingFaqs,
  pricingPersonas,
  pricingTruthNotes,
  pricingTiers
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, faqSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata = buildMetadata({
  title: "Pricing",
  description:
    "Review EMP pricing tiers for Starter, Growth, and Enterprise, plus feature comparisons, onboarding context, and demo guidance.",
  path: "/pricing",
  keywords: [
    "workforce software pricing",
    "company os pricing",
    "employee management pricing",
    "enterprise workforce software"
  ]
});

function PricingAside() {
  return (
    <div className="surface rounded-[2rem] p-6">
      <p className="eyebrow">Commercial note</p>
      <p className="mt-5 text-base leading-7 text-slate-700">
        Public pricing gives buyers a realistic starting point. Final commercials can still move
        with rollout scope, implementation support, governance needs, and organizational complexity.
      </p>
      <div className="mt-5 grid gap-3">
        {["Guided demo first", "Optional 14-day trial for qualified teams"].map((item) => (
          <div
            key={item}
            className="rounded-[1.25rem] border border-slate-200 bg-white/85 px-4 py-3 text-sm font-medium text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Pricing",
            "Public pricing guidance for Starter, Growth, and Enterprise deployment options.",
            "/pricing"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Pricing", path: "/pricing" }
          ]),
          faqSchema(pricingFaqs)
        ]}
      />

      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Clear pricing for teams buying a more{" "}
            <span className="font-display italic font-normal text-teal-800">serious workforce platform</span>.
          </>
        }
        description="Use the 3-plan structure to compare fit, understand rollout expectations, and move into a guided commercial conversation without forcing an early buying decision."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Pricing" }
        ]}
        actions={[
          { href: "/demo", label: "Book Demo" },
          { href: "/product", label: "Review Product" }
        ]}
        aside={<PricingAside />}
      />

      <section className="section pt-0">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">Commercial walkthrough</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Put pricing beside rollout reality, not in isolation.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Buyers usually want enough clarity to shortlist a plan while still pressure-testing
                rollout scope, support expectations, governance needs, and deployment complexity.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Starter, Growth, and Enterprise stay visible in one commercial story.",
                  "A guided demo comes before deeper commercial scoping.",
                  "Qualified teams can open a 14-day trial when hands-on evaluation is useful."
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
              slotId="pricing-rollout-overview"
              eyebrow="Pricing and rollout overview"
              title="Commercial fit with rollout context"
              description="A pricing view that keeps plan options, onboarding context, and deployment considerations in one place."
              sidebarTitle="Commercial review"
              sidebarSubtitle="Pricing with rollout guidance"
              sidebarItems={[
                "Starter, Growth, and Enterprise paths",
                "Deployment and onboarding context",
                "Governance and support expectations",
                "Role-based buyer alignment"
              ]}
              metrics={[
                { label: "Plan paths", value: "3" },
                { label: "Buyer groups", value: "4" },
                { label: "Rollout stages", value: "3" }
              ]}
              activityTitle="How pricing discussions usually progress"
              activityItems={[
                {
                  title: "Scope review",
                  meta: "Confirm org complexity, workflows, and operating model",
                  status: "Discovery"
                },
                {
                  title: "Product fit",
                  meta: "Map plan packaging to rollout needs and team maturity",
                  status: "Alignment"
                },
                {
                  title: "Commercial next step",
                  meta: "Refine support, deployment, and pricing approach",
                  status: "Proposal"
                }
              ]}
              footerNote="Pricing becomes easier to assess when rollout scope, support, and operating complexity are visible in the same view."
            />
          </div>
        </div>
      </section>

      <PricingExperience
        comparisonGroups={pricingComparisonGroups}
        comparisonRows={comparisonTable}
        personas={pricingPersonas}
        tiers={pricingTiers}
      />

      <section className="section pt-0">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-8 text-white shadow-[0_28px_100px_rgba(15,23,42,0.18)]">
              <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">Pricing truth</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Public pricing should help buyers qualify fit, not pretend rollout complexity does not exist.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                We keep the commercial story visible enough to be useful, then move into a guided
                conversation when deployment scope, governance needs, and implementation support matter.
              </p>
            </div>
            <div className="grid gap-4">
              {pricingTruthNotes.map((item) => (
                <article
                  key={item}
                  className="rounded-[1.6rem] border border-slate-200 bg-white/88 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
                >
                  <p className="text-sm leading-7 text-slate-700">{item}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <SectionHeading
            eyebrow="Commercial guidance"
            title="A better way to judge Growth versus Enterprise."
            description="This section helps buyers connect pricing to team maturity, rollout shape, governance requirements, and support expectations."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {pricingCommercialGuidance.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-slate-200/80 bg-slate-50/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.04)]">
            <div className="grid gap-5 lg:grid-cols-3">
              {pricingDrivers.map((item) => (
                <div key={item.title}>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Commercial reassurance"
            title="What the pricing conversation usually covers."
            description="This keeps the page practical for buyers who need more than a card comparison before they decide on next steps."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              {
                title: "Implementation guidance stays visible",
                body: "The conversation can cover org setup, admin complexity, reporting needs, and the approval workflows your team needs to run well."
              },
              {
                title: "Growth versus Enterprise gets easier to judge",
                body: "Buyers can compare operational scope, governance needs, rollout support, and support expectations without forcing hard pricing logic."
              },
              {
                title: "The next step stays practical",
                body: "Most teams start with a guided demo, then move into a more specific commercial conversation when product fit and rollout scope are clearer."
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

          <div className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-5 text-sm leading-7 text-amber-900">
            Final pricing may vary by deployment model, implementation requirements, governance
            needs, support scope, and organizational complexity.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Pricing FAQ"
            title="Commercial questions buyers typically ask early."
            description="This keeps the pricing page realistic while leaving room for deployment-specific conversations."
          />
          <div className="mt-10">
            <FAQList items={pricingFaqs} />
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Need a tailored commercial view"
        title="Use a guided demo to pressure-test pricing against your rollout scope."
        description="We can walk through team size, admin complexity, governance needs, and the operating workflows you want EMP to replace."
        primary={{ href: "/demo", label: "Book Demo" }}
        secondary={{ href: "/product", label: "Review product" }}
      />
    </>
  );
}
