import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { SectionHeading } from "@/components/section-heading";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Review how EMP describes website privacy, contact-form data handling, and responsible communication practices.",
  path: "/privacy-policy",
  keywords: ["privacy policy", "workforce data privacy", "employee software privacy"]
});

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy-policy" }
        ])}
      />

      <PageHero
        eyebrow="Privacy policy"
        title="Privacy information for the EMP website and demo flow."
        description="This page explains how EMP describes website data, demo requests, and privacy-minded communication."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Privacy Policy" }
        ]}
        actions={[{ href: "/contact", label: "Contact team" }]}
      />

      <section className="section pt-0">
        <div className="container">
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                title: "Website usage data",
                body: "EMP may collect basic site analytics, referral information, and form-submission details to understand traffic quality and improve the public site."
              },
              {
                title: "Demo request data",
                body: "Information submitted through the contact flow is intended for sales follow-up, product evaluation, rollout planning, and support handoff."
              },
              {
                title: "Privacy-minded handling",
                body: "The site is positioned to treat workforce-related information responsibly and to avoid unnecessary exposure of sensitive operational details."
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
            eyebrow="Questions about privacy"
            title="For privacy questions, please contact the EMP team directly."
            description="If you need clarification on website data, contact requests, or communication preferences, the team can provide the most current information."
          />
        </div>
      </section>
    </>
  );
}
