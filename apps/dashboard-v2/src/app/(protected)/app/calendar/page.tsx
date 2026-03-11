import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/SkeletonBlocks";

const WorkCalendarPageClient = dynamic(() => import("./WorkCalendarPageClient"), {
  loading: () => <SkeletonCard rows={5} className="w-full" />
});

export default function WorkCalendarPage() {
  return <WorkCalendarPageClient />;
}
