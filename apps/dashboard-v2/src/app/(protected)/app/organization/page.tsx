import { OrganizationOverviewScreen } from "@/components/organization/OrganizationOverviewScreen";
import { buildServiceContext } from "@/lib/server/service-context";
import { getOrganizationOverview } from "@emp/services/org-chart.service";

export default async function OrganizationPage() {
  try {
    const ctx = await buildServiceContext();
    const overview = await getOrganizationOverview(ctx);

    if (!overview.ok || !overview.data) {
      return <OrganizationOverviewScreen overview={null} error={overview.error ?? "Unable to load organization overview."} />;
    }

    return <OrganizationOverviewScreen overview={overview.data} />;
  } catch (error) {
    return (
      <OrganizationOverviewScreen
        overview={null}
        error={error instanceof Error ? error.message : "Unable to load organization overview."}
      />
    );
  }
}
