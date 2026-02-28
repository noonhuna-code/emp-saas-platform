"use client";

import { useMemo, useState } from "react";
import type { EmployeeDocument, EmployeeDocumentVersion } from "@/lib/types/profile";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  fetchEmployeeDocumentDownloadUrl,
  fetchEmployeeDocumentVersions,
  uploadEmployeeDocumentVersion
} from "@/lib/client/api";

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
  canEdit
}: {
  employeeId: string;
  documents: EmployeeDocument[];
  onAdd: (payload: DocumentPayload) => Promise<void>;
  onUpdate: (documentId: string, payload: DocumentPayload) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  canEdit: boolean;
}) => {
  const getExpiryStatus = (expiresAt?: string | null): { label: string; tone: "success" | "warning" | "danger" } | null => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return null;
    const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Expired", tone: "danger" };
    if (diffDays <= 30) return { label: `Expiring in ${diffDays}d`, tone: "warning" };
    return { label: `Valid (${diffDays}d)`, tone: "success" };
  };

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "-";
    const units = ["B", "KB", "MB", "GB"];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, idx);
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
  };

  const [draft, setDraft] = useState({
    document_type: "",
    document_name: "",
    document_number: "",
    file_url: "",
    issued_at: "",
    expires_at: "",
    status: ""
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<typeof draft>(draft);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [versionMap, setVersionMap] = useState<Record<string, EmployeeDocumentVersion[]>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!draft.document_type) return;
    await onAdd({
      document_type: draft.document_type,
      document_name: draft.document_name || null,
      document_number: draft.document_number || null,
      file_url: draft.file_url || null,
      issued_at: draft.issued_at || null,
      expires_at: draft.expires_at || null,
      status: draft.status || null
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
      status: doc.status ?? ""
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
      status: editingDraft.status || null
    });
    setEditingId(null);
  };

  const loadVersions = async (docId: string) => {
    const result = await fetchEmployeeDocumentVersions(employeeId, docId);
    if (result.ok) {
      const versions = result.data?.versions ?? [];
      setVersionMap((prev) => ({ ...prev, [docId]: versions }));
    }
  };

  const handleToggleVersions = async (docId: string) => {
    setExpanded((prev) => ({ ...prev, [docId]: !prev[docId] }));
    if (!expanded[docId]) {
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

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => (a.document_type || "").localeCompare(b.document_type || "")),
    [documents]
  );

  return (
    <section className="card stack">
      <div>
        <h3>Documents</h3>
        <p className="muted">Track document status, expiry, and secure vault versions.</p>
      </div>

      {actionError ? <p className="error-text">{actionError}</p> : null}

      {canEdit ? (
        <>
          <div className="form-grid form-grid--two">
            <label>
              Document type
              <input
                value={draft.document_type}
                onChange={(event) => setDraft((prev) => ({ ...prev, document_type: event.target.value }))}
              />
            </label>
            <label>
              Document name
              <input
                value={draft.document_name}
                onChange={(event) => setDraft((prev) => ({ ...prev, document_name: event.target.value }))}
              />
            </label>
            <label>
              Document number
              <input
                value={draft.document_number}
                onChange={(event) => setDraft((prev) => ({ ...prev, document_number: event.target.value }))}
              />
            </label>
            <label>
              External file URL (optional)
              <input
                value={draft.file_url}
                onChange={(event) => setDraft((prev) => ({ ...prev, file_url: event.target.value }))}
              />
            </label>
            <label>
              Issued at
              <input
                type="date"
                value={draft.issued_at}
                onChange={(event) => setDraft((prev) => ({ ...prev, issued_at: event.target.value }))}
              />
            </label>
            <label>
              Expires at
              <input
                type="date"
                value={draft.expires_at}
                onChange={(event) => setDraft((prev) => ({ ...prev, expires_at: event.target.value }))}
              />
            </label>
            <label>
              Status
              <input
                value={draft.status}
                onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
              />
            </label>
          </div>

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="secondary-btn" type="button" onClick={handleAdd}>Add document</button>
          </div>
        </>
      ) : (
        <p className="muted">Document edits are restricted to permitted roles.</p>
      )}

      <div className="stack">
        {sortedDocuments.length === 0 ? <p className="muted">No documents uploaded.</p> : null}
        {sortedDocuments.map((doc) => {
          const expiry = getExpiryStatus(doc.expires_at);
          const versions = versionMap[doc.id] ?? [];
          const showVersions = expanded[doc.id];

          return (
            <div key={doc.id} className="card card--nested stack">
              {editingId === doc.id ? (
                <div className="form-grid form-grid--two">
                  <label>
                    Document type
                    <input
                      value={editingDraft.document_type}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, document_type: event.target.value }))}
                    />
                  </label>
                  <label>
                    Document name
                    <input
                      value={editingDraft.document_name}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, document_name: event.target.value }))}
                    />
                  </label>
                  <label>
                    Document number
                    <input
                      value={editingDraft.document_number}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, document_number: event.target.value }))}
                    />
                  </label>
                  <label>
                    External file URL (optional)
                    <input
                      value={editingDraft.file_url}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, file_url: event.target.value }))}
                    />
                  </label>
                  <label>
                    Issued at
                    <input
                      type="date"
                      value={editingDraft.issued_at}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, issued_at: event.target.value }))}
                    />
                  </label>
                  <label>
                    Expires at
                    <input
                      type="date"
                      value={editingDraft.expires_at}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, expires_at: event.target.value }))}
                    />
                  </label>
                  <label>
                    Status
                    <input
                      value={editingDraft.status}
                      onChange={(event) => setEditingDraft((prev) => ({ ...prev, status: event.target.value }))}
                    />
                  </label>
                  <div className="row" style={{ justifyContent: "flex-end", gridColumn: "1 / -1" }}>
                    <button className="secondary-btn" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                    <button className="primary-btn" type="button" onClick={saveEdit}>Save</button>
                  </div>
                </div>
              ) : (
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <strong>{doc.document_type}</strong>
                      {expiry ? <StatusBadge status={expiry.label} tone={expiry.tone} /> : null}
                    </div>
                    <span className="muted">{doc.document_name ?? "Document"}</span>
                    <span className="muted">Expires: {doc.expires_at ?? "N/A"}</span>
                    <span className="muted">Vault version: {doc.current_version ?? "—"}</span>
                  </div>
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    <button className="secondary-btn" type="button" onClick={() => handleDownload(doc)}>
                      Download
                    </button>
                    <button className="secondary-btn" type="button" onClick={() => handleToggleVersions(doc.id)}>
                      {showVersions ? "Hide versions" : "View versions"}
                    </button>
                    {canEdit ? (
                      <label className="secondary-btn" style={{ cursor: "pointer" }}>
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
                      <button className="secondary-btn" type="button" onClick={() => startEdit(doc)}>Edit</button>
                    ) : null}
                    {canEdit ? (
                      <button className="secondary-btn" type="button" onClick={() => onDelete(doc.id)}>Remove</button>
                    ) : null}
                  </div>
                </div>
              )}

              {showVersions ? (
                <div className="stack">
                  {versions.length === 0 ? (
                    <p className="muted">No versions uploaded yet.</p>
                  ) : (
                    versions.map((version) => (
                      <div key={version.id} className="row" style={{ justifyContent: "space-between" }}>
                        <div className="stack" style={{ gap: 4 }}>
                          <span>v{version.version_number} · {version.file_name}</span>
                          <span className="muted">
                            Uploaded: {version.uploaded_at ? new Date(version.uploaded_at).toLocaleDateString() : "-"}
                            {version.storage_size ? ` · ${formatBytes(version.storage_size)}` : ""}
                          </span>
                        </div>
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => handleDownload(doc, version.id)}
                        >
                          Download
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
