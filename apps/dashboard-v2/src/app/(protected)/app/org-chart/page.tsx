import { OrganizationChartWorkspaceScreen } from "@/components/organization/OrganizationChartWorkspaceScreen";
import { getServerSession } from "@/lib/server/auth";
import { buildServiceContext } from "@/lib/server/service-context";
import { getOrganizationOverview } from "@emp/services/org-chart.service";

export default async function OrgChartPage() {
  const session = await getServerSession();

  try {
    const ctx = await buildServiceContext();
    const overview = await getOrganizationOverview(ctx);

    return (
      <OrganizationChartWorkspaceScreen
        overview={overview.ok ? overview.data ?? null : null}
        error={overview.ok ? null : overview.error ?? null}
        role={session.role}
        permissions={session.permissions}
      />
    );
  } catch (error) {
    return (
      <OrganizationChartWorkspaceScreen
        overview={null}
        error={error instanceof Error ? error.message : "Unable to load organization map."}
        role={session.role}
        permissions={session.permissions}
      />
    );
  }
}
