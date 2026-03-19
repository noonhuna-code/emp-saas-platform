import Link from "next/link";
import { CTASection } from "@/components/cta-section";
import { FAQList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { RelatedSolutions } from "@/components/related-solutions";
import { SectionHeading } from "@/components/section-heading";
import { getSeoClusterLinks, type SeoClusterPage } from "@/lib/content";
import { breadcrumbSchema, faqSchema, softwareApplicationSchema } from "@/lib/schema";

type SolutionPageProps = {
  page: SeoClusterPage;
};

function CategoryFitAside({ items }: { items: ReadonlyArray<string> }) {
  return (
    <div className="surface rounded-[2rem] p-6">
      <p className="eyebrow">Category fit</p>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
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

export function SolutionPage({ page }: SolutionPageProps) {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(page.softwareName, page.softwareDescription, page.path),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: page.shortTitle, path: page.path }
          ]),
          faqSchema(page.faqs)
        ]}
      />

      <PageHero
        eyebrow={page.eyebrow}
        title={
          <>
            {page.heroTitleStart}{" "}
            <span className="font-display italic font-normal text-teal-800">
              {page.heroTitleAccent}
            </span>
            {page.heroTitleEnd}
          </>
        }
        description={page.heroDescription}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: page.shortTitle }
        ]}
        actions={[
          { href: "/contact", label: "Book Demo" },
          { href: "/employee-management-software", label: "See full platform" }
        ]}
        aside={<CategoryFitAside items={page.categoryFit} />}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="Why buyers evaluate EMP"
            title={`A stronger option for teams comparing ${page.shortTitle.toLowerCase()}.`}
            description="EMP works best for organizations that want category-specific depth without giving up the advantages of a connected Workforce OS."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {page.signals.map((item) => (
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
              What teams improve with EMP
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {page.outcomes.map((item) => (
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
            eyebrow="Connected platform value"
            title={`Why ${page.shortTitle.toLowerCase()} is stronger inside a connected Workforce OS.`}
            description="These linked capabilities help buyers understand that EMP is not a point solution. It is a broader operating platform with category-level depth."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {page.capabilities.map((item) => (
              <article key={item.title} className="surface rounded-[1.75rem] p-6">
                <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-4 text-base leading-7 text-slate-600">{item.body}</p>
                <Link
                  className="mt-6 inline-flex text-sm font-semibold text-slate-950 underline"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RelatedSolutions
        eyebrow="Related solutions"
        title="Explore the surrounding EMP solution cluster."
        description="Each page below is designed to capture a different high-intent query while reinforcing the broader employee management story."
        links={getSeoClusterLinks(page.relatedKeys)}
      />

      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow="FAQ"
            title={`Questions buyers ask about ${page.shortTitle.toLowerCase()}.`}
            description="These answers are designed to help search visitors understand where EMP fits and how the capability connects to the wider platform."
          />
          <div className="mt-10">
            <FAQList items={page.faqs} />
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
