import { DemoPageScreen } from "@/components/demo-page-screen";
import { JsonLd } from "@/components/json-ld";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, faqSchema, softwareApplicationSchema } from "@/lib/schema";
import { contactFaqs } from "@/lib/content";

export const metadata = buildMetadata({
  title: "Book Demo",
  description:
    "Book an EMP demo and review how employee records, approvals, attendance, leave, payroll visibility, and rollout planning fit your organization.",
  path: "/demo",
  keywords: [
    "book workforce software demo",
    "employee management demo",
    "workforce operations demo",
    "request emp demo"
  ]
});

export default function DemoPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Demo",
            "Demo request page for guided EMP evaluations and rollout-fit conversations.",
            "/demo"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Book Demo", path: "/demo" }
          ]),
          faqSchema(contactFaqs)
        ]}
      />
      <DemoPageScreen mode="demo" />
    </>
  );
}
