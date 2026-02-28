import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { ReliabilityPageClient } from "./ReliabilityPageClient";

export default async function ReliabilityPage() {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_employees")) {
    redirect("/403");
  }

  return <ReliabilityPageClient />;
}
