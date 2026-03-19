import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { FAQList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { SectionHeading } from "@/components/section-heading";
import { comparisonTable, pricingDrivers, pricingFaqs, pricingTiers } from "@/lib/content";
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
        Public pricing gives buyers a realistic starting point. Final pricing can still flex with
        deployment scope, implementation support, governance needs, and organizational complexity.
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
            <span className="font-display italic font-normal text-teal-800">connected operating system</span>.
          </>
        }
        description="Use the directional 3-plan structure to understand fit, start with a guided demo, and move into an optional 14-day trial when the rollout case is clear."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Pricing" }
        ]}
        actions={[
          { href: "/contact", label: "Book Demo" },
          { href: "/security", label: "Review Security" }
        ]}
        aside={<PricingAside />}
      />

      <section className="section">
        <div className="container">
          <div className="mb-10 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">Commercial walkthrough</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Put pricing beside rollout reality, not in isolation.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Enterprise buyers usually want enough commercial clarity to assess fit while still
                pressure-testing scope, support, governance, and deployment complexity.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Three clear plans: Starter, Growth, and Enterprise.",
                  "A guided demo before deeper commercial scoping.",
                  "An optional 14-day trial for qualified teams that want hands-on evaluation."
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
              title="Commercial fit with implementation context"
              description="A commercial view that keeps plan options, onboarding context, and rollout considerations in one place."
              sidebarTitle="Commercial review"
              sidebarSubtitle="Directional pricing with rollout guidance"
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
              footerNote="Use this section for plan comparisons, rollout views, or onboarding context."
            />
          </div>

          <div className="mb-8 rounded-[1.75rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
            <p className="eyebrow">Launch pricing model</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Keep the public story clear while leaving room for rollout reality.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              The pricing model gives finance, HR, and operations leaders enough structure to judge
              fit without forcing the commercial conversation before deployment scope is understood.
            </p>
            <div className="mt-5 rounded-[1.5rem] border border-teal-100 bg-teal-50/80 px-5 py-4 text-sm leading-7 text-teal-950">
              Preferred path: book a guided demo, confirm scope and fit, then open a 14-day trial
              if your team needs a hands-on evaluation before rollout planning.
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                ["Starter", "For teams establishing workforce control with a lighter rollout scope."],
                ["Growth", "For multi-team organizations needing stronger coordination and visibility."],
                ["Enterprise", "For governance-heavy rollouts, advanced support, and tailored deployment."]
              ].map(([title, body]) => (
                <div key={title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">{title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`rounded-[2rem] border p-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ${
                  tier.featured
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200/80 bg-white/85 text-slate-950"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-sm font-semibold uppercase tracking-[0.18em] ${
                        tier.featured ? "text-slate-300" : "text-teal-700"
                      }`}
                    >
                      {tier.name}
                    </p>
                    <p className="mt-4 text-4xl font-semibold tracking-tight">{tier.price}</p>
                    <p className={`mt-2 text-sm ${tier.featured ? "text-slate-300" : "text-slate-500"}`}>
                      {tier.cadence}
                    </p>
                  </div>
                  {tier.featured ? (
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className={`mt-6 text-sm font-medium leading-7 ${tier.featured ? "text-white" : "text-slate-800"}`}>
                  {tier.audience}
                </p>
                <p className={`mt-3 text-base leading-7 ${tier.featured ? "text-slate-300" : "text-slate-600"}`}>
                  {tier.description}
                </p>
                <p className={`mt-4 text-xs uppercase tracking-[0.18em] ${tier.featured ? "text-slate-400" : "text-slate-500"}`}>
                  Directional launch pricing
                </p>
                <ul className="mt-6 grid gap-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        tier.featured
                          ? "border border-white/10 bg-white/5 text-slate-200"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  className={`mt-7 inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                    tier.featured
                      ? "bg-white text-slate-950 hover:bg-slate-100"
                      : "bg-slate-950 text-white hover:bg-slate-800"
                  }`}
                  href={tier.cta.href}
                >
                  {tier.cta.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <SectionHeading
            eyebrow="What shapes pricing"
            title="A more realistic commercial story for serious buyers."
            description="This helps the pricing page feel enterprise-ready without pretending every customer fits the same deployment profile."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {pricingDrivers.map((item) => (
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

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Feature comparison"
            title="A clean buying view for functionality and rollout support."
            description="The comparison below keeps the public story simple while still showing meaningful differences across tiers."
          />
          <div className="mt-10 overflow-x-auto rounded-[2rem] border border-slate-200/80 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <table className="min-w-[720px] w-full border-collapse text-left">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold">Capability</th>
                  <th className="px-6 py-4 text-sm font-semibold">Starter</th>
                  <th className="px-6 py-4 text-sm font-semibold">Growth</th>
                  <th className="px-6 py-4 text-sm font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonTable.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
                  >
                    <th className="px-6 py-4 text-sm font-semibold text-slate-950">{row.feature}</th>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.starter}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.growth}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-6 py-5 text-sm leading-7 text-amber-900">
            Final pricing may vary by deployment model, implementation requirements, governance needs,
            support scope, and organizational complexity.
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
        eyebrow="Need a tailored view"
        title="Use a guided demo to pressure-test pricing against your rollout scope."
        description="We can walk through team size, complexity, governance needs, and the operating workflows you want EMP to replace."
        primary={{ href: "/contact", label: "Book Demo" }}
        secondary={{ href: "/product", label: "Review product" }}
      />
    </>
  );
}
