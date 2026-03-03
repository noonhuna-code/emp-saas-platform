import { getServerSession } from "@/lib/server/auth";
import { DashboardPageClient } from "./DashboardPageClient";

export default async function DashboardPage() {
  const session = await getServerSession();

  return (
    <div className="page-wrap stack">
      <DashboardPageClient
        role={session.role}
        permissions={session.permissions}
        hasEmployeeContext={Boolean(session.employeeId)}
      />
    </div>
  );
}
