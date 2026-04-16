"use client";

import { useMemo, useState } from "react";
import { FilePenLine, FolderOpen, Search, Trash2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { buildEmployeeDocumentViewerHref, parseEmployeeDocumentDownloadPath } from "@/lib/documents/viewer";
import { cn } from "@/lib/utils";
import type { EmployeeDocument } from "@/lib/types/profile";
import {
  uploadEmployeeDocumentVersion,
} from "@/lib/client/api";
import {
  ProfilePanel,
  ProfileSectionCard,
  ProfileTablePagination,
  ProfileTableShell,
  ProfileTableToolbar,
  SectionActionBar,
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

const PAGE_SIZE = 6;

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

const iconActionClassName =
  "h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700";

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
  onAdd: (payload: DocumentPayload) => Promise<EmployeeDocument | null>;
  onUpdate: (documentId: string, payload: DocumentPayload) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  canEdit: boolean;
}) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(emptyDraft);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort((a, b) =>
        `${a.document_type}${a.document_name ?? ""}`.localeCompare(`${b.document_type}${b.document_name ?? ""}`),
      ),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedDocuments;
    return sortedDocuments.filter((doc) =>
      [doc.document_type, doc.document_name, doc.document_number, doc.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, sortedDocuments]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE));
  const pageRows = filteredDocuments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedDocument = editingId ? sortedDocuments.find((entry) => entry.id === editingId) ?? null : null;

  const resetCreateForm = () => {
    setDraft(emptyDraft);
    setDraftFile(null);
    setShowCreateForm(false);
  };

  const handleAdd = async () => {
    if (!draft.document_type) return;
    setActionError(null);
    const createdDocument = await onAdd({
      document_type: draft.document_type,
      document_name: draft.document_name || null,
      document_number: draft.document_number || null,
      file_url: draft.file_url || null,
      issued_at: draft.issued_at || null,
      expires_at: draft.expires_at || null,
      status: draft.status || null,
    });

    if (!createdDocument) {
      setActionError("Unable to create document");
      return;
    }

    if (draftFile) {
      setUploadingId(createdDocument.id);
      const result = await uploadEmployeeDocumentVersion(employeeId, createdDocument.id, draftFile);
      setUploadingId(null);
      if (!result.ok) {
        setActionError(result.error ?? "Unable to upload document");
        await onRefresh?.();
        return;
      }
      await onRefresh?.();
    }

    resetCreateForm();
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
    setUploadingId(null);
  };

  const handleOpen = async (doc: EmployeeDocument) => {
    setActionError(null);
    if (doc.storage_path) {
      const href = buildEmployeeDocumentViewerHref({
        employeeId,
        documentId: doc.id,
        fileName: doc.document_name ?? doc.document_type,
        mimeType: doc.storage_mime_type,
        title: doc.document_name ?? doc.document_type,
        source: "profile",
      });
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    const parsed = parseEmployeeDocumentDownloadPath(doc.file_url);
    if (parsed) {
      const href = buildEmployeeDocumentViewerHref({
        ...parsed,
        fileName: doc.document_name ?? doc.document_type,
        mimeType: doc.storage_mime_type,
        title: doc.document_name ?? doc.document_type,
        source: "profile",
      });
      window.open(href, "_blank", "noopener,noreferrer");
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
      description="Manage employee files in one searchable register with direct upload, open, replace, edit, and delete actions."
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
        <ProfilePanel title="Register document" description="Save the record and attach the active file in the same step.">
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
            <label className={profileLabelClassName}>
              <span>Attach file</span>
              <input
                className={cn(profileFieldClassName, "h-auto py-2 file:mr-3 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700")}
                type="file"
                onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className={profileLabelClassName}>
              <span>External file URL</span>
              <input className={profileFieldClassName} value={draft.file_url} onChange={(event) => setDraft((prev) => ({ ...prev, file_url: event.target.value }))} />
            </label>
          </div>
          <SectionActionBar>
            <Button type="button" variant="secondary" className="rounded-full" onClick={resetCreateForm}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={handleAdd} disabled={!draft.document_type || uploadingId !== null}>
              {uploadingId ? "Uploading..." : "Save document"}
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

      <ProfileTableToolbar
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search document name, type, number, or status"
        countLabel={`${filteredDocuments.length} documents`}
      />

      {filteredDocuments.length === 0 ? (
        <EmptyState title="No matching documents" subtitle={documents.length === 0 ? "Add a document record and attach the active file from the same form." : "Try a different search term or clear the filter."} />
      ) : (
        <>
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
                {pageRows.map((doc) => {
                  const expiry = getExpiryStatus(doc.expires_at);
                  return (
                    <tr key={doc.id} className="align-top">
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
                            {doc.storage_path ? "Uploaded file" : doc.file_url ? "External link" : "No file"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {doc.storage_size ? formatBytes(doc.storage_size) : "Ready"}
                          </p>
                        </div>
                      </td>
                      <td className={profileTableActionCellClassName}>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Button type="button" variant="secondary" size="icon" className={iconActionClassName} onClick={() => void handleOpen(doc)} title="Open document" aria-label="Open document">
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                          {canEdit ? (
                            <label
                              className={cn(buttonVariants({ variant: "secondary", size: "icon" }), iconActionClassName, "cursor-pointer")}
                              title="Replace file"
                              aria-label="Replace file"
                            >
                              {uploadingId === doc.id ? <Search className="h-4 w-4 animate-pulse" /> : <Upload className="h-4 w-4" />}
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
                            <Button type="button" variant="secondary" size="icon" className={iconActionClassName} onClick={() => startEdit(doc)} title="Edit metadata" aria-label="Edit metadata">
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canEdit ? (
                            <Button type="button" variant="secondary" size="icon" className={iconActionClassName} onClick={() => void onDelete(doc.id)} title="Delete document" aria-label="Delete document">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ProfileTableShell>

          <ProfileTablePagination
            page={page}
            totalPages={totalPages}
            countLabel={`Showing ${pageRows.length} of ${filteredDocuments.length} documents`}
            onPrevious={() => setPage((value) => Math.max(1, value - 1))}
            onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
          />
        </>
      )}
    </ProfileSectionCard>
  );
};
