import Link from "next/link";
import type { SeoClusterLink } from "@/lib/content";
import { SectionHeading } from "@/components/section-heading";

type RelatedSolutionsProps = {
  eyebrow: string;
  title: string;
  description: string;
  links: SeoClusterLink[];
};

export function RelatedSolutions({
  eyebrow,
  title,
  description,
  links
}: RelatedSolutionsProps) {
  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {links.map((link) => (
            <article
              data-analytics-location="related-solutions"
              key={link.href}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
            >
              <h2 className="text-xl font-semibold text-slate-950">{link.title}</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">{link.body}</p>
              <Link
                data-analytics-action="cluster-link"
                className="mt-6 inline-flex text-sm font-semibold text-slate-950 underline"
                href={link.href}
              >
                {link.label}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
