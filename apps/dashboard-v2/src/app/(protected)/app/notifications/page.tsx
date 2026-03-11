import dynamic from "next/dynamic";
import { SkeletonList } from "@/components/ui/SkeletonBlocks";

const NotificationsPageClient = dynamic(() => import("./NotificationsPageClient"), {
  loading: () => <SkeletonList rows={8} className="w-full" />
});

export default function NotificationsPage() {
  return <NotificationsPageClient />;
}
