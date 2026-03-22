import { CTASection } from "@/components/cta-section";
import { ContactForm } from "@/components/contact-form";
import { FAQList } from "@/components/faq-list";
import { PageHero } from "@/components/page-hero";
import { PlatformSnapshot } from "@/components/platform-snapshot";
import { RelatedSolutions } from "@/components/related-solutions";
import { SectionHeading } from "@/components/section-heading";
import { contactFaqs, demoExpectations, getSeoClusterLinks } from "@/lib/content";
import { siteConfig } from "@/lib/site";

const solutionLinks = getSeoClusterLinks([
  "employeeManagement",
  "attendanceManagement",
  "leaveManagement",
  "payrollManagement"
]);

type DemoPageScreenProps = {
  mode: "contact" | "demo";
};

function DemoAside() {
  return (
    <div className="surface rounded-[2rem] p-6">
      <p className="eyebrow">Alternate contact</p>
      <div className="mt-5 space-y-4">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Founder inbox
          </p>
          <a
            className="mt-3 block text-lg font-semibold text-slate-950 underline"
            href={`mailto:${siteConfig.founder.email}`}
          >
            {siteConfig.founder.email}
          </a>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Reach {siteConfig.founder.name} directly for demo requests, buying questions, and rollout
            planning conversations.
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            What to expect
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Expect a practical 30 to 45 minute conversation focused on your structure, workflows,
            approval paths, and the systems you want to replace.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DemoPageScreen({ mode }: DemoPageScreenProps) {
  const isDemo = mode === "demo";

  return (
    <>
      <PageHero
        eyebrow={isDemo ? "Book demo" : "Contact"}
        title={
          isDemo ? (
            <>
              See how EMP fits your{" "}
              <span className="font-display italic font-normal text-teal-800">
                workforce structure
              </span>{" "}
              before rollout starts.
            </>
          ) : (
            <>
              Talk through your workforce workflows with the team building{" "}
              <span className="font-display italic font-normal text-teal-800">EMP</span>.
            </>
          )
        }
        description={
          isDemo
            ? "Use a guided demo to review employee records, reporting lines, approvals, attendance exceptions, leave workflows, payroll visibility, and the rollout shape that makes sense for your organization."
            : "If you are replacing spreadsheets, disconnected HR tools, or improvised manager processes, this is the fastest way to see how EMP fits your operating model."
        }
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: isDemo ? "Book demo" : "Contact" }
        ]}
        actions={[
          { href: "#request-demo", label: isDemo ? "Request demo" : "Contact us" },
          { href: "/security", label: "Review security" }
        ]}
        aside={<DemoAside />}
      />

      <section className="section pt-4">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
            <ContactForm />

            <div className="space-y-5">
              <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                <p className="eyebrow">Demo expectations</p>
                <div className="mt-5 grid gap-4">
                  {demoExpectations.map((item) => (
                    <div key={item.title} className="rounded-[1.5rem] bg-slate-50 p-5">
                      <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
                <h2 className="text-2xl font-semibold tracking-tight">What happens next?</h2>
                <div className="mt-5 grid gap-3">
                  {[
                    "We review your current structure and highest-friction workflows.",
                    "We tailor the walkthrough around your teams, approvals, and operating model.",
                    "We discuss rollout scope, security expectations, and commercial fit."
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
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="eyebrow">{isDemo ? "Before the walkthrough" : "Before you reach out"}</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Make the first conversation feel informed before it starts.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                {isDemo
                  ? "A good demo should start with your org structure, approval model, and the workflows creating the most friction today. That gives the conversation enough context to feel useful immediately."
                  : "Buyers often arrive here after researching attendance, leave, payroll, security, or product fit. This page should make it easy to move from early research into a real working conversation about structure, approvals, and rollout."}
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Security review stays visible before and after form submission.",
                  "Demo expectations are clear for executives, HR, and operations leads.",
                  "Pricing stays directional while still preparing buyers for rollout discussions."
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
              slotId="contact-demo-overview"
              eyebrow="Demo walkthrough"
              title="Show buyers the product they are about to evaluate"
              description="A guided product view that helps buyers understand what the session will cover before the conversation starts."
              sidebarTitle="Demo agenda"
              sidebarSubtitle="Role-based product walkthrough"
              sidebarItems={[
                "Company structure and reporting lines",
                "Attendance, leave, and approvals",
                "Payroll readiness and exception handling",
                "Security, governance, and rollout fit"
              ]}
              metrics={[
                { label: "Teams reviewed", value: "5+" },
                { label: "Key workflows", value: "6" },
                { label: "Buyer roles", value: "4" }
              ]}
              activityTitle="What the session should cover"
              activityItems={[
                {
                  title: "Current-state review",
                  meta: "Identify where spreadsheets, approvals, and disconnected tools create drag",
                  status: "Discovery"
                },
                {
                  title: "Product fit walkthrough",
                  meta: "Map EMP to real teams, workflows, and governance requirements",
                  status: "Live demo"
                },
                {
                  title: "Rollout discussion",
                  meta: "Talk through deployment complexity and pricing approach at the right level",
                  status: "Next step"
                }
              ]}
              footerNote="A guided walkthrough should connect your org structure, approvals, and rollout questions to the product."
            />
          </div>
        </div>
      </section>

      <RelatedSolutions
        eyebrow="Coming from a solution page?"
        title="Move from research into a tailored product conversation."
        description="If a buyer arrived through attendance, leave, payroll, or employee management research, these links keep the journey coherent and conversion-focused."
        links={solutionLinks}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Why teams reach out"
            title="A few final reasons to feel comfortable before the first call."
            description="Keep the page grounded in product depth, security review, and rollout realism before the first conversation begins."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {[
              {
                title: "Conversation built around your workflows",
                body: "The walkthrough focuses on the approvals, records, reporting lines, and operating issues that matter most to your business."
              },
              {
                title: "Security review stays visible",
                body: "Buyers can review permissions, governance, and trust details before or after the first call."
              },
              {
                title: "Pricing stays practical",
                body: "We keep pricing directional and rollout-aware so the conversation stays practical for growing teams and larger buyers."
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

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="FAQ"
            title="A few final questions before you reach out."
            description="These answers help buyers understand what to expect before they start a conversation with the EMP team."
          />
          <div className="mt-10">
            <FAQList items={contactFaqs} />
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Prefer a guided walkthrough"
        title="Use the demo to evaluate structure, approvals, workflows, and rollout fit in one conversation."
        description="That makes it easier to judge whether EMP is the right fit for your organization."
        primary={{ href: "#request-demo", label: "Request demo" }}
        secondary={{ href: "/product", label: "Review product" }}
      />
    </>
  );
}
