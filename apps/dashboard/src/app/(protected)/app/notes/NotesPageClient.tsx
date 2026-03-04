"use client";

import { useEffect, useState } from "react";
import { createWorkspaceNote, fetchWorkspaceNotes } from "@/lib/client/api";
import type { WorkspaceNote } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/StatusChip";

const NotesPageClient = () => {
  const [rows, setRows] = useState<WorkspaceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", fileUrl: "", fileName: "", isPinned: false });

  const load = async () => {
    setLoading(true);
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
    void load();
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const result = await createWorkspaceNote({
      title: form.title,
      body: form.body,
      fileUrl: form.fileUrl || null,
      fileName: form.fileName || null,
      isPinned: form.isPinned
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to save note");
      return;
    }

    setMessage("Note saved successfully.");
    setForm({ title: "", body: "", fileUrl: "", fileName: "", isPinned: false });
    await load();
  };

  return (
    <div className="page-wrap space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>My Notes & Files</CardTitle>
          <p className="text-sm text-muted-foreground">Private workspace notes stored against your employee profile.</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add note</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="grid gap-1.5 text-sm">
              Title
              <input
                type="text"
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Note
              <textarea
                required
                rows={4}
                value={form.body}
                onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                File URL (optional)
                <input
                  type="url"
                  value={form.fileUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                File Name (optional)
                <input
                  type="text"
                  value={form.fileName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fileName: event.target.value }))}
                />
              </label>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(event) => setForm((prev) => ({ ...prev, isPinned: event.target.checked }))}
              />
              Pin note
            </label>
            <button type="submit" className="primary-btn">Save note</button>
          </form>
          {message ? <p className="mt-3 text-sm">{message}</p> : null}
        </CardContent>
      </Card>

      {loading ? <LoadingState label="Loading notes..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My saved notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">No notes saved yet.</p> : null}
            {rows.map((row) => (
              <Card key={row.id} className="rounded-xl border-border shadow-sm">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{row.title}</p>
                    {row.is_pinned ? <StatusChip label="Pinned" compact tone="info" /> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{row.body}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(row.updated_at).toLocaleString()}</span>
                    {row.file_url ? <a className="secondary-btn" href={row.file_url} target="_blank" rel="noreferrer">{row.file_name ?? "Open file"}</a> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default NotesPageClient;