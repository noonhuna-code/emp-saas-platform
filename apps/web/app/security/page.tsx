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
      <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">What buyers review</p>
      <div className="mt-5 grid gap-3">
        {[
          "Who can access employee records",
          "How approval history stays reviewable",
          "What admins can control centrally",
          "How rollout and governance are handled"
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
            Security for workforce operations that need{" "}
            <span className="font-display italic font-normal text-teal-800">
              clear operational control
            </span>
            .
          </>
        }
        description="Review how EMP handles employee records, approval routing, admin controls, and workforce visibility with role-aware access and cleaner operational review paths."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Security" }
        ]}
        actions={[
          { href: "/demo", label: "Book Demo" },
          { href: "/product", label: "Review product" }
        ]}
        aside={<SecurityAside />}
      />

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">Product proof</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Security should be visible where managers, HR, and admins actually work.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Buyers usually want to understand access, approvals, audit history, and admin
                control without leaving the product story. EMP keeps those questions close to the
                records, requests, and reporting structure teams already depend on.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Employee records, leave approvals, and attendance exceptions stay tied to role-based views.",
                  "Approval history stays closer to the request instead of being rebuilt from chat and email.",
                  "Admin settings, ownership paths, and governance decisions are easier to review in one system."
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
              title="Permissions, approval history, and admin controls in one workspace"
              description="A security review view that keeps employee access, request history, and governance context visible in the same operating workspace."
              sidebarTitle="Security workspace"
              sidebarSubtitle="Role-aware workforce operations"
              sidebarItems={[
                "Role-aware employee access",
                "Approval history and review trails",
                "Admin settings and ownership rules",
                "Sensitive workflow visibility"
              ]}
              metrics={[
                { label: "Review trails", value: "100%" },
                { label: "Role scopes", value: "12" },
                { label: "Governed actions", value: "48" }
              ]}
              activityTitle="What the review usually focuses on"
              activityItems={[
                {
                  title: "Role-based access review",
                  meta: "Managers stay inside team scope while HR and admins handle more sensitive actions",
                  status: "Scoped"
                },
                {
                  title: "Approval history visibility",
                  meta: "Requests stay reviewable without rebuilding context from email threads",
                  status: "Auditable"
                },
                {
                  title: "Governance changes",
                  meta: "Admins can review settings, ownership boundaries, and policy changes with clearer context",
                  status: "Controlled"
                }
              ]}
              footerNote="A live walkthrough can focus on permissions, approval history, governance settings, and how those controls fit your operating model."
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Security review"
            title="The questions serious buyers usually need answered."
            description="Keep the conversation practical: permissions, employee data access, approval history, admin controls, rollout ownership, and review expectations."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="grid gap-5 md:grid-cols-2">
              {securityPrinciples.map((principle) => (
                <article key={principle.title} className="surface rounded-[1.75rem] p-6">
                  <h2 className="text-xl font-semibold text-slate-950">{principle.title}</h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">{principle.body}</p>
                </article>
              ))}
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-7 shadow-[0_22px_80px_rgba(15,23,42,0.06)]">
              <p className="eyebrow">Review topics</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                The security conversation usually stays grounded in how the product behaves day to day.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                We avoid unsupported compliance language here. The focus is on how employee data,
                approvals, governance settings, and admin responsibilities are handled in practice.
              </p>
              <div className="mt-8 grid gap-3">
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

      <CTASection
        eyebrow="Review security in context"
        title="Use a live walkthrough to pressure-test permissions, governance, and rollout expectations."
        description="We can focus the conversation on employee records, approval routing, admin controls, and the operating complexity your team needs to manage safely."
        primary={{ href: "/demo", label: "Book Demo" }}
        secondary={{ href: "/docs", label: "Browse docs" }}
      />
    </>
  );
}
