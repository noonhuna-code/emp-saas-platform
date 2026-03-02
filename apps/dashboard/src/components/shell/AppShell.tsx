import type { DashboardSession } from "@/lib/types/auth";
import type { BillingNavigationContext } from "@/lib/types/billing";
import { TenantShellFrame } from "./TenantShellFrame";

export const AppShell = async ({
  session,
  billingContext,
  children
}: {
  session: DashboardSession;
  billingContext: BillingNavigationContext | null;
  children: React.ReactNode;
}) => {
  return (
    <TenantShellFrame session={session} billingContext={billingContext}>
      {children}
    </TenantShellFrame>
  );
};
