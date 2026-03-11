import { getServerSession } from "@/lib/server/auth";
import { PayrollRunDetailPageClient } from "./PayrollRunDetailPageClient";

export default async function PayrollRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const session = await getServerSession();
  return <PayrollRunDetailPageClient runId={runId} permissions={session.permissions} />;
}
