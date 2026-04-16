import DocumentViewerPageClient from "./DocumentViewerPageClient";

export default async function DocumentViewerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

  return (
    <DocumentViewerPageClient
      employeeId={pick(params.employeeId)}
      documentId={pick(params.documentId)}
      initialVersionId={pick(params.versionId)}
      initialFileName={pick(params.fileName)}
      initialMimeType={pick(params.mimeType)}
      title={pick(params.title)}
      source={pick(params.source)}
    />
  );
}
