import type { DashboardSession } from "@/lib/types/auth";
import type { BillingNavigationContext } from "@/lib/types/billing";
import { PlanRouteGuard } from "@/components/guards/PlanRouteGuard";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

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
    <div className="layout-shell">
      <Sidebar permissions={session.permissions} entitlements={billingContext?.entitlements ?? null} />
      <div className="content-area">
        <Topbar
          role={session.role}
          companyId={session.companyId}
          email={session.email}
          billingContext={billingContext}
        />
        <main>
          <PlanRouteGuard entitlements={billingContext?.entitlements ?? null}>
            {children}
          </PlanRouteGuard>
        </main>
      </div>
    </div>
  );
};
