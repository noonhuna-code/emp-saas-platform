import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { resolveDashboardPersona, type DashboardPersona } from "@/lib/dashboard/capabilities";

const ROLE_ROUTE_MAP: Record<string, DashboardPersona> = {
  employee: "employee",
  finance: "finance",
  "team-lead": "team_lead",
  manager: "manager",
  hr: "hr",
  admin: "admin",
  founder: "founder",
  it: "it",
  "platform-owner": "platform_owner"
};

export default async function DashboardRoleAliasPage({
  params
}: {
  params: Promise<{ role: string }>;
}) {
  const session = await getServerSession();
  if (!session.accessToken) {
    redirect("/login");
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
