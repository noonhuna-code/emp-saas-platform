"use client";

import { Fragment, useMemo, useState } from "react";
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
  ProfileTableShell,
  SectionActionBar,
  profileEmptyStateClassName,
  profileFieldClassName,
  profileLabelClassName,
  profileTableActionCellClassName,
  profileTableCellClassName,
  profileTableClassName,
  profileTableHeadClassName,
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

const emptyDraft = {
  document_type: "",
  document_name: "",
  document_number: "",
  file_url: "",
  issued_at: "",
  expires_at: "",
  status: "",
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
};

const getExpiryStatus = (
  expiresAt?: string | null,
): { label: string; tone: "success" | "warning" | "danger" } | null => {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Expired", tone: "danger" };
  if (diffDays <= 30) return { label: `Expiring ${diffDays}d`, tone: "warning" };
  return { label: "Active", tone: "success" };
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
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(emptyDraft);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [versionMap, setVersionMap] = useState<Record<string, EmployeeDocumentVersion[]>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => `${a.document_type}${a.document_name ?? ""}`.localeCompare(`${b.document_type}${b.document_name ?? ""}`)),
    [documents],
  );

  const selectedDocument = editingId ? sortedDocuments.find((entry) => entry.id === editingId) ?? null : null;

  const handleAdd = async () => {
    if (!draft.document_type) return;
    setActionError(null);
    await onAdd({
      document_type: draft.document_type,
      document_name: draft.document_name || null,
      document_number: draft.document_number || null,
      file_url: draft.file_url || null,
      issued_at: draft.issued_at || null,
      expires_at: draft.expires_at || null,
      status: draft.status || null,
    });
    setDraft(emptyDraft);
    setShowCreateForm(false);
  };

  const startEdit = (doc: EmployeeDocument) => {
    setActionError(null);
    setShowCreateForm(false);
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
    setActionError(null);
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
    } else {
      setActionError(result.error ?? "Unable to load document versions");
    }
  };

  const handleToggleVersions = async (docId: string) => {
    const next = !expanded[docId];
    setExpanded((prev) => ({ ...prev, [docId]: next }));
    if (next) {
      await loadVersions(docId);
    }
  };

  const handleUpload = async (docId: string, file: File) => {
    setActionError(null);
    setUploadingId(docId);
    const result = await uploadEmployeeDocumentVersion(employeeId, docId, file);
    if (!result.ok) {
      setUploadingId(null);
      setActionError(result.error ?? "Unable to upload document");
      return;
    }
    await onRefresh?.();
    await loadVersions(docId);
    setUploadingId(null);
  };

  const handleOpen = async (doc: EmployeeDocument, versionId?: string) => {
    setActionError(null);
    if (doc.storage_path || versionId) {
      const result = await fetchEmployeeDocumentDownloadUrl(employeeId, doc.id, versionId);
      if (result.ok && result.data?.url) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
        return;
      }
      setActionError(result.error ?? "Unable to open document");
      return;
    }

    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
      return;
    }

    setActionError("No file is attached to this document yet");
  };

  return (
    <ProfileSectionCard
      title="Documents"
      description="Keep document records in one compact register with quick open, replace, version history, and delete actions."
      actions={
        canEdit ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setEditingId(null);
            }}
          >
            {showCreateForm ? "Hide form" : "Add document"}
          </Button>
        ) : undefined
      }
    >
      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div>
      ) : null}

      {showCreateForm && canEdit ? (
        <ProfilePanel title="Register document" description="Create the record first, then upload the active file from the table.">
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
              <span>Status</span>
              <input className={profileFieldClassName} value={draft.status} onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Issued at</span>
              <input className={profileFieldClassName} type="date" value={draft.issued_at} onChange={(event) => setDraft((prev) => ({ ...prev, issued_at: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Expires at</span>
              <input className={profileFieldClassName} type="date" value={draft.expires_at} onChange={(event) => setDraft((prev) => ({ ...prev, expires_at: event.target.value }))} />
            </label>
            <label className={`${profileLabelClassName} xl:col-span-2`}>
              <span>External file URL</span>
              <input className={profileFieldClassName} value={draft.file_url} onChange={(event) => setDraft((prev) => ({ ...prev, file_url: event.target.value }))} />
            </label>
          </div>
          <SectionActionBar>
            <Button type="button" variant="secondary" className="rounded-full" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={handleAdd} disabled={!draft.document_type}>
              Save document
            </Button>
          </SectionActionBar>
        </ProfilePanel>
      ) : null}

      {selectedDocument ? (
        <ProfilePanel title={`Edit ${selectedDocument.document_type}`} description="Update metadata for the selected document without losing its stored file.">
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
              <span>Status</span>
              <input className={profileFieldClassName} value={editingDraft.status} onChange={(event) => setEditingDraft((prev) => ({ ...prev, status: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Issued at</span>
              <input className={profileFieldClassName} type="date" value={editingDraft.issued_at} onChange={(event) => setEditingDraft((prev) => ({ ...prev, issued_at: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Expires at</span>
              <input className={profileFieldClassName} type="date" value={editingDraft.expires_at} onChange={(event) => setEditingDraft((prev) => ({ ...prev, expires_at: event.target.value }))} />
            </label>
            <label className={`${profileLabelClassName} xl:col-span-2`}>
              <span>External file URL</span>
              <input className={profileFieldClassName} value={editingDraft.file_url} onChange={(event) => setEditingDraft((prev) => ({ ...prev, file_url: event.target.value }))} />
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
        </ProfilePanel>
      ) : null}

      {sortedDocuments.length === 0 ? (
        <EmptyState title="No documents uploaded" subtitle="Add a document record, then upload the active file from the same table row." />
      ) : (
        <ProfileTableShell className="shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
          <table className={profileTableClassName}>
            <thead className={profileTableHeadClassName}>
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedDocuments.map((doc) => {
                const expiry = getExpiryStatus(doc.expires_at);
                const versions = versionMap[doc.id] ?? [];
                const showVersions = expanded[doc.id];
                return (
                  <Fragment key={doc.id}>
                    <tr className="align-top">
                      <td className={profileTableCellClassName}>
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">{doc.document_type}</p>
                          {doc.document_number ? <p className="text-xs text-slate-500">{doc.document_number}</p> : null}
                        </div>
                      </td>
                      <td className={profileTableCellClassName}>{doc.document_name ?? "-"}</td>
                      <td className={profileTableCellClassName}>
                        <div className="flex flex-wrap gap-2">
                          {doc.status ? <StatusBadge status={doc.status} tone="info" /> : null}
                          {expiry ? <StatusBadge status={expiry.label} tone={expiry.tone} /> : null}
                        </div>
                      </td>
                      <td className={profileTableCellClassName}>{formatDate(doc.expires_at)}</td>
                      <td className={profileTableCellClassName}>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">
                            {doc.storage_path ? "Vault file" : doc.file_url ? "External link" : "No file"}
                          </p>
                          <p className="text-xs text-slate-500">
                            v{doc.current_version ?? 0}
                            {doc.storage_size ? ` · ${formatBytes(doc.storage_size)}` : ""}
                          </p>
                        </div>
                      </td>
                      <td className={profileTableActionCellClassName}>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => void handleOpen(doc)}>
                            Open
                          </Button>
                          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => void handleToggleVersions(doc.id)}>
                            {showVersions ? "Hide versions" : "Versions"}
                          </Button>
                          {canEdit ? (
                            <label className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "cursor-pointer rounded-full")}>
                              {uploadingId === doc.id ? "Uploading..." : "Replace"}
                              <input
                                type="file"
                                hidden
                                disabled={uploadingId === doc.id}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) void handleUpload(doc.id, file);
                                  event.currentTarget.value = "";
                                }}
                              />
                            </label>
                          ) : null}
                          {canEdit ? (
                            <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => startEdit(doc)}>
                              Edit
                            </Button>
                          ) : null}
                          {canEdit ? (
                            <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => void onDelete(doc.id)}>
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {showVersions ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4">
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
                            {versions.length === 0 ? (
                              <div className={profileEmptyStateClassName}>No version history available yet.</div>
                            ) : (
                              <div className="space-y-2">
                                {versions.map((version) => (
                                  <div key={version.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium text-slate-900">
                                        v{version.version_number} · {version.file_name}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {formatDate(version.uploaded_at)} · {formatBytes(version.storage_size)}
                                      </p>
                                    </div>
                                    <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => void handleOpen(doc, version.id)}>
                                      Open version
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </ProfileTableShell>
      )}
    </ProfileSectionCard>
  );
};
