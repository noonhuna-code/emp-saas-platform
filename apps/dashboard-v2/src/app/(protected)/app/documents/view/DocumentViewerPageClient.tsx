"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileSpreadsheet, RefreshCw, Search, TextSelect } from "lucide-react";
import { fetchEmployeeDocumentVersions } from "@/lib/client/api";
import type { EmployeeDocumentVersion } from "@/lib/types/profile";
import { parseReadableDocument, type ReadableDocumentResult } from "@/lib/documents/readable";
import { buildEmployeeDocumentViewerHref, resolveDocumentPreviewKind } from "@/lib/documents/viewer";
import {
  FeatureCallout,
  OverviewChips,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
  WorkspaceModuleGrid,
} from "@/components/dashboard-v2/PagePrimitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { Button } from "@/components/ui/button";

const PdfDocumentPreview = dynamic(
  () => import("./PdfDocumentPreview").then((module) => module.PdfDocumentPreview),
  { ssr: false, loading: () => <div className="py-10 text-sm text-slate-500">Loading PDF viewer...</div> }
);

const formatBytes = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const getSearchHitCount = (source: string, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;
  return source.toLowerCase().split(normalized).length - 1;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const highlightTextHtml = (text: string, query: string) => {
  const normalized = query.trim();
  if (!normalized) {
    return escapeHtml(text).replace(/\n/g, "<br />");
  }

  const escapedQuery = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return escapeHtml(text)
    .replace(regex, "<mark class=\"rounded bg-blue-200/80 px-0.5 text-slate-950\">$1</mark>")
    .replace(/\n/g, "<br />");
};

export default function DocumentViewerPageClient({
  employeeId,
  documentId,
  initialVersionId,
  initialFileName,
  initialMimeType,
  title,
  source,
}: {
  employeeId: string | null;
  documentId: string | null;
  initialVersionId?: string | null;
  initialFileName?: string | null;
  initialMimeType?: string | null;
  title?: string | null;
  source?: string | null;
}) {
  const [versions, setVersions] = useState<EmployeeDocumentVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(initialVersionId ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readerData, setReaderData] = useState<ReadableDocumentResult | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerSearch, setReaderSearch] = useState("");
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!employeeId || !documentId) {
      setLoading(false);
      setError("Missing document parameters.");
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void fetchEmployeeDocumentVersions(employeeId, documentId)
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data?.versions) {
          setVersions([]);
          setError(result.error ?? "Unable to load document versions");
          return;
        }

        const ordered = [...result.data.versions].sort((left, right) => right.version_number - left.version_number);
        setVersions(ordered);
        setSelectedVersionId((current) => current ?? ordered[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setVersions([]);
        setError(err instanceof Error ? err.message : "Unable to load document versions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [documentId, employeeId]);

  const activeVersion = useMemo(
    () => versions.find((entry) => entry.id === selectedVersionId) ?? versions[0] ?? null,
    [selectedVersionId, versions]
  );

  const resolvedFileName = activeVersion?.file_name ?? initialFileName ?? title ?? "Document";
  const resolvedMimeType = activeVersion?.storage_mime_type ?? initialMimeType ?? null;
  const previewKind = resolveDocumentPreviewKind(resolvedMimeType, resolvedFileName);
  const contentSuffix = selectedVersionId ? `?versionId=${encodeURIComponent(selectedVersionId)}` : "";
  const contentUrl = employeeId && documentId
    ? `/api/employees/${employeeId}/documents/${documentId}/content${contentSuffix}`
    : null;
  const downloadUrl = employeeId && documentId
    ? `/api/employees/${employeeId}/documents/${documentId}/content${contentSuffix ? `${contentSuffix}&download=1` : "?download=1"}`
    : null;

  useEffect(() => {
    if (!contentUrl || (previewKind !== "text" && previewKind !== "sheet" && previewKind !== "word")) {
      setReaderData(null);
      setReaderLoading(false);
      setReaderSearch("");
      setActiveSheetIndex(0);
      return;
    }

    let active = true;
    setReaderLoading(true);
    setReaderData(null);
    setReaderSearch("");
    setActiveSheetIndex(0);

    void fetch(contentUrl, { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          throw new Error("Unable to load file contents");
        }

        const buffer = await response.arrayBuffer();
        const parsed = await parseReadableDocument({
          buffer,
          fileName: resolvedFileName,
          mimeType: resolvedMimeType,
        });

        if (!active) return;
        setReaderData(parsed);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setReaderData({
          kind: "text",
          text: err instanceof Error ? err.message : "Unable to load file contents",
          searchText: err instanceof Error ? err.message : "Unable to load file contents",
        });
      })
      .finally(() => {
        if (active) setReaderLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentUrl, previewKind, refreshToken, resolvedFileName, resolvedMimeType]);

  const moduleCards = employeeId && documentId ? [
    {
      title: "Current viewer window",
      description: "Stay in this protected reading window to preview uploaded files without losing the rest of your workspace.",
      href: buildEmployeeDocumentViewerHref({
        employeeId,
        documentId,
        versionId: selectedVersionId,
        fileName: resolvedFileName,
        mimeType: resolvedMimeType,
        title,
        source,
      }),
      label: "Preview",
      metric: previewKind.toUpperCase(),
      highlights: ["Protected", "Inline preview", "Version aware"],
    },
    {
      title: source === "notes" ? "Back to notes" : "Back to profile",
      description: source === "notes"
        ? "Return to the notes workspace after reviewing the current attachment."
        : "Return to the employee profile documents tab after reviewing the current file.",
      href: source === "notes" ? "/app/notes" : "/app/profile",
      label: source === "notes" ? "Notes" : "Profile",
      highlights: source === "notes" ? ["Notes", "Attachments", "Workspace"] : ["Documents", "Profile", "Self service"],
    },
    {
      title: "Dashboard return",
      description: "Jump back to the main role dashboard when you are done reading the current file.",
      href: "/app/dashboard",
      label: "Workspace",
      highlights: ["Role home", "Navigation", "Protected app"],
    },
  ] : [];

  const activeSheet = readerData?.kind === "sheet"
    ? readerData.sheets[activeSheetIndex] ?? readerData.sheets[0] ?? null
    : null;

  const filteredSheetRows = useMemo(() => {
    if (!activeSheet) return [];
    const normalized = readerSearch.trim().toLowerCase();
    if (!normalized) return activeSheet.rows;
    return activeSheet.rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(normalized)));
  }, [activeSheet, readerSearch]);

  const searchHitCount = useMemo(() => {
    if (!readerSearch.trim() || !readerData) return 0;
    if (readerData.kind === "sheet") {
      return filteredSheetRows.length;
    }
    if (readerData.kind === "word") {
      return getSearchHitCount(readerData.text, readerSearch);
    }
    if (readerData.kind === "text") {
      return getSearchHitCount(readerData.text, readerSearch);
    }
    return 0;
  }, [filteredSheetRows.length, readerData, readerSearch]);

  if (!employeeId || !documentId) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Document viewer" title="Document viewer" description="Review supported employee files in a protected inline reader." />
        <ErrorState message="Missing document parameters." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Document viewer"
        title={title ?? resolvedFileName}
        description="Preview PDFs, text documents, spreadsheets, and supported files inside a protected Workforce OS viewer window."
        chips={[
          previewKind === "unsupported" ? "Fallback mode" : `${previewKind.toUpperCase()} preview`,
          source ? `${source} source` : "Profile documents",
          selectedVersionId ? "Version selected" : "Latest version",
        ]}
        actions={(
          <>
            {downloadUrl ? (
              <a className="secondary-btn" href={downloadUrl} target="_blank" rel="noreferrer">
                Download
              </a>
            ) : null}
            {contentUrl ? (
              <a className="secondary-btn" href={contentUrl} target="_blank" rel="noreferrer">
                Open raw file
              </a>
            ) : null}
          </>
        )}
      />

      <FeatureCallout
        badge="Readable files"
        title="Open employee files in a cleaner protected reading window"
        description="This reader now supports PDFs, text files, CSV/XLSX sheets, images, and DOCX content in a more structured workspace view."
      />

      <StatGrid>
        <StatCard label="Preview type" value={previewKind.toUpperCase()} hint={resolvedMimeType ?? "MIME not recorded"} />
        <StatCard label="Version count" value={versions.length} hint="Document history returned by the existing vault contract" />
        <StatCard label="Current size" value={formatBytes(activeVersion?.storage_size)} hint="Size of the selected version" />
        <StatCard label="Uploaded at" value={formatDateTime(activeVersion?.uploaded_at)} hint="Timestamp for the active version" />
      </StatGrid>

      {moduleCards.length > 0 ? (
        <SurfacePanel title="Viewer modules" description="Quick navigation around the protected document reading flow.">
          <WorkspaceModuleGrid modules={moduleCards} />
        </SurfacePanel>
      ) : null}

      {loading ? <LoadingState label="Loading document versions..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.78fr)]">
          <SurfacePanel
            title="Readable preview"
            description="Review the active file in a more professional reading layout, with inline search for supported text-based documents."
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                {(previewKind === "text" || previewKind === "sheet" || previewKind === "word") ? (
                  <div className="flex min-w-[240px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                      value={readerSearch}
                      onChange={(event) => setReaderSearch(event.target.value)}
                      placeholder={previewKind === "sheet" ? "Search sheet rows" : "Search document text"}
                    />
                  </div>
                ) : null}
                <Button type="button" variant="secondary" className="rounded-full" onClick={() => setRefreshToken((value) => value + 1)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh preview
                </Button>
              </div>
            )}
          >
            {readerSearch.trim() ? (
              <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {searchHitCount} match{searchHitCount === 1 ? "" : "es"} in current file
              </div>
            ) : null}

            {!contentUrl ? (
              <EmptyState title="Preview unavailable" subtitle="No document content path is available for this file." compact />
            ) : null}

            {contentUrl && previewKind === "pdf" ? <PdfDocumentPreview fileUrl={contentUrl} fileName={resolvedFileName} /> : null}

            {contentUrl && previewKind === "image" ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="relative mx-auto min-h-[55vh] w-full max-w-5xl">
                  <Image
                    src={contentUrl}
                    alt={resolvedFileName}
                    width={1400}
                    height={1800}
                    unoptimized
                    className="h-auto w-full rounded-2xl object-contain"
                  />
                </div>
              </div>
            ) : null}

            {contentUrl && readerLoading && (previewKind === "text" || previewKind === "sheet" || previewKind === "word") ? (
              <div className="rounded-[28px] border border-slate-200/80 bg-white px-5 py-10 text-sm text-slate-500">
                Loading readable content...
              </div>
            ) : null}

            {contentUrl && !readerLoading && readerData?.kind === "text" ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Text reader
                </div>
                <div
                  className="max-h-[70vh] overflow-auto px-5 py-5 text-sm leading-7 text-slate-700"
                  dangerouslySetInnerHTML={{ __html: highlightTextHtml(readerData.text, readerSearch) }}
                />
              </div>
            ) : null}

            {contentUrl && !readerLoading && readerData?.kind === "word" ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  DOCX reader
                </div>
                <article
                  className="prose prose-slate max-w-none px-6 py-6 text-slate-700"
                  dangerouslySetInnerHTML={{ __html: readerData.html }}
                />
              </div>
            ) : null}

            {contentUrl && !readerLoading && readerData?.kind === "sheet" ? (
              <div className="space-y-4 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {readerData.sheets.map((sheet, index) => (
                    <button
                      key={`${sheet.name}-${index}`}
                      type="button"
                      onClick={() => setActiveSheetIndex(index)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        index === activeSheetIndex
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>

                {activeSheet ? (
                  <div className="overflow-hidden rounded-[24px] border border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      {activeSheet.name}
                    </div>
                    <div className="max-h-[70vh] overflow-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredSheetRows.map((row, rowIndex) => (
                            <tr key={`${activeSheet.name}-${rowIndex}`} className={rowIndex === 0 ? "bg-slate-50/70 font-semibold text-slate-900" : "text-slate-700"}>
                              {row.map((cell, cellIndex) => (
                                <td key={`${rowIndex}-${cellIndex}`} className="max-w-[320px] px-4 py-3 align-top">
                                  <div
                                    className="whitespace-pre-wrap break-words"
                                    dangerouslySetInnerHTML={{ __html: highlightTextHtml(cell, readerSearch) }}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="No sheet rows found" subtitle="This spreadsheet did not return readable row data." compact />
                )}
              </div>
            ) : null}

            {contentUrl && !readerLoading && previewKind === "unsupported" ? (
              <EmptyState
                title="Inline preview is not available for this file type"
                subtitle="Use the raw file or download action for formats that still need native desktop apps."
                compact
              />
            ) : null}
          </SurfacePanel>

          <div className="space-y-6">
            <SurfacePanel title="Version history" description="Switch between uploaded versions without leaving the viewer.">
              {versions.length === 0 ? (
                <EmptyState title="No versions found" subtitle="This document does not have a readable file history yet." compact />
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => {
                    const isActive = version.id === (activeVersion?.id ?? selectedVersionId);
                    return (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => setSelectedVersionId(version.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-blue-200 bg-blue-50/80 shadow-sm"
                            : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              v{version.version_number} - {version.file_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{formatDateTime(version.uploaded_at)}</p>
                          </div>
                          <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                            {formatBytes(version.storage_size)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </SurfacePanel>

            <SurfacePanel title="Active file details" description="Metadata and reader status for the selected version.">
              <OverviewChips chips={[resolvedFileName, resolvedMimeType ?? "MIME unavailable", source ? `${source} source` : "Employee document"]} />
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-900">File:</span> {resolvedFileName}</p>
                <p><span className="font-semibold text-slate-900">MIME:</span> {resolvedMimeType ?? "-"}</p>
                <p><span className="font-semibold text-slate-900">Version:</span> {activeVersion ? `v${activeVersion.version_number}` : "-"}</p>
                <p><span className="font-semibold text-slate-900">Uploaded:</span> {formatDateTime(activeVersion?.uploaded_at)}</p>
                <p><span className="font-semibold text-slate-900">Size:</span> {formatBytes(activeVersion?.storage_size)}</p>
                <p><span className="font-semibold text-slate-900">Reader:</span> {previewKind === "sheet" ? "Structured table reader" : previewKind === "word" ? "DOCX text reader" : previewKind === "text" ? "Readable text reader" : previewKind === "pdf" ? "PDF canvas reader" : previewKind === "image" ? "Image viewer" : "Fallback download mode"}</p>
              </div>
              {contentUrl ? (
                <Link href={contentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
                  Open content route
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </SurfacePanel>

            {(readerData?.kind === "sheet" || readerData?.kind === "text" || readerData?.kind === "word") ? (
              <SurfacePanel title="Reader tools" description="Keep long files easier to navigate while you stay in the protected app.">
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><TextSelect className="h-4 w-4 text-blue-600" /> Inline search stays inside the current file.</p>
                  <p className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-blue-600" /> Spreadsheet-style files open in searchable sheet tabs.</p>
                </div>
              </SurfacePanel>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
