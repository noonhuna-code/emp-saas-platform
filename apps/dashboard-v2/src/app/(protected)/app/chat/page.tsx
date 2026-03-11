import dynamic from "next/dynamic";
import { SkeletonList } from "@/components/ui/SkeletonBlocks";

const ChatPageClient = dynamic(() => import("./ChatPageClient"), {
  loading: () => <SkeletonList rows={8} className="w-full" />
});

export default function ChatPage() {
  return <ChatPageClient />;
}
