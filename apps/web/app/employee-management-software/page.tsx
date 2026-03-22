import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { FAQList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { RelatedSolutions } from "@/components/related-solutions";
import { SectionHeading } from "@/components/section-heading";
import {
  employeeManagementFaqs,
  employeeManagementOutcomes,
  employeeManagementSignals,
  getSeoClusterLinks,
  seoClusterPages
} from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, faqSchema, softwareApplicationSchema } from "@/lib/schema";

const page = seoClusterPages.employeeManagement;

export const metadata = buildMetadata({
  title: page.title,
  description: page.metadataDescription,
  path: page.path,
  keywords: page.keywords
});

function CategoryAside() {
  return (
    <div className="surface rounded-[2rem] p-6">
      <p className="eyebrow">Category fit</p>
      <div className="mt-5 grid gap-3">
        {page.categoryFit.map((item) => (
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

export default function EmployeeManagementSoftwarePage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(page.softwareName, page.softwareDescription, page.path),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: page.shortTitle, path: page.path }
          ]),
          faqSchema(employeeManagementFaqs)
        ]}
      />

      <PageHero
        eyebrow="Employee management software"
        title={
          <>
            Employee management software for companies that need{" "}
            <span className="font-display italic font-normal text-teal-800">
              operational structure
            </span>
            , not just records.
          </>
        }
        description="EMP gives growing organizations a more complete system for employee records, attendance, leave, approvals, collaboration, and leadership visibility than a generic admin tool can offer."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Employee Management Software" }
        ]}
        actions={[
          { href: "/demo", label: "Book Demo" },
          { href: "/pricing", label: "Review pricing approach" }
        ]}
        aside={<CategoryAside />}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Why teams switch"
            title="A better answer for organizations outgrowing generic employee management tools."
            description="Most companies do not just need a place to store employee details. They need a connected system for daily workforce operations, approvals, structure, and accountability."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {employeeManagementSignals.map((item) => (
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

      <section className="section pt-0">
        <div className="container">
          <div className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-8 text-white shadow-[0_28px_100px_rgba(15,23,42,0.18)]">
            <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">
              What EMP helps improve
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {employeeManagementOutcomes.map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <p className="text-sm leading-7 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Solution pages"
            title="Category-specific pages tied to the same EMP operating model."
            description="These pages deepen the story around high-intent buyer categories while reinforcing the broader employee management platform narrative."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {page.capabilities.map((item) => (
              <article key={item.title} className="surface rounded-[1.75rem] p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Linked capability
                </p>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.body}</p>
                <Link
                  className="mt-6 inline-flex text-sm font-semibold text-slate-950 underline"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link className="text-sm font-semibold text-slate-950 underline" href="/modules">
              Explore all modules
            </Link>
            <Link className="text-sm font-semibold text-slate-950 underline" href="/product">
              Review product architecture
            </Link>
          </div>
        </div>
      </section>

      <RelatedSolutions
        eyebrow="Related solutions"
        title="Use the cluster to move from broad category research into deeper workforce use cases."
        description="Each page below targets a specific buyer problem while staying tightly linked to this broader employee management pillar."
        links={getSeoClusterLinks(page.relatedKeys)}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions buyers often ask while comparing employee management software."
            description="This page is designed to work both as a search landing page and as a credible evaluation resource."
          />
          <div className="mt-10">
            <FAQList items={employeeManagementFaqs} />
          </div>
        </div>
      </section>

      <CTASection
        eyebrow={page.cta.eyebrow}
        title={page.cta.title}
        description={page.cta.description}
        primary={page.cta.primary}
        secondary={page.cta.secondary}
      />
    </>
  );
}
