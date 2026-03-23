import Link from "next/link";
import { getServerSession } from "@/lib/server/auth";
import {
  FeatureCallout,
  OverviewChips,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  manager: "Manager",
  team_lead: "Team Lead",
  hr: "HR",
  admin: "Admin",
  founder: "Founder / Executive",
  it: "IT",
  finance: "Finance",
  platform_owner: "Platform Owner",
};

export default async function SettingsPage() {
  const session = await getServerSession();
  const roleKey = (session.role ?? "employee").toLowerCase();
  const roleLabel = ROLE_LABELS[roleKey] ?? session.role ?? "Workspace user";

  const chips = [
    roleLabel,
    session.employeeId ? "Employee context active" : "No employee context",
    `${session.permissions.length} permissions`,
    session.companyId ? "Tenant-scoped" : "No company resolved",
  ];

  const controlCards = [
    session.employeeId
      ? { label: "Profile", href: "/app/profile", description: "Personal identity, profile, and self-service preferences" }
      : null,
    session.permissions.includes("manage_employees") || session.permissions.includes("manage_company")
      ? { label: "Organization", href: "/app/organization", description: "Structure, reporting lines, and assignments" }
      : null,
    session.permissions.includes("manage_billing") || session.permissions.includes("view_billing") || session.permissions.includes("manage_company")
      ? { label: "Billing", href: "/app/billing", description: "Seats, invoices, and commercial controls" }
      : null,
    session.permissions.includes("manage_company")
      ? { label: "Monitoring", href: "/app/monitoring", description: "System health and governance signals" }
      : null,
    { label: "Notifications", href: "/app/notifications", description: "Unread alerts and operational reminders" },
    { label: "Resources", href: "/app/resources", description: "Policies, SOPs, and operating guides" },
  ].filter(Boolean) as Array<{ label: string; href: string; description: string }>;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Settings"
        title="Workspace controls and configuration lanes"
        description="Use this hub to move into the control surfaces your role is allowed to manage without turning settings into a dead-end page."
        chips={["Role-aware", "Control surfaces", "Tenant scoped", "No dead-end settings"]}
      />

      <FeatureCallout
        badge="Configuration"
        title="Settings should route you into real controls, not trap you in a generic preferences screen."
        description="This workspace reflects the actual role and permission posture already resolved for your session. It stays intentionally focused on where configuration and operational governance really live."
      />

      <StatGrid>
        <StatCard label="Role" value={roleLabel} hint="Current resolved dashboard role" />
        <StatCard label="Permissions" value={session.permissions.length} hint="Capabilities attached to this session" />
        <StatCard label="Employee context" value={session.employeeId ? "Enabled" : "Unavailable"} hint="Whether self-service profile and workspace data are active" />
        <StatCard label="Tenant scope" value={session.companyId ? "Resolved" : "Unknown"} hint="Company resolution status for this session" />
      </StatGrid>

      <SurfacePanel title="Session posture" description="High-level identity and access context for the current user.">
        <OverviewChips chips={chips} />
        <div className="mt-4 text-sm leading-6 text-slate-600">
          Settings in EMP stay distributed across the real product surfaces that own them: profile, organization, billing, monitoring, and workspace-level resources.
        </div>
      </SurfacePanel>

      <SurfacePanel title="Available control surfaces" description="Only routes supported by your current access posture are shown here.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {controlCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[22px] border border-slate-200/80 bg-white/92 p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50/80"
            >
              <p className="text-sm font-semibold text-slate-950">{card.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </Link>
          ))}
        </div>
      </SurfacePanel>
    </PageContainer>
  );
}
