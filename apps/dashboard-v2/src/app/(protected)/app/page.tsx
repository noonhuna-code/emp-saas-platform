import { redirect } from "next/navigation";

export default function ProtectedRootRedirect() {
  redirect("/app/dashboard");
}
