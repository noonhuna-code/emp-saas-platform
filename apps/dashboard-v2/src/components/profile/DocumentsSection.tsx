"use client";

import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { EmployeeDocument, EmployeeDocumentVersion } from "@/lib/types/profile";
import {
  fetchEmployeeDocumentDownloadUrl,
  fetchEmployeeDocumentVersions,
  uploadEmployeeDocumentVersion,
} from "@/lib/client/api";
import {
  ProfilePanel,
  ProfileSectionCard,
  ReadonlyField,
  SectionActionBar,
  profileEmptyStateClassName,
  profileFieldClassName,
  profileLabelClassName,
  profileNestedPanelClassName,
} from "@/components/profile/ProfileSectionPrimitives";

type DocumentPayload = {
  document_type: string;
  document_name?: string | null;
  document_number?: string | null;
  file_url?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  status?: string | null;
};

export const DocumentsSection = ({
  employeeId,
  documents,
  onAdd,
  onUpdate,
  onDelete,
  onRefresh,
  canEdit,
}: {
  employeeId: string;
  documents: EmployeeDocument[];
  onAdd: (payload: DocumentPayload) => Promise<void>;
  onUpdate: (documentId: string, payload: DocumentPayload) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  canEdit: boolean;
}) => {
  const [draft, setDraft] = useState({
    document_type: "",
    document_name: "",
    document_number: "",
    file_url: "",
    issued_at: "",
    expires_at: "",
    status: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(draft);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [versionMap, setVersionMap] = useState<Record<string, EmployeeDocumentVersion[]>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, idx);
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
  };

  const getExpiryStatus = (expiresAt?: string | null): { label: string; tone: "success" | "warning" | "danger" } | null => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return null;
    const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Expired", tone: "danger" };
    if (diffDays <= 30) return { label: `Expiring in ${diffDays}d`, tone: "warning" };
    return { label: `Valid (${diffDays}d)`, tone: "success" };
  };

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => (a.document_type || "").localeCompare(b.document_type || "")),
    [documents],
  );

  const handleAdd = async () => {
    if (!draft.document_type) return;
    await onAdd({
      document_type: draft.document_type,
      document_name: draft.document_name || null,
      document_number: draft.document_number || null,
      file_url: draft.file_url || null,
      issued_at: draft.issued_at || null,
      expires_at: draft.expires_at || null,
      status: draft.status || null,
    });
    setDraft({ document_type: "", document_name: "", document_number: "", file_url: "", issued_at: "", expires_at: "", status: "" });
  };

  const startEdit = (doc: EmployeeDocument) => {
    setEditingId(doc.id);
    setEditingDraft({
      document_type: doc.document_type,
      document_name: doc.document_name ?? "",
      document_number: doc.document_number ?? "",
      file_url: doc.file_url ?? "",
      issued_at: doc.issued_at ?? "",
      expires_at: doc.expires_at ?? "",
      status: doc.status ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await onUpdate(editingId, {
      document_type: editingDraft.document_type,
      document_name: editingDraft.document_name || null,
      document_number: editingDraft.document_number || null,
      file_url: editingDraft.file_url || null,
      issued_at: editingDraft.issued_at || null,
      expires_at: editingDraft.expires_at || null,
      status: editingDraft.status || null,
    });
    setEditingId(null);
  };

  const loadVersions = async (docId: string) => {
    const result = await fetchEmployeeDocumentVersions(employeeId, docId);
    if (result.ok) {
      setVersionMap((prev) => ({ ...prev, [docId]: result.data?.versions ?? [] }));
    }
  };

  const handleToggleVersions = async (docId: string) => {
    const nextExpanded = !expanded[docId];
    setExpanded((prev) => ({ ...prev, [docId]: nextExpanded }));
    if (nextExpanded) {
      await loadVersions(docId);
    }
  };

  const handleUpload = async (docId: string, file: File) => {
    setActionError(null);
    setUploadingId(docId);
    const result = await uploadEmployeeDocumentVersion(employeeId, docId, file);
    if (!result.ok) {
      setActionError(result.error ?? "Unable to upload document");
      setUploadingId(null);
      return;
    }
    await onRefresh?.();
    await loadVersions(docId);
    setUploadingId(null);
  };

  const handleDownload = async (doc: EmployeeDocument, versionId?: string) => {
    setActionError(null);
    if (versionId) {
      const result = await fetchEmployeeDocumentDownloadUrl(employeeId, doc.id, versionId);
      if (result.ok && result.data?.url) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      } else {
        setActionError(result.error ?? "Unable to download document");
      }
      return;
    }

    if (doc.storage_path) {
      const result = await fetchEmployeeDocumentDownloadUrl(employeeId, doc.id);
      if (result.ok && result.data?.url) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
        return;
      }
      setActionError(result.error ?? "Unable to download document");
      return;
    }

    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
      return;
    }

    setActionError("No file available for download");
  };

  return (
    <ProfileSectionCard
      title="Documents"
      description="Track active document status, expiry, and secure vault versions without changing the current document contract."
      actions={
        canEdit ? (
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={handleAdd} disabled={!draft.document_type}>
            Add document
          </Button>
        ) : undefined
      }
    >
      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div>
      ) : null}

      {canEdit ? (
        <ProfilePanel title="Register document" description="Add a document reference, external URL, or lifecycle dates before uploading new versions.">
          <div className="grid gap-4 xl:grid-cols-2">
            <label className={profileLabelClassName}>
              <span>Document type</span>
              <input className={profileFieldClassName} value={draft.document_type} onChange={(event) => setDraft((prev) => ({ ...prev, document_type: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Document name</span>
              <input className={profileFieldClassName} value={draft.document_name} onChange={(event) => setDraft((prev) => ({ ...prev, document_name: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Document number</span>
              <input className={profileFieldClassName} value={draft.document_number} onChange={(event) => setDraft((prev) => ({ ...prev, document_number: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>External file URL</span>
              <input className={profileFieldClassName} value={draft.file_url} onChange={(event) => setDraft((prev) => ({ ...prev, file_url: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Issued at</span>
              <input className={profileFieldClassName} type="date" value={draft.issued_at} onChange={(event) => setDraft((prev) => ({ ...prev, issued_at: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Expires at</span>
              <input className={profileFieldClassName} type="date" value={draft.expires_at} onChange={(event) => setDraft((prev) => ({ ...prev, expires_at: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Status</span>
              <input className={profileFieldClassName} value={draft.status} onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))} />
            </label>
          </div>
        </ProfilePanel>
      ) : null}

      <div className="space-y-4">
        {sortedDocuments.length === 0 ? (
          <EmptyState title="No documents uploaded" subtitle="Add a document reference or upload a secured version to begin building the employee vault." />
        ) : null}

        {sortedDocuments.map((doc) => {
          const expiry = getExpiryStatus(doc.expires_at);
          const versions = versionMap[doc.id] ?? [];
          const showVersions = expanded[doc.id];

          return (
            <div key={doc.id} className={profileNestedPanelClassName}>
              {editingId === doc.id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <label className={profileLabelClassName}>
                      <span>Document type</span>
                      <input className={profileFieldClassName} value={editingDraft.document_type} onChange={(event) => setEditingDraft((prev) => ({ ...prev, document_type: event.target.value }))} />
                    </label>
                    <label className={profileLabelClassName}>
                      <span>Document name</span>
                      <input className={profileFieldClassName} value={editingDraft.document_name} onChange={(event) => setEditingDraft((prev) => ({ ...prev, document_name: event.target.value }))} />
                    </label>
                    <label className={profileLabelClassName}>
                      <span>Document number</span>
                      <input className={profileFieldClassName} value={editingDraft.document_number} onChange={(event) => setEditingDraft((prev) => ({ ...prev, document_number: event.target.value }))} />
                    </label>
                    <label className={profileLabelClassName}>
                      <span>External file URL</span>
                      <input className={profileFieldClassName} value={editingDraft.file_url} onChange={(event) => setEditingDraft((prev) => ({ ...prev, file_url: event.target.value }))} />
                    </label>
                    <label className={profileLabelClassName}>
                      <span>Issued at</span>
                      <input className={profileFieldClassName} type="date" value={editingDraft.issued_at} onChange={(event) => setEditingDraft((prev) => ({ ...prev, issued_at: event.target.value }))} />
                    </label>
                    <label className={profileLabelClassName}>
                      <span>Expires at</span>
                      <input className={profileFieldClassName} type="date" value={editingDraft.expires_at} onChange={(event) => setEditingDraft((prev) => ({ ...prev, expires_at: event.target.value }))} />
                    </label>
                    <label className={profileLabelClassName}>
                      <span>Status</span>
                      <input className={profileFieldClassName} value={editingDraft.status} onChange={(event) => setEditingDraft((prev) => ({ ...prev, status: event.target.value }))} />
                    </label>
                  </div>
                  <SectionActionBar>
                    <Button type="button" variant="secondary" className="rounded-full" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button type="button" className="rounded-full" onClick={saveEdit}>
                      Save changes
                    </Button>
                  </SectionActionBar>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold tracking-tight text-slate-950">{doc.document_type}</h4>
                        {expiry ? <StatusBadge status={expiry.label} tone={expiry.tone} /> : null}
                        {doc.status ? <StatusBadge status={doc.status} tone="info" /> : null}
                      </div>
                      <p className="text-sm text-slate-600">{doc.document_name ?? "Document reference"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="secondary" className="rounded-full" onClick={() => handleDownload(doc)}>
                        Download
                      </Button>
                      <Button type="button" variant="secondary" className="rounded-full" onClick={() => handleToggleVersions(doc.id)}>
                        {showVersions ? "Hide versions" : "View versions"}
                      </Button>
                      {canEdit ? (
                        <label className={cn(buttonVariants({ variant: "secondary" }), "h-10 cursor-pointer rounded-full px-4") }>
                          {uploadingId === doc.id ? "Uploading..." : "Upload version"}
                          <input
                            type="file"
                            hidden
                            disabled={uploadingId === doc.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void handleUpload(doc.id, file);
                              }
                            }}
                          />
                        </label>
                      ) : null}
                      {canEdit ? (
                        <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEdit(doc)}>
                          Edit
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <Button type="button" variant="secondary" className="rounded-full" onClick={() => onDelete(doc.id)}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ReadonlyField label="Document number" value={doc.document_number ?? "—"} />
                    <ReadonlyField label="Issued at" value={doc.issued_at ?? "—"} />
                    <ReadonlyField label="Expires at" value={doc.expires_at ?? "—"} />
                    <ReadonlyField label="Current version" value={doc.current_version ?? "—"} hint={doc.storage_path ? "Vault-backed" : "External reference"} />
                  </div>

                  {showVersions ? (
                    <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white/75 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Version history</p>
                          <p className="text-sm text-slate-500">Secure uploads linked to this document.</p>
                        </div>
                      </div>
                      {versions.length === 0 ? (
                        <div className={profileEmptyStateClassName}>No versions uploaded yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {versions.map((version) => (
                            <div key={version.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-900">v{version.version_number} · {version.file_name}</p>
                                <p className="text-sm text-slate-500">
                                  Uploaded {version.uploaded_at ? new Date(version.uploaded_at).toLocaleDateString() : "-"}
                                  {version.storage_size ? ` · ${formatBytes(version.storage_size)}` : ""}
                                </p>
                              </div>
                              <Button type="button" variant="secondary" className="rounded-full" onClick={() => handleDownload(doc, version.id)}>
                                Download version
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ProfileSectionCard>
  );
};
