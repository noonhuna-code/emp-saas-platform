import { OrganizationWorkspaceScreen } from "@/components/organization/OrganizationWorkspaceScreen";
import { getOrganizationCapabilities } from "@/components/organization/organization-access";
import { buildServiceContext } from "@/lib/server/service-context";
import { getServerSession } from "@/lib/server/auth";
import { getOrganizationAdminData } from "@emp/services/organization-admin.service";
import { getOrganizationOverview } from "@emp/services/org-chart.service";

export default async function OrganizationPage() {
  try {
    const ctx = await buildServiceContext();
    const session = await getServerSession();
    const capabilities = getOrganizationCapabilities(session.role, session.permissions);
    const overview = await getOrganizationOverview(ctx);
    const adminData = capabilities.canViewExplorer ? await getOrganizationAdminData(ctx) : { ok: true as const, data: null, error: null };

    if (!overview.ok || !overview.data || (capabilities.canViewExplorer && (!adminData.ok || !adminData.data))) {
      return (
        <OrganizationWorkspaceScreen
          initialOverview={overview.ok ? overview.data ?? null : null}
          initialAdminData={adminData.ok ? (adminData.data ?? null) : null}
          initialError={overview.error ?? (capabilities.canViewExplorer ? adminData.error ?? null : null) ?? "Unable to load organization workspace."}
          viewerRole={session.role}
          viewerPermissions={session.permissions}
          viewerEmployeeId={session.employeeId}
        />
      );
    }

    return (
      <OrganizationWorkspaceScreen
        initialOverview={overview.data}
        initialAdminData={adminData.data ?? null}
        viewerRole={session.role}
        viewerPermissions={session.permissions}
        viewerEmployeeId={session.employeeId}
      />
    );
  } catch (error) {
    return (
      <OrganizationWorkspaceScreen
        initialOverview={null}
        initialAdminData={null}
        initialError={error instanceof Error ? error.message : "Unable to load organization workspace."}
        viewerRole={null}
        viewerPermissions={[]}
        viewerEmployeeId={null}
      />
    );
  }
}
