import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { AuthShell } from "@/components/auth-shell";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";

export const metadata: Metadata = {
  ...buildMetadata({
  title: "Sign In",
  description:
    "Access the EMP workspace through a polished sign-in experience for employees, managers, and administrators.",
  path: "/sign-in",
  keywords: ["sign in", "workspace access", "employee portal login", "enterprise auth ui"]
  }),
  robots: {
    index: false,
    follow: false
  }
};

export default function SignInPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(
            "EMP Sign In",
            "Sign-in entry point for EMP workspace access.",
            "/sign-in"
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Sign In", path: "/sign-in" }
          ])
        ]}
      />

      <PageHero
        eyebrow="Sign in"
        title={
          <>
            A polished entry point into the{" "}
            <span className="font-display italic font-normal text-teal-800">EMP workspace</span>.
          </>
        }
        description="Use this page for employee, manager, HR, or admin access to the EMP workspace."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Sign in" }
        ]}
      />

      <AuthShell
        mode="sign-in"
        eyebrow="Workspace access"
        title={
          <>
            Sign in through a polished{" "}
            <span className="font-display italic font-normal text-teal-800">workspace access flow</span>.
          </>
        }
        description="The UI supports employee access, admin entry, and invite-based workspace login in one consistent experience."
        bullets={[
          "Suitable for employee and admin access",
          "Consistent with the public product experience",
          "Ready for invite-based or managed workspace login"
        ]}
      />
    </>
  );
}
