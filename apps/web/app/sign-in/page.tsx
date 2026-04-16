import { JsonLd } from "@/components/json-ld";
import { AuthShell } from "@/components/auth-shell";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/schema";
import { buildDashboardAuthActionUrl, buildSiteUrl } from "@/lib/site";

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
  searchParams?: Promise<{ next?: string; error?: string; reason?: string }>;
};

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  PROVISIONING_INCOMPLETE: "Your account setup is not complete yet. Contact your administrator.",
  ROLE_MISSING: "No role assignment was found for this account. Contact your administrator.",
  INTERNAL_ERROR: "Unable to sign in right now. Please try again.",
  RATE_LIMITED: "Too many sign-in attempts. Please try again shortly."
};

const LOGIN_NOTICE_MESSAGES: Record<string, string> = {
  signed_out: "You have been signed out successfully.",
  session_expired: "Your session expired or became invalid. Please sign in again."
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/app/dashboard";
  const errorMessage = params.error ? (LOGIN_ERROR_MESSAGES[params.error] ?? LOGIN_ERROR_MESSAGES.INTERNAL_ERROR) : null;
  const noticeMessage = params.reason ? (LOGIN_NOTICE_MESSAGES[params.reason] ?? null) : null;

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
        formAction={buildDashboardAuthActionUrl("/api/auth/login")}
        nextPath={nextPath}
        returnTo={buildSiteUrl("/sign-in")}
        initialError={errorMessage}
        initialNotice={noticeMessage}
        eyebrow="Workspace access"
        title={
          <>
            Sign in to your EMP{" "}
            <span className="font-display italic font-normal text-teal-800">workforce workspace</span>.
          </>
        }
        description="Use your work credentials to continue into the protected EMP dashboard for operations, approvals, attendance, payroll visibility, and monitoring."
        bullets={[
          "Direct access to the live protected dashboard",
          "Role-aware routing after authentication",
          "Works across desktop and mobile devices"
        ]}
      />
    </>
  );
}
