"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilePenLine, FolderOpen, Paperclip, Search, Trash2 } from "lucide-react";
import {
  addEmployeeDocument,
  createWorkspaceNote,
  deleteWorkspaceNote,
  fetchEmployeeMe,
  fetchWorkspaceNotes,
  peekCachedResult,
  updateWorkspaceNote,
  uploadEmployeeDocumentVersion,
} from "@/lib/client/api";
import { parseReadableDocument } from "@/lib/documents/readable";
import { buildEmployeeDocumentViewerHref, parseEmployeeDocumentDownloadPath, resolveDocumentPreviewKind } from "@/lib/documents/viewer";
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
  SectionActionBar,
  profileFieldClassName,
  profileLabelClassName,
  profileTextAreaClassName,
} from "@/components/profile/ProfileSectionPrimitives";

const emptyForm = {
  title: "",
  body: "",
  fileUrl: "",
  fileName: "",
  isPinned: false,
};

const PAGE_SIZE = 8;

type NoteAttachmentIndexEntry = {
  searchText: string;
  previewText: string;
  previewKind: string;
};

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
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [attachmentIndex, setAttachmentIndex] = useState<Record<string, NoteAttachmentIndexEntry>>({});
  const [indexing, setIndexing] = useState(false);

  const load = useCallback(async (showLoading = true) => {
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
  }, []);

  useEffect(() => {
    void load(!hasCachedNotes);
    void (async () => {
      const me = await fetchEmployeeMe();
      if (me.ok && me.data?.employeeId) {
        setEmployeeId(me.data.employeeId);
      }
    })();
  }, [hasCachedNotes, load]);

  useEffect(() => {
    let active = true;

    const indexAttachments = async () => {
      const supportedRows = rows.filter((row) => {
        if (!row.file_url || !row.file_name) return false;
        const kind = resolveDocumentPreviewKind(null, row.file_name);
        return kind === "text" || kind === "sheet" || kind === "word";
      });

      if (supportedRows.length === 0) {
        if (active) setAttachmentIndex({});
        return;
      }

      setIndexing(true);
      const nextIndex: Record<string, NoteAttachmentIndexEntry> = {};

      await Promise.allSettled(
        supportedRows.map(async (row) => {
          const parsed = parseEmployeeDocumentDownloadPath(row.file_url);
          if (!parsed?.employeeId || !parsed.documentId) return;

          const contentUrl = `/api/employees/${parsed.employeeId}/documents/${parsed.documentId}/content`;
          const response = await fetch(contentUrl, { cache: "no-store" });
          if (!response.ok) return;

          const buffer = await response.arrayBuffer();
          const parsedDocument = await parseReadableDocument({
            buffer,
            fileName: row.file_name,
            mimeType: response.headers.get("content-type"),
          });

          const previewText =
            parsedDocument.kind === "sheet"
              ? `Sheets: ${parsedDocument.sheets.map((sheet) => sheet.name).join(", ")}`
              : parsedDocument.kind === "word"
                ? parsedDocument.text.slice(0, 260)
                : parsedDocument.kind === "text"
                  ? parsedDocument.text.slice(0, 260)
                  : "";

          nextIndex[row.id] = {
            searchText: parsedDocument.searchText,
            previewText,
            previewKind: parsedDocument.kind,
          };
        })
      );

      if (!active) return;
      setAttachmentIndex(nextIndex);
      setIndexing(false);
    };

    void indexAttachments().finally(() => {
      if (active) setIndexing(false);
    });

    return () => {
      active = false;
    };
  }, [rows]);

  const uploadAttachmentIfNeeded = useCallback(async (
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
  }, []);

  const resetComposer = useCallback(() => {
    setForm(emptyForm);
    setFile(null);
    setEditingFile(null);
    setEditingId(null);
  }, []);

  const onSubmit = useCallback(async (event: React.FormEvent) => {
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
  }, [editingFile, editingId, employeeId, file, form, load, resetComposer, uploadAttachmentIfNeeded]);

  const startEdit = useCallback((note: WorkspaceNote) => {
    setEditingId(note.id);
    setEditingFile(null);
    setForm({
      title: note.title,
      body: note.body,
      fileUrl: note.file_url ?? "",
      fileName: note.file_name ?? "",
      isPinned: note.is_pinned,
    });
    setSelectedNoteId(note.id);
    setMessage(null);
    setError(null);
  }, []);

  const handleDelete = useCallback(async (noteId: string) => {
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
  }, [editingId, load, resetComposer]);

  const handleOpenAttachment = useCallback(async (note: WorkspaceNote) => {
    setError(null);
    try {
      if (!note.file_url) {
        setError("No attachment available for this note");
        return;
      }

      const parsed = parseEmployeeDocumentDownloadPath(note.file_url);
      if (parsed) {
        const href = buildEmployeeDocumentViewerHref({
          ...parsed,
          fileName: note.file_name ?? "Attachment",
          title: note.file_name ?? note.title,
          source: "notes",
        });
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      window.open(note.file_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open file");
    }
  }, []);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.title, row.body, row.file_name, attachmentIndex[row.id]?.searchText]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [attachmentIndex, query, rows]);

  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedNoteId(null);
      return;
    }
    if (!selectedNoteId || !filteredRows.some((row) => row.id === selectedNoteId)) {
      setSelectedNoteId(filteredRows[0]?.id ?? null);
    }
  }, [filteredRows, selectedNoteId]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedNote = filteredRows.find((row) => row.id === selectedNoteId) ?? pageRows[0] ?? null;
  const selectedAttachment = selectedNote ? attachmentIndex[selectedNote.id] ?? null : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Notes"
        title="Notes workspace"
        description="Keep notes and attachments in one searchable reading workspace."
      />

      <div className="space-y-6">
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

        <SurfacePanel title="My saved notes" description="Search note text, file names, and supported attachment content from one cleaner reading workspace.">
          {loading ? <LoadingState label="Loading notes..." /> : null}
          {!loading && error ? <ErrorState message={error} /> : null}
          {!loading && !error ? (
            rows.length === 0 ? (
              <EmptyState title="No notes saved yet" subtitle="Create a note to keep quick context and files close to your workspace." />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search notes, file names, and supported sheet/doc text"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span>{filteredRows.length} notes</span>
                    {indexing ? <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Indexing attachments</span> : null}
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                  <div className="space-y-4">
                    {pageRows.map((row) => {
                      const isSelected = row.id === selectedNote?.id;
                      const attachmentEntry = attachmentIndex[row.id];
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => setSelectedNoteId(row.id)}
                          className={`w-full rounded-[28px] border p-5 text-left transition ${
                            isSelected
                              ? "border-blue-200 bg-blue-50/70 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-semibold text-slate-950">{row.title}</span>
                                {row.is_pinned ? <StatusChip label="Pinned" compact tone="info" /> : null}
                                {row.file_name ? <StatusChip label={attachmentEntry ? attachmentEntry.previewKind.toUpperCase() : "FILE"} compact /> : null}
                              </div>
                              <p className="line-clamp-3 text-sm leading-6 text-slate-600">{row.body}</p>
                            </div>
                            <span className="text-xs text-slate-500">{new Date(row.updated_at).toLocaleDateString()}</span>
                          </div>

                          {row.file_name ? (
                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                              <Paperclip className="h-3.5 w-3.5" />
                              <span className="truncate">{row.file_name}</span>
                            </div>
                          ) : null}

                          {attachmentEntry?.previewText ? (
                            <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{attachmentEntry.previewText}</p>
                          ) : null}
                        </button>
                      );
                    })}

                    <ProfileTablePagination
                      page={currentPage}
                      totalPages={totalPages}
                      countLabel={`Showing ${pageRows.length} of ${filteredRows.length} notes`}
                      onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                      onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
                    />
                  </div>

                  <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                    {!selectedNote ? (
                      <EmptyState title="Pick a note" subtitle="Select a note on the left to open the full reading view." compact />
                    ) : (
                      <div className="space-y-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-2xl font-semibold text-slate-950">{selectedNote.title}</h2>
                              {selectedNote.is_pinned ? <StatusChip label="Pinned" compact tone="info" /> : null}
                            </div>
                            <p className="text-sm text-slate-500">
                              Updated {new Date(selectedNote.updated_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedNote.file_url ? (
                              <Button type="button" variant="secondary" className="rounded-full" onClick={() => void handleOpenAttachment(selectedNote)}>
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Open reader
                              </Button>
                            ) : null}
                            <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEdit(selectedNote)}>
                              <FilePenLine className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button type="button" variant="secondary" className="rounded-full" onClick={() => void handleDelete(selectedNote.id)} disabled={submitting}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reading view</p>
                          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                            {selectedNote.body}
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Attachment insight</p>
                          {selectedNote.file_name ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusChip label={selectedAttachment ? `${selectedAttachment.previewKind.toUpperCase()} indexed` : "Attachment saved"} compact />
                                <span className="text-sm font-medium text-slate-900">{selectedNote.file_name}</span>
                              </div>
                              <p className="text-sm text-slate-600">
                                {selectedAttachment?.previewText
                                  ? selectedAttachment.previewText
                                  : "This attachment is saved with the note. Open the protected reader for the full file view."}
                              </p>
                              <Button type="button" variant="secondary" className="rounded-full" onClick={() => void handleOpenAttachment(selectedNote)}>
                                <FolderOpen className="mr-2 h-4 w-4" />
                                View attachment
                              </Button>
                            </div>
                          ) : (
                            <EmptyState title="No attachment" subtitle="This note only contains written content." compact />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : null}
        </SurfacePanel>
      </div>
    </PageContainer>
  );
};

export default NotesPageClient;
