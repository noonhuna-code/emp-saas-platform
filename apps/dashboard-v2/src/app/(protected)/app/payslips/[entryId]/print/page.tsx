import { PayslipPrintPageClient } from "./PayslipPrintPageClient";

export default async function PayslipPrintPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  return <PayslipPrintPageClient entryId={entryId} />;
}
