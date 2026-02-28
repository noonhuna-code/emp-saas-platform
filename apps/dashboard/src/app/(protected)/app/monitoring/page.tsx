import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { MonitoringPageClient } from "./MonitoringPageClient";

export default async function MonitoringPage() {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_company")) {
    redirect("/403");
  }

  return <MonitoringPageClient />;
}
