"use client";

import { useEffect, useState } from "react";
import { fetchWorkspaceResources, peekCachedResult } from "@/lib/client/api";
import type { WorkspaceResource } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/StatusChip";

const ResourcesPageClient = () => {
  const cachedResources = peekCachedResult<{ rows: WorkspaceResource[] }>("/api/workspace/resources?limit=50");
  const [rows, setRows] = useState<WorkspaceResource[]>(cachedResources?.ok ? (cachedResources.data?.rows ?? []) : []);
  const [loading, setLoading] = useState(!(cachedResources?.ok && cachedResources.data));
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
    <div className="page-wrap space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>SOPs & Resources</CardTitle>
          <p className="text-sm text-muted-foreground">Company knowledge base, policy documents, and operational guides.</p>
        </CardHeader>
      </Card>

      {loading ? <LoadingState label="Loading resources..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">No resources published yet.</p> : null}
            {rows.map((row) => (
              <Card key={row.id} className="rounded-xl border-border shadow-sm">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{row.title}</p>
                    <StatusChip label={row.resource_type.toUpperCase()} compact />
                  </div>
                  {row.summary ? <p className="text-sm text-muted-foreground">{row.summary}</p> : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      {row.link_url ? <a className="secondary-btn" href={row.link_url} target="_blank" rel="noreferrer">Open link</a> : null}
                      {row.file_url ? <a className="secondary-btn" href={row.file_url} target="_blank" rel="noreferrer">Download file</a> : null}
                    </div>
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

export default ResourcesPageClient;
