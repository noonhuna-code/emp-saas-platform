import { getServerSession } from "@/lib/server/auth";
import { buildServiceContext } from "@/lib/server/service-context";
import { getBillingNavigationContext } from "@emp/services/billing.service";
import { DashboardPageClient } from "./DashboardPageClient";

export default async function DashboardPage() {
  const session = await getServerSession();
  let entitlements: Record<string, unknown> | null = null;

  try {
    const ctx = await buildServiceContext();
    const billingContextResult = await getBillingNavigationContext(ctx);
    if (billingContextResult.ok && billingContextResult.data) {
      entitlements = billingContextResult.data.entitlements;
    }
  } catch {
    entitlements = null;
  }

  return (
    <DashboardPageClient
      role={session.role}
      permissions={session.permissions}
      hasEmployeeContext={Boolean(session.employeeId)}
      entitlements={entitlements}
    />
  );
}
