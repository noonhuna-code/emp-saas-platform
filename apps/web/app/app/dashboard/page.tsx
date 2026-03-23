import { redirect } from "next/navigation";
import { buildDashboardUrl } from "@/lib/site";

export default function DashboardAliasPage() {
  redirect(buildDashboardUrl("/app/dashboard"));
}
