import { redirect } from "next/navigation";
import { buildDashboardLoginUrl } from "@/lib/site";

export default function LoginAliasPage() {
  redirect(buildDashboardLoginUrl());
}
