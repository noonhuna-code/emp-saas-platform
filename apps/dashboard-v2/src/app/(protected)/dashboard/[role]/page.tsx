import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { resolveDashboardPersona, type DashboardPersona } from "@/lib/dashboard/capabilities";
import { buildPublicWebsiteUrl } from "@/lib/site";

const ROLE_ROUTE_MAP: Record<string, DashboardPersona> = {
  employee: "employee",
  finance: "finance",
  "team-lead": "manager",
  manager: "manager",
  hr: "admin_ops",
  admin: "admin_ops",
  founder: "executive",
  executive: "executive",
  it: "admin_ops",
  "admin-ops": "admin_ops",
  "platform-owner": "platform_owner"
};

export default async function DashboardRoleAliasPage({
  params
}: {
  params: Promise<{ role: string }>;
}) {
  const session = await getServerSession();
  if (!session.accessToken) {
    redirect(
      process.env.NODE_ENV === "production"
        ? buildPublicWebsiteUrl("/sign-in", { next: "/app/dashboard" })
        : "/login?next=%2Fapp%2Fdashboard"
    );
  }

  const { role } = await params;
  const targetPersona = ROLE_ROUTE_MAP[role] ?? null;
  if (!targetPersona) {
    redirect("/403");
  }

  const persona = resolveDashboardPersona({
    role: session.role,
    permissions: session.permissions
  });

  if (persona !== targetPersona) {
    redirect("/403");
  }

  if (persona === "platform_owner") {
    redirect("/platform");
  }

  redirect("/app/dashboard");
}
