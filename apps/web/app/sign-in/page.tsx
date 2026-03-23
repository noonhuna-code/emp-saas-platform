import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { buildDashboardLoginUrl } from "@/lib/site";

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
  redirect(buildDashboardLoginUrl(params.next));
}
