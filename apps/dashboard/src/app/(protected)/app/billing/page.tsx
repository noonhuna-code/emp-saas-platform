import { getServerSession } from "@/lib/server/auth";
import { BillingPageClient } from "./BillingPageClient";

export default async function BillingPage() {
  const session = await getServerSession();
  return <BillingPageClient permissions={session.permissions} />;
}
