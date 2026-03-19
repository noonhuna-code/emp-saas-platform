import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { AuthShell } from "@/components/auth-shell";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata: Metadata = {
  ...buildMetadata({
  title: "Sign Up",
  description:
    "Create EMP workspace access with a polished signup experience for guided onboarding and account requests.",
  path: "/sign-up",
  keywords: ["sign up", "create account", "workspace onboarding", "enterprise signup ui"]
  }),
  robots: {
    index: false,
    follow: false
  }
};

export default function SignUpPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Sign Up",
            "Sign-up entry point for EMP workspace creation and onboarding.",
            "/sign-up"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Sign Up", path: "/sign-up" }
          ])
        ]}
      />

      <PageHero
        eyebrow="Sign up"
        title={
          <>
            Create access with a premium, guided{" "}
            <span className="font-display italic font-normal text-teal-800">signup flow</span>.
          </>
        }
        description="Use this page for account requests, invite-based onboarding, or sales-assisted workspace setup."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Sign up" }
        ]}
      />

      <AuthShell
        mode="sign-up"
        eyebrow="Account creation"
        title={
          <>
            Start account setup with a polished{" "}
            <span className="font-display italic font-normal text-teal-800">workspace request</span>.
          </>
        }
        description="The signup UI works well for invite flows, workspace requests, or guided onboarding while the full access model is finalized."
        bullets={[
          "Strong first impression for public traffic",
          "Reusable for invite-based or sales-assisted onboarding",
          "Suitable for guided workspace setup"
        ]}
      />
    </>
  );
}
