import { getServerSession } from "@/lib/server/auth";
import { PayslipDetailPageClient } from "./PayslipDetailPageClient";

export default async function PayslipDetailPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const session = await getServerSession();
  return <PayslipDetailPageClient entryId={entryId} permissions={session.permissions} />;
}
