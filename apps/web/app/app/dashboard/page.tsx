import { redirect } from "next/navigation";

export default function DashboardAliasPage() {
  redirect("/sign-in?next=%2Fapp%2Fdashboard");
}
