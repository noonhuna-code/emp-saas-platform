"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { fetchEmployeeDocumentVersions } from "@/lib/client/api";
import type { EmployeeDocumentVersion } from "@/lib/types/profile";
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
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

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
    if (!contentUrl || previewKind !== "text") {
      setTextContent(null);
      setTextLoading(false);
      return;
    }

    let active = true;
    setTextLoading(true);
    setTextContent(null);

    void fetch(contentUrl, { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          throw new Error("Unable to load file contents");
        }
        const text = await response.text();
        setTextContent(text);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setTextContent(err instanceof Error ? err.message : "Unable to load file contents");
      })
      .finally(() => {
        if (active) setTextLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contentUrl, previewKind]);

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
        description="Preview PDFs, text documents, and saved files inside a protected Workforce OS viewer window."
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
        title="Open employee files in a cleaner window without leaving the product."
        description="This viewer keeps PDFs, text files, and image-like uploads readable inside the protected app while still honoring the existing signed-file access model."
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <SurfacePanel
            title="Inline preview"
            description="Readable rendering for supported file types. Unsupported files still keep direct raw-open and download options."
            actions={(
              <Button type="button" variant="secondary" className="rounded-full" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh preview
              </Button>
            )}
          >
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

            {contentUrl && previewKind === "text" ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-950 shadow-inner">
                {textLoading ? <div className="px-5 py-10 text-sm text-slate-300">Loading readable text...</div> : null}
                {!textLoading ? (
                  <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words px-5 py-5 text-sm leading-7 text-slate-100">
                    {textContent ?? "No text content available."}
                  </pre>
                ) : null}
              </div>
            ) : null}

            {contentUrl && previewKind === "unsupported" ? (
              <EmptyState
                title="Inline preview is not available for this file type"
                subtitle="Use the raw file or download action for formats like Office documents or other unsupported binaries."
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

            <SurfacePanel title="Active file details" description="Technical metadata for the selected document version.">
              <OverviewChips chips={[resolvedFileName, resolvedMimeType ?? "MIME unavailable", source ? `${source} source` : "Employee document"]} />
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-900">File:</span> {resolvedFileName}</p>
                <p><span className="font-semibold text-slate-900">MIME:</span> {resolvedMimeType ?? "-"}</p>
                <p><span className="font-semibold text-slate-900">Version:</span> {activeVersion ? `v${activeVersion.version_number}` : "-"}</p>
                <p><span className="font-semibold text-slate-900">Uploaded:</span> {formatDateTime(activeVersion?.uploaded_at)}</p>
                <p><span className="font-semibold text-slate-900">Size:</span> {formatBytes(activeVersion?.storage_size)}</p>
              </div>
              {contentUrl ? (
                <Link href={contentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
                  Open content route
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </SurfacePanel>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
