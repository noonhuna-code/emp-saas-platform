import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { FAQList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { SectionHeading } from "@/components/section-heading";
import { securityFaqs, securityPrinciples, securityReviewTopics } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, faqSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata = buildMetadata({
  title: "Security",
  description:
    "Learn how EMP approaches role-based permissions, auditability, governance, privacy-minded operations, and secure workforce software design.",
  path: "/security",
  keywords: [
    "workforce software security",
    "role based access control",
    "audit trail software",
    "employee data privacy"
  ]
});

function SecurityAside() {
  return (
    <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
      <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">Trust posture</p>
      <div className="mt-5 grid gap-3">
        {[
          "Role-aware access",
          "Approval accountability",
          "Operational auditability",
          "Governance-conscious administration"
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Security",
            "Security positioning for permissions, governance, auditability, and privacy-minded workforce operations.",
            "/security"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Security", path: "/security" }
          ]),
          faqSchema(securityFaqs)
        ]}
      />

      <PageHero
        eyebrow="Security and trust"
        title={
          <>
            Built for responsible workforce operations and stronger{" "}
            <span className="font-display italic font-normal text-teal-800">
              organizational control
            </span>
            .
          </>
        }
        description="EMP is positioned for organizations that need sensitive workforce workflows to be handled with clear permissions, governance discipline, and practical operational accountability."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Security" }
        ]}
        actions={[
          { href: "/contact", label: "Book Demo" },
          { href: "/product", label: "Review product" }
        ]}
        aside={<SecurityAside />}
      />

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">Security UX</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Trust should feel product-native, not bolted on.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Enterprise buyers want to see permissions, reviewability, and governance as part of
                the product model itself, with operating controls visible where the work happens.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Role boundaries stay easier to reason about during day-to-day workflows.",
                  "Approval history remains closer to the records teams need to review.",
                  "Security review can happen alongside product evaluation instead of after it."
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
              slotId="security-review-overview"
              eyebrow="Security review"
              title="Permissions, auditability, and control in one view"
              description="A security-focused product view that brings approval history, access boundaries, and governance context together."
              sidebarTitle="Security review workspace"
              sidebarSubtitle="Role-aware workforce operations"
              sidebarItems={[
                "Approval audit history",
                "Admin governance controls",
                "Sensitive workflow visibility",
                "Operational ownership boundaries"
              ]}
              metrics={[
                { label: "Approval trail", value: "100%" },
                { label: "Role scopes", value: "12" },
                { label: "Governed actions", value: "48" }
              ]}
              activityTitle="Trust and review panel"
              activityItems={[
                {
                  title: "Role-based access review",
                  meta: "Managers act within team scope while HR controls sensitive workflows",
                  status: "Scoped"
                },
                {
                  title: "Approval history visibility",
                  meta: "Requests remain reviewable without reconstructing context from email",
                  status: "Auditable"
                },
                {
                  title: "Governance changes",
                  meta: "Admins keep settings and ownership boundaries easier to trace",
                  status: "Controlled"
                }
              ]}
              footerNote="Use this section for security views, governance walkthroughs, or approval-history examples."
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Security principles"
            title="Trust starts with the product model, not a separate policy page."
            description="EMP's product story emphasizes access boundaries, reviewability, governance, and privacy-minded handling of workforce information."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {securityPrinciples.map((principle) => (
              <article key={principle.title} className="surface rounded-[1.75rem] p-6">
                <h2 className="text-xl font-semibold text-slate-950">{principle.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{principle.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-7 shadow-[0_22px_80px_rgba(15,23,42,0.06)]">
            <p className="eyebrow">Security review topics</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The kinds of conversations enterprise buyers usually want to have.
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              We avoid unsupported compliance claims here. Instead, this page frames the areas that
              matter when teams evaluate a workforce platform with sensitive operating data.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {securityReviewTopics.map((topic) => (
                <div
                  key={topic}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm font-medium text-slate-700"
                >
                  {topic}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Premium comparison"
            title="Show how EMP handles trust-sensitive workflows more cleanly."
            description="This makes the security story more operational and conversion-friendly for serious buyers."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <p className="eyebrow">Without structured control</p>
              <ul className="mt-6 grid gap-3">
                {[
                  "Approvals happen in email or chat with limited review context.",
                  "Sensitive workforce actions get routed through unclear ownership paths.",
                  "Leadership asks for proof after changes are already hard to reconstruct."
                ].map((item) => (
                  <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-7 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
              <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">With EMP</p>
              <div className="mt-6 grid gap-3">
                {[
                  "Role-based views keep responsibilities better contained.",
                  "Requests, approvals, and changes stay closer to shared platform context.",
                  "Governance-sensitive actions remain easier to review and discuss."
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <p className="eyebrow">Role-based access</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Give each user the right authority level.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                EMP is designed so user access can reflect role, function, reporting structure, and
                operational responsibility. That keeps sensitive actions better contained and makes
                day-to-day workflows easier to govern.
              </p>
            </article>

            <article className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              <p className="eyebrow">Privacy-minded operations</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Present employee data as sensitive operating information.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                The page now frames workforce data, approvals, and governance-sensitive records as
                operational assets that deserve deliberate access and careful process design.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Controlled access", "Reviewability", "Governance", "Responsible admin"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Security FAQ"
            title="Trust questions buyers often raise during evaluation."
            description="The answers here build confidence without making unsupported compliance claims."
          />
          <div className="mt-10">
            <FAQList items={securityFaqs} />
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
              <div>
                <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">Next step</p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  Continue the security conversation with a live product walkthrough.
                </h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  Buyers usually want to pressure-test permissions, governance, and rollout
                  expectations against their own operating model before they move forward.
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
                  href="/docs"
                >
                  Browse docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Continue the security conversation"
        title="Use a demo or sales call to review permissions, governance, and rollout expectations."
        description="We can tailor the conversation around your organization's operational complexity and trust requirements."
        primary={{ href: "/contact", label: "Book Demo" }}
        secondary={{ href: "/docs", label: "Browse docs" }}
      />
    </>
  );
}
