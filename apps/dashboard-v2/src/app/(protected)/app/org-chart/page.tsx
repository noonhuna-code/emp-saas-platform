import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { OrgChartView } from "@/components/org-chart/OrgChartView";

export default async function OrgChartPage() {
  const session = await getServerSession();
  if (!session.permissions.includes("manage_employees")) {
    redirect("/403");
  }

  return (
    <div className="page-wrap stack">
      <OrgChartView />
    </div>
  );
}
