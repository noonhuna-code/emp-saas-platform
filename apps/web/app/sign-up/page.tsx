import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata: Metadata = {
  ...buildMetadata({
  title: "Sign Up",
  description:
    "Request EMP workspace access for guided onboarding and account setup.",
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
            Request access through a guided{" "}
            <span className="font-display italic font-normal text-teal-800">workspace signup</span>.
          </>
        }
        description="Use this page for account requests, invite-based onboarding, or guided workspace setup."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Sign up" }
        ]}
        aside={<AuthForm mode="sign-up" />}
      />

      <AuthShell
        mode="sign-up"
        eyebrow="Account creation"
        title={
          <>
            Start account setup with a guided{" "}
            <span className="font-display italic font-normal text-teal-800">workspace request</span>.
          </>
        }
        description="EMP signup works for invites, workspace requests, and guided onboarding for new teams."
        bullets={[
          "Useful for invite-led or assisted onboarding",
          "Fits guided workspace setup for new teams",
          "Keeps setup aligned with the EMP product experience"
        ]}
        showForm={false}
      />
    </>
  );
}
