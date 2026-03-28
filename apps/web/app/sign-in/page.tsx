import { JsonLd } from "@/components/json-ld";
import { AuthShell } from "@/components/auth-shell";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";
import { buildDashboardAuthActionUrl } from "@/lib/site";

export const metadata: Metadata = {
  ...buildMetadata({
  title: "Sign In",
  description:
    "Access the EMP workspace for employee operations, approvals, and admin workflows.",
  path: "/sign-in",
  keywords: ["sign in", "workspace access", "employee portal login", "enterprise auth ui"]
  }),
  robots: {
    index: false,
    follow: false
  }
};

type SignInPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/app/dashboard";

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

      <AuthShell
        mode="sign-in"
        eyebrow="Secure workspace access"
        title={
          <>
            Sign in to the{" "}
            <span className="font-display italic font-normal text-teal-800">EMP workspace</span>.
          </>
        }
        description="Use your work account to access employee operations, approvals, records, and admin workflows without extra noise around the form."
        bullets={[
          "Employee, manager, HR, finance, and admin access",
          "Uses the same live product shown on the site",
          "Focused on access, not marketing clutter"
        ]}
        formAction={buildDashboardAuthActionUrl("/api/auth/login")}
        nextPath={nextPath}
      />
    </>
  );
}
