import { redirect } from "next/navigation";
import { buildDashboardUrl } from "@/lib/site";

export default function AppAliasPage() {
  redirect(buildDashboardUrl("/app/dashboard"));
}
