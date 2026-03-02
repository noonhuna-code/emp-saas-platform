"use client";

import { useEffect, useState } from "react";
import { fetchWorkspaceResources } from "@/lib/client/api";
import type { WorkspaceResource } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

const ResourcesPageClient = () => {
  const [rows, setRows] = useState<WorkspaceResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchWorkspaceResources()
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load resources");
          return;
        }
        setRows(result.data.rows);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load resources");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-wrap page-grid">
      <section className="card stack">
        <h1>SOPs & Resources</h1>
        <p className="muted">Company knowledge base, policy documents, and operational guides.</p>
      </section>

      {loading ? <LoadingState label="Loading resources..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <section className="card stack">
          {rows.length === 0 ? <p className="muted">No resources published yet.</p> : null}
          {rows.map((row) => (
            <article key={row.id} className="card card--nested stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{row.title}</strong>
                <span className="tag">{row.resource_type.toUpperCase()}</span>
              </div>
              {row.summary ? <p className="muted">{row.summary}</p> : null}
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12 }}>{new Date(row.created_at).toLocaleString()}</span>
                <div className="row">
                  {row.link_url ? <a className="secondary-btn" href={row.link_url} target="_blank" rel="noreferrer">Open link</a> : null}
                  {row.file_url ? <a className="secondary-btn" href={row.file_url} target="_blank" rel="noreferrer">Download file</a> : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
};

export default ResourcesPageClient;
