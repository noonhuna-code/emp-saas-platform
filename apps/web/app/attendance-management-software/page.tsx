import { SolutionPage } from "@/components/solution-page";
import { seoClusterPages } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const page = seoClusterPages.attendanceManagement;

export const metadata = buildMetadata({
  title: page.title,
  description: page.metadataDescription,
  path: page.path,
  keywords: page.keywords
});

export default function AttendanceManagementSoftwarePage() {
  return <SolutionPage page={page} />;
}
