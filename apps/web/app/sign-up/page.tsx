import { JsonLd } from "@/components/json-ld";
import { AuthShell } from "@/components/auth-shell";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata: Metadata = {
  ...buildMetadata({
  title: "Request Access",
  description:
    "Request EMP workspace access for guided onboarding and account setup.",
  path: "/sign-up",
  keywords: ["request access", "workspace onboarding", "guided onboarding", "enterprise signup ui"]
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
            "EMP Request Access",
            "Request-access entry point for EMP workspace onboarding.",
            "/sign-up"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Request Access", path: "/sign-up" }
          ])
        ]}
      />

      <AuthShell
        mode="sign-up"
        eyebrow="Guided account setup"
        title={
          <>
            Start EMP access with a guided{" "}
            <span className="font-display italic font-normal text-teal-800">workspace request</span>.
          </>
        }
        description="Use this page for invite-based onboarding, workspace requests, and guided rollout setup for new teams."
        bullets={[
          "Useful for invite-led or assisted onboarding",
          "Fits guided workspace setup for new teams",
          "Keeps account creation aligned with the real product experience"
        ]}
      />
    </>
  );
}
