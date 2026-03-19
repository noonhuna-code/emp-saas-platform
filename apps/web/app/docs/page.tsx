import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { SectionHeading } from "@/components/section-heading";
import { docsCategories, docsStartingPaths, implementationJourney, supportCards } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata = buildMetadata({
  title: "Docs and Help",
  description:
    "Explore EMP help content for getting started, attendance, leave, payroll support, org setup, approvals, admin settings, and implementation guidance.",
  path: "/docs",
  keywords: [
    "help center",
    "employee management documentation",
    "attendance docs",
    "org setup guide",
    "implementation guide"
  ]
});

function DocsAside() {
  return (
    <div className="surface rounded-[2rem] p-6">
      <p className="eyebrow">Help center readiness</p>
      <div className="mt-5 grid gap-3">
        {[
          "7 documentation categories",
          "Implementation journey",
          "Support model",
          "Admin guidance"
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

export default function DocsPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Docs and Help",
            "Help center and implementation readiness for workforce operations, approvals, structure, and administration.",
            "/docs"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Docs and Help", path: "/docs" }
          ])
        ]}
      />

      <PageHero
        eyebrow="Docs / Help"
        title={
          <>
            Product education designed for rollout, adoption, and daily{" "}
            <span className="font-display italic font-normal text-teal-800">
              operational confidence
            </span>
            .
          </>
        }
        description="EMP's help center story is built around the workflows teams actually need to stand up, govern, and run the platform well."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Docs / Help" }
        ]}
        actions={[
          { href: "/contact", label: "Book Demo" },
          { href: "/product", label: "View Product" }
        ]}
        aside={<DocsAside />}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Documentation categories"
            title="A help center built around setup, operations, and control."
            description="This page positions EMP as implementation-ready, even before a full documentation system is wired into your main product stack."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {docsCategories.map((category) => (
              <article key={category.title} className="surface rounded-[1.75rem] p-6">
                <h2 className="text-xl font-semibold text-slate-950">{category.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{category.summary}</p>
                <ul className="mt-5 grid gap-2">
                  {category.articles.map((article) => (
                    <li key={article} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {article}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <SectionHeading
            eyebrow="Start by role"
            title="A clearer help-center path for different teams."
            description="This makes the docs page feel more operationally useful and less like a generic category index."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {docsStartingPaths.map((path) => (
              <article
                key={path.title}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <h2 className="text-xl font-semibold text-slate-950">{path.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{path.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="max-w-xl">
              <p className="eyebrow">Implementation journey</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                A practical path from discovery to rollout.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                The strongest documentation systems guide teams through both first-time setup and
                long-term adoption. EMP&apos;s help narrative is designed for that journey.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {implementationJourney.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-4 text-xl font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Support model"
            title="Support content that helps admins, managers, and operations owners move faster."
            description="A premium product experience needs a strong support layer, not just a marketing promise."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {supportCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
              >
                <h2 className="text-xl font-semibold text-slate-950">{card.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{card.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-[1.75rem] border border-slate-200/80 bg-slate-950 px-6 py-5 text-white">
            <p className="text-base leading-8 text-slate-300">
              Need to talk through rollout details instead of reading first?{" "}
              <Link className="font-semibold text-white underline" href="/contact">
                Book a guided demo
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Ready to evaluate fit"
        title="Use documentation, rollout guidance, and a live demo together."
        description="That combination gives buyers confidence that EMP is serious about implementation, not just feature claims."
        primary={{ href: "/contact", label: "Book Demo" }}
        secondary={{ href: "/security", label: "Review security" }}
      />
    </>
  );
}
