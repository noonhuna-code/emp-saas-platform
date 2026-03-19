import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { SectionHeading } from "@/components/section-heading";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "Review EMP terms for website usage, demo requests, and future commercial engagement.",
  path: "/terms-of-service",
  keywords: ["terms of service", "website terms", "software evaluation terms"]
});

export default function TermsOfServicePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Terms of Service", path: "/terms-of-service" }
        ])}
      />

      <PageHero
        eyebrow="Terms of service"
        title="Terms for website usage and commercial engagement."
        description="This page outlines terms for website usage, demo engagement, and future commercial discussions."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Terms of Service" }
        ]}
        actions={[{ href: "/contact", label: "Contact team" }]}
      />

      <section className="section pt-0">
        <div className="container">
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                title: "Website usage",
                body: "The public site is intended for product education, evaluation, and lead capture. Access and use remain subject to future published commercial terms."
              },
              {
                title: "Demo engagement",
                body: "Demo requests and early buying conversations are informational and do not create a billing, checkout, or service obligation through the public website."
              },
              {
                title: "Future agreements",
                body: "Any production deployment, implementation scope, support commitments, or commercial terms are expected to be governed by separate written agreements."
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
            eyebrow="Commercial engagement"
            title="Production use and paid services are governed separately."
            description="Any implementation scope, deployment details, support commitments, or commercial terms are expected to be defined in separate written agreements."
          />
        </div>
      </section>
    </>
  );
}
