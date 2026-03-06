"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { fetchWorkspaceChat } from "@/lib/client/api";
import type { WorkspaceChatMessage } from "@/lib/types/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/SkeletonBlocks";

const formatTime = (value: string) => {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function EmployeeChatPreviewWidget() {
  const [rows, setRows] = useState<WorkspaceChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchWorkspaceChat({ limit: 6 })
      .then((result) => {
        if (!active) return;
        setRows(result.ok && result.data ? result.data.rows ?? [] : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <SkeletonList rows={4} />;
  }

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-lg">Chat preview</CardTitle>
        <CardDescription>Recent team messages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {rows.length === 0 ? (
          <EmptyState title="No chat messages yet" subtitle="Start a conversation from team chat." compact />
        ) : (
          rows.slice(0, 4).map((row) => (
            <div key={row.id} className="flex items-start gap-3 rounded-xl border border-border px-3 py-2.5">
              <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.message_text}</p>
                <p className="text-xs text-muted-foreground">{row.direction === "out" ? "You" : row.sender_name ?? "Teammate"}</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatTime(row.created_at)}</span>
            </div>
          ))
        )}

        <div className="flex justify-end">
          <Link href="/app/chat" className="secondary-btn">Open chat</Link>
        </div>
      </CardContent>
    </Card>
  );
}
