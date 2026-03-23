import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
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

      <PageHero
        eyebrow="Sign in"
        title={
          <>
            Sign in to the{" "}
            <span className="font-display italic font-normal text-teal-800">EMP workspace</span>.
          </>
        }
        description="Use your work account to access EMP for employee operations, approvals, records, and admin workflows."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Sign in" }
        ]}
        aside={<AuthForm mode="sign-in" actionUrl={buildDashboardAuthActionUrl("/api/auth/login")} nextPath={nextPath} />}
      />

      <AuthShell
        mode="sign-in"
        eyebrow="Workspace access"
        title={
          <>
            Sign in through a secure{" "}
            <span className="font-display italic font-normal text-teal-800">workspace access flow</span>.
          </>
        }
        description="EMP sign-in is designed for employees, managers, HR, and admins working from the same company workspace."
        bullets={[
          "Supports employee, manager, HR, and admin access",
          "Works for managed company workspaces",
          "Keeps entry consistent with the EMP product experience"
        ]}
        formAction={buildDashboardAuthActionUrl("/api/auth/login")}
        nextPath={nextPath}
        showForm={false}
      />
    </>
  );
}
