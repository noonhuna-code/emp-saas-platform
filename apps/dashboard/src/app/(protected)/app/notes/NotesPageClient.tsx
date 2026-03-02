"use client";

import { useEffect, useState } from "react";
import { createWorkspaceNote, fetchWorkspaceNotes } from "@/lib/client/api";
import type { WorkspaceNote } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

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
    <div className="page-wrap page-grid">
      <section className="card stack">
        <h1>My Notes & Files</h1>
        <p className="muted">Private workspace notes stored against your employee profile.</p>
      </section>

      <section className="card stack">
        <h3>Add note</h3>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Title
            <input
              type="text"
              required
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </label>
          <label>
            Note
            <textarea
              required
              rows={4}
              value={form.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            />
          </label>
          <div className="form-grid form-grid--two">
            <label>
              File URL (optional)
              <input
                type="url"
                value={form.fileUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
              />
            </label>
            <label>
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
        {message ? <p>{message}</p> : null}
      </section>

      {loading ? <LoadingState label="Loading notes..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <section className="card stack">
          <h3>My saved notes</h3>
          {rows.length === 0 ? <p className="muted">No notes saved yet.</p> : null}
          {rows.map((row) => (
            <article key={row.id} className="card card--nested stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{row.title}</strong>
                {row.is_pinned ? <span className="tag">Pinned</span> : null}
              </div>
              <p className="muted">{row.body}</p>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12 }}>{new Date(row.updated_at).toLocaleString()}</span>
                {row.file_url ? <a className="secondary-btn" href={row.file_url} target="_blank" rel="noreferrer">{row.file_name ?? "Open file"}</a> : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
};

export default NotesPageClient;
