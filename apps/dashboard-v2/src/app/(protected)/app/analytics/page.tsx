import dynamic from "next/dynamic";
import { getServerSession } from "@/lib/server/auth";
import { LoadingState } from "@/components/states/LoadingState";

const AnalyticsPageClient = dynamic(() => import("./AnalyticsPageClient"), {
  loading: () => <LoadingState label="Loading analytics workspace..." />,
});

export default async function AnalyticsPage() {
  const session = await getServerSession();

  return (
    <AnalyticsPageClient
      role={session.role}
      permissions={session.permissions}
      hasEmployeeContext={Boolean(session.employeeId)}
    />
  );
}
