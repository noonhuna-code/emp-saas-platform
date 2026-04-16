import { buildAuthContext, getServerSession } from "@/lib/server/auth";
import { Avatar } from "@/components/shared/Avatar";
import { PasswordChangeCard } from "@/components/settings/PasswordChangeCard";
import { AccountSettingsCard } from "@/components/settings/AccountSettingsCard";
import { SessionVisibilityCard } from "@/components/settings/SessionVisibilityCard";
import { NotificationRoutingCard } from "@/components/settings/NotificationRoutingCard";
import {
  DashboardRail,
  FeatureCallout,
  OverviewChips,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
  WorkspaceModuleGrid,
} from "@/components/dashboard-v2/PagePrimitives";
import { getSettingsWorkspaceSnapshot } from "@emp/services/settings.service";

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

const formatDateTime = (value: string | null) => {
  if (!value) return "No active session timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default async function SettingsPage() {
  const session = await getServerSession();
  const auth = await buildAuthContext();
  const settingsResult = await getSettingsWorkspaceSnapshot({ ...auth, requestId: "settings-page" }, session.sessionId);
  const settings = settingsResult.ok && settingsResult.data
    ? settingsResult.data
    : {
        account: {
          employeeId: session.employeeId,
          fullName: session.fullName,
          avatarUrl: session.avatarUrl,
          officialEmail: session.email,
          personalEmail: null,
          phoneNumber: null,
          alternatePhone: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          emergencyContactRelationship: null,
        },
        sessions: [],
        devices: [],
        notifications: {
          enabled: false,
          unreadCount: 0,
          recent: [],
          deliveryNote: "Notification routing summary is temporarily unavailable.",
        },
      };
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
      ? { label: "Profile", href: "/app/profile", description: "Personal identity, profile data, documents, and self-service records" }
      : null,
    { label: "Notifications", href: "/app/notifications", description: "Unread alerts, leave updates, approval notifications, and operational reminders" },
    { label: "Notes", href: "/app/notes", description: "Personal notes, attachments, and saved working context" },
    { label: "Resources", href: "/app/resources", description: "Policies, SOPs, and operating guides" },
    session.permissions.includes("manage_employees") || session.permissions.includes("manage_company")
      ? { label: "Organization", href: "/app/organization", description: "Structure, reporting lines, and assignments" }
      : null,
    session.permissions.includes("manage_billing") || session.permissions.includes("view_billing") || session.permissions.includes("manage_company")
      ? { label: "Billing", href: "/app/billing", description: "Seats, invoices, and commercial controls" }
      : null,
    session.permissions.includes("manage_company")
      ? { label: "Monitoring", href: "/app/monitoring", description: "System health and governance signals" }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; description: string }>;

  const accountCards = [
    { label: "Profile workspace", value: session.employeeId ? "Available" : "Unavailable", hint: session.employeeId ? "Personal, employment, documents, and family records" : "No employee record resolved for this session" },
    { label: "Login email", value: session.email ?? "Unknown", hint: "Primary sign-in identity for the active session" },
    { label: "Last login", value: formatDateTime(session.lastLoginAt), hint: "Most recent tracked authenticated session timestamp" },
    { label: "Assigned shift", value: session.shiftStartTime && session.shiftEndTime ? `${session.shiftStartTime} - ${session.shiftEndTime}` : "No shift assigned", hint: session.shiftHours ? `${session.shiftHours} scheduled hours` : "Shift summary from today's resolved session context" },
  ];
  const workspaceModules = controlCards.map((card) => ({
    title: card.label,
    description: card.description,
    href: card.href,
    label: "Workspace",
    highlights: ["Role-aware", "Owned surface", "Fast access"],
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Settings"
        title="Account, security, and workspace settings"
        description="Use settings for the parts that belong here: account edits, password security, session visibility, and live notification posture."
        chips={["Account settings", "Security actions", "Tenant scoped", "Role-aware controls"]}
      />

      <FeatureCallout
        badge="Settings workspace"
        title="Settings should cover identity, access, and account upkeep without duplicating the full product."
        description="EMP now keeps the high-frequency account controls here while leaving deeper profile, notes, resources, billing, and organization workflows in their owning surfaces."
      />

      <StatGrid>
        <StatCard label="Role" value={roleLabel} hint="Current resolved dashboard role" />
        <StatCard label="Permissions" value={session.permissions.length} hint="Capabilities attached to this session" />
        <StatCard label="Employee context" value={session.employeeId ? "Enabled" : "Unavailable"} hint="Whether self-service profile and workspace data are active" />
        <StatCard label="Tenant scope" value={session.companyId ? "Resolved" : "Unknown"} hint="Company resolution status for this session" />
      </StatGrid>

      <SurfacePanel
        title="Workspace modules"
        description="TailAdmin-style links into the product areas that settings coordinates but does not duplicate."
      >
        <WorkspaceModuleGrid modules={workspaceModules} />
      </SurfacePanel>

      <DashboardRail>
        <SurfacePanel title="Session posture" description="High-level identity and access context for the current user." tone="subtle">
          <div className="flex items-center gap-4 rounded-[22px] border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <Avatar name={session.fullName ?? session.email ?? roleLabel} url={session.avatarUrl} />
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold text-slate-950">{session.fullName ?? "Workspace user"}</p>
              <p className="text-sm text-slate-600">{session.email ?? "No email resolved"}</p>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                {session.employeeCode ? `${session.employeeCode} | ` : null}
                {roleLabel}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <OverviewChips chips={chips} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {accountCards.map((card) => (
              <div key={card.label} className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{card.value}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{card.hint}</p>
              </div>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel title="Workspace links" description="Move quickly into the owning surfaces where notes, notifications, billing, and profile records already live.">
          <WorkspaceModuleGrid className="xl:grid-cols-1" modules={workspaceModules} />
        </SurfacePanel>
      </DashboardRail>

      <AccountSettingsCard initial={settings.account} />

      <PasswordChangeCard />

      <SessionVisibilityCard currentSessionId={session.sessionId} sessions={settings.sessions} devices={settings.devices} />

      <NotificationRoutingCard notifications={settings.notifications} />

      <SurfacePanel title="Settings model" description="What lives here versus what stays in the rest of the product.">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-950">Lives in settings</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Account edits, password security, recent sessions, known devices, and notification routing status.</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-950">Lives in profile</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Personal details, employment info, documents, family records, skills, and sensitive data with existing scoped permissions.</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-950">Lives in notifications</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">The inbox and workflow alerts live in the notifications workspace. Settings currently shows routing status, not channel-level saved preferences.</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-950">Lives in workspace lanes</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Notes, resources, billing, monitoring, and organization management stay in the surfaces that already own that data.</p>
          </div>
        </div>
      </SurfacePanel>
    </PageContainer>
  );
}
