import { OrganizationPeopleScreen } from "@/components/organization/OrganizationPeopleScreen";
import { getOrganizationCapabilities } from "@/components/organization/organization-access";
import { getServerSession } from "@/lib/server/auth";
import { buildServiceContext } from "@/lib/server/service-context";
import { getOrganizationAdminData } from "@emp/services/organization-admin.service";
import { getOrganizationOverview } from "@emp/services/org-chart.service";

export default async function PeoplePage() {
  const session = await getServerSession();
  const capabilities = getOrganizationCapabilities(session.role, session.permissions);

  try {
    const ctx = await buildServiceContext();
    const overview = await getOrganizationOverview(ctx);
    const adminData = capabilities.canViewExplorer ? await getOrganizationAdminData(ctx) : { ok: true as const, data: null, error: null };

    return (
      <OrganizationPeopleScreen
        overview={overview.ok ? overview.data ?? null : null}
        adminData={adminData.ok ? adminData.data ?? null : null}
        error={overview.error ?? (capabilities.canViewExplorer ? adminData.error ?? null : null)}
        role={session.role}
        permissions={session.permissions}
        employeeId={session.employeeId}
      />
    );
  } catch (error) {
    return (
      <OrganizationPeopleScreen
        overview={null}
        adminData={null}
        error={error instanceof Error ? error.message : "Unable to load people directory."}
        role={session.role}
        permissions={session.permissions}
        employeeId={session.employeeId}
      />
    );
  }
}
