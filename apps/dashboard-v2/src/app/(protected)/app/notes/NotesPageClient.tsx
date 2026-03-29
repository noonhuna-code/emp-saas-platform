"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePenLine, FolderOpen, Trash2 } from "lucide-react";
import {
  addEmployeeDocument,
  createWorkspaceNote,
  deleteWorkspaceNote,
  fetchEmployeeDocumentDownloadUrl,
  fetchEmployeeMe,
  fetchWorkspaceNotes,
  peekCachedResult,
  updateWorkspaceNote,
  uploadEmployeeDocumentVersion,
} from "@/lib/client/api";
import type { WorkspaceNote } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  PageContainer,
  PageHeader,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import {
  ProfilePanel,
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
  profileTextAreaClassName,
} from "@/components/profile/ProfileSectionPrimitives";

const emptyForm = {
  title: "",
  body: "",
  fileUrl: "",
  fileName: "",
  isPinned: false,
};

const INTERNAL_DOWNLOAD_PATH = /^\/api\/employees\/([^/]+)\/documents\/([^/?]+)\/download(?:\?.*)?$/i;
const PAGE_SIZE = 8;
const iconActionClassName =
  "h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700";

const NotesPageClient = () => {
  const cachedNotes = peekCachedResult<{ rows: WorkspaceNote[] }>("/api/workspace/notes?limit=50");
  const cachedMe = peekCachedResult<{ employeeId: string }>("/api/employees/me");
  const hasCachedNotes = Boolean(cachedNotes?.ok && cachedNotes.data);
  const [rows, setRows] = useState<WorkspaceNote[]>(cachedNotes?.ok ? (cachedNotes.data?.rows ?? []) : []);
  const [loading, setLoading] = useState(!hasCachedNotes);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(cachedMe?.ok ? (cachedMe.data?.employeeId ?? null) : null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    const result = await fetchWorkspaceNotes();
    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to load notes");
      setLoading(false);
      return;
    }
    setRows(result.data.rows);
    setLoading(false);
  };

  useEffect(() => {
    void load(!hasCachedNotes);
    void (async () => {
      const me = await fetchEmployeeMe();
      if (me.ok && me.data?.employeeId) {
        setEmployeeId(me.data.employeeId);
      }
    })();
  }, [hasCachedNotes]);

  const resolveAttachment = async (rawUrl: string | null | undefined) => {
    if (!rawUrl) return null;
    const internalMatch = rawUrl.match(INTERNAL_DOWNLOAD_PATH);
    if (!internalMatch) return rawUrl;
    const [, matchedEmployeeId, documentId] = internalMatch;
    if (!matchedEmployeeId || !documentId) {
      throw new Error("Unable to resolve attached file");
    }
    const result = await fetchEmployeeDocumentDownloadUrl(matchedEmployeeId, documentId);
    if (!result.ok || !result.data?.url) {
      throw new Error(result.error ?? "Unable to open attached file");
    }
    return result.data.url;
  };

  const uploadAttachmentIfNeeded = async (
    currentEmployeeId: string,
    attachmentFile: File | null,
  ): Promise<{ fileUrl: string | null; fileName: string | null }> => {
    if (!attachmentFile) {
      return { fileUrl: null, fileName: null };
    }

    const docResult = await addEmployeeDocument(currentEmployeeId, {
      document_type: "note_attachment",
      document_name: attachmentFile.name,
      status: "active",
    });

    if (!docResult.ok || !docResult.data?.profile?.documents) {
      throw new Error(docResult.error ?? "Unable to attach file");
    }

    const docs = docResult.data.profile.documents;
    const doc =
      docs.find((entry) => entry.document_name === attachmentFile.name && entry.document_type === "note_attachment") ??
      docs[docs.length - 1];

    if (!doc?.id) {
      throw new Error("Unable to attach file");
    }

    const uploadResult = await uploadEmployeeDocumentVersion(currentEmployeeId, doc.id, attachmentFile);
    if (!uploadResult.ok) {
      throw new Error(uploadResult.error ?? "Unable to upload file");
    }

    return {
      fileUrl: `/api/employees/${currentEmployeeId}/documents/${doc.id}/download`,
      fileName: attachmentFile.name,
    };
  };

  const resetComposer = () => {
    setForm(emptyForm);
    setFile(null);
    setEditingFile(null);
    setEditingId(null);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employeeId) {
      setError("Employee record not found");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      let fileUrl = form.fileUrl || null;
      let fileName = form.fileName || null;

      const attachment = await uploadAttachmentIfNeeded(employeeId, editingId ? editingFile : file);
      if (attachment.fileUrl) {
        fileUrl = attachment.fileUrl;
        fileName = attachment.fileName;
      }

      const mutation = editingId
        ? await updateWorkspaceNote(editingId, {
            title: form.title,
            body: form.body,
            fileUrl,
            fileName,
            isPinned: form.isPinned,
          })
        : await createWorkspaceNote({
            title: form.title,
            body: form.body,
            fileUrl,
            fileName,
            isPinned: form.isPinned,
          });

      if (!mutation.ok) {
        setError(mutation.error ?? (editingId ? "Unable to update note" : "Unable to save note"));
        setSubmitting(false);
        return;
      }

      setMessage(editingId ? "Note updated successfully." : "Note saved successfully.");
      resetComposer();
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save note");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (note: WorkspaceNote) => {
    setEditingId(note.id);
    setEditingFile(null);
    setForm({
      title: note.title,
      body: note.body,
      fileUrl: note.file_url ?? "",
      fileName: note.file_name ?? "",
      isPinned: note.is_pinned,
    });
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (noteId: string) => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await deleteWorkspaceNote(noteId);
    if (!result.ok) {
      setError(result.error ?? "Unable to delete note");
      setSubmitting(false);
      return;
    }
    if (editingId === noteId) {
      resetComposer();
    }
    setMessage("Note deleted successfully.");
    await load(false);
    setSubmitting(false);
  };

  const handleOpenAttachment = async (note: WorkspaceNote) => {
    setError(null);
    try {
      const url = await resolveAttachment(note.file_url);
      if (!url) {
        setError("No attachment available for this note");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open file");
    }
  };

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.title, row.body, row.file_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Notes"
        title="Notes workspace"
        description="Keep notes and attachments in one compact searchable register."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.34fr)_minmax(360px,0.9fr)]">
        <SurfacePanel title="My saved notes" description="Search, open, edit, and clear notes without stretching the page.">
          {loading ? <LoadingState label="Loading notes..." /> : null}
          {!loading && error ? <ErrorState message={error} /> : null}
          {!loading && !error ? (
            rows.length === 0 ? (
              <EmptyState title="No notes saved yet" subtitle="Create a note to keep quick context and files close to your workspace." />
            ) : (
              <div className="space-y-4">
                <ProfileTableToolbar
                  query={query}
                  onQueryChange={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  placeholder="Search title, content, or file"
                  countLabel={`${filteredRows.length} notes`}
                />
                <ProfileTableShell>
                  <table className={profileTableClassName}>
                    <thead className={profileTableHeadClassName}>
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Preview</th>
                        <th className="px-4 py-3">Attachment</th>
                        <th className="px-4 py-3">Updated</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {pageRows.map((row) => (
                        <tr key={row.id} className="align-top">
                          <td className={profileTableCellClassName}>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-900">{row.title}</span>
                                {row.is_pinned ? <StatusChip label="Pinned" compact tone="info" /> : null}
                              </div>
                            </div>
                          </td>
                          <td className={profileTableCellClassName}>
                            <p className="max-w-[24rem] truncate text-sm text-slate-600">{row.body}</p>
                          </td>
                          <td className={profileTableCellClassName}>{row.file_name ?? "No file"}</td>
                          <td className={profileTableCellClassName}>{new Date(row.updated_at).toLocaleString()}</td>
                          <td className={profileTableActionCellClassName}>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              {row.file_url ? (
                                <Button type="button" variant="secondary" size="icon" className={iconActionClassName} onClick={() => void handleOpenAttachment(row)} title="Open attachment" aria-label="Open attachment">
                                  <FolderOpen className="h-4 w-4" />
                                </Button>
                              ) : null}
                              <Button type="button" variant="secondary" size="icon" className={iconActionClassName} onClick={() => startEdit(row)} title="Edit note" aria-label="Edit note">
                                <FilePenLine className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="secondary" size="icon" className={iconActionClassName} onClick={() => void handleDelete(row.id)} disabled={submitting} title="Delete note" aria-label="Delete note">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ProfileTableShell>
                <ProfileTablePagination
                  page={page}
                  totalPages={totalPages}
                  countLabel={`Showing ${pageRows.length} of ${filteredRows.length} notes`}
                  onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                  onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
                />
              </div>
            )
          ) : null}
        </SurfacePanel>

        <SurfacePanel
          title={editingId ? "Edit note" : "Add note"}
          description={editingId ? "Update content or replace the attachment for the selected note." : "Create a note and optionally attach one file."}
        >
          <ProfilePanel title={editingId ? "Selected note" : "New note"} description="This uses the same live note and attachment contracts already active in the workspace.">
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className={profileLabelClassName}>
                <span>Title</span>
                <input
                  className={profileFieldClassName}
                  type="text"
                  required
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label className={profileLabelClassName}>
                <span>Note</span>
                <textarea
                  className={profileTextAreaClassName}
                  required
                  rows={5}
                  value={form.body}
                  onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
                />
              </label>
              <div className="grid gap-4">
                <label className={profileLabelClassName}>
                  <span>Attach file</span>
                  <input
                    className={profileFieldClassName}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    onChange={(event) => (editingId ? setEditingFile(event.target.files?.[0] ?? null) : setFile(event.target.files?.[0] ?? null))}
                  />
                </label>
                <label className={profileLabelClassName}>
                  <span>External file URL</span>
                  <input
                    className={profileFieldClassName}
                    type="url"
                    value={form.fileUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
                  />
                </label>
              </div>
              <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(event) => setForm((prev) => ({ ...prev, isPinned: event.target.checked }))}
                />
                Pin note
              </label>
              <SectionActionBar>
                {editingId ? (
                  <Button type="button" variant="secondary" className="rounded-full" onClick={resetComposer}>
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" className="rounded-full" disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Save changes" : "Save note"}
                </Button>
              </SectionActionBar>
            </form>
            {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
          </ProfilePanel>
        </SurfacePanel>
      </div>
    </PageContainer>
  );
};

export default NotesPageClient;
