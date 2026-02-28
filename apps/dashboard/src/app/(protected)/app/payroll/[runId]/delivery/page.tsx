import { getServerSession } from "@/lib/server/auth";
import { PayrollRunDeliveryPageClient } from "./PayrollRunDeliveryPageClient";

export default async function PayrollRunDeliveryPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const session = await getServerSession();
  return <PayrollRunDeliveryPageClient runId={runId} permissions={session.permissions} />;
}

