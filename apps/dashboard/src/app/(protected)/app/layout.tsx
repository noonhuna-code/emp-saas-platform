import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { getServerSession } from "@/lib/server/auth";
import { buildServiceContext } from "@/lib/server/service-context";
import { getBillingNavigationContext } from "@emp/services/billing.service";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  if (!session.accessToken) {
    redirect("/login");
  }

  let billingContext: Awaited<ReturnType<typeof getBillingNavigationContext>>["data"] | null = null;
  try {
    const ctx = await buildServiceContext();
    const billingContextResult = await getBillingNavigationContext(ctx);
    if (billingContextResult.ok && billingContextResult.data) {
      billingContext = billingContextResult.data;
    }
  } catch {
    billingContext = null;
  }

  return (
    <AppShell
      session={{
        userId: session.userId,
        companyId: session.companyId,
        role: session.role,
        permissions: session.permissions,
        email: session.email
      }}
      billingContext={billingContext}
    >
      {children}
    </AppShell>
  );
}
