"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveAttendanceCorrectionRequest,
  approveLeaveRequest,
  fetchUnifiedApprovals,
  rejectAttendanceCorrectionRequest,
  rejectLeaveRequest
} from "@/lib/client/api";
import type { UnifiedApprovalItem } from "@/lib/types/approvals";
import { UnifiedApprovalsTable } from "@/components/approvals/UnifiedApprovalsTable";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

export const ApprovalsPageClient = () => {
  const [items, setItems] = useState<UnifiedApprovalItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "leave" | "attendance">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUnifiedApprovals();
      if (!result.ok || !result.data) {
        setError(result.error ?? "Unable to load approvals");
        setItems([]);
        return;
      }
      setItems(result.data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = useCallback(async (item: UnifiedApprovalItem) => {
    setBusy(true);
    setError(null);
    try {
      if (item.type === "leave") {
        const result = await approveLeaveRequest(item.id);
        if (!result.ok) {
          setError(result.error ?? "Leave approval failed");
        }
      } else {
        const result = await approveAttendanceCorrectionRequest(item.id);
        if (!result.ok) {
          setError(result.error ?? "Attendance approval failed");
        }
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const handleReject = useCallback(async (item: UnifiedApprovalItem, reason?: string) => {
    setBusy(true);
    setError(null);
    try {
      if (item.type === "leave") {
        const result = await rejectLeaveRequest(item.id, reason ?? "");
        if (!result.ok) {
          setError(result.error ?? "Leave rejection failed");
        }
      } else {
        const result = await rejectAttendanceCorrectionRequest(item.id, reason ?? "");
        if (!result.ok) {
          setError(result.error ?? "Attendance rejection failed");
        }
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setBusy(false);
    }
  }, [load]);

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Approvals</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Unified approvals for leave and attendance corrections.
        </p>
      </section>

      {loading ? <LoadingState label="Loading approvals..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error ? (
        <UnifiedApprovalsTable
          items={items}
          onApprove={handleApprove}
          onReject={handleReject}
          busy={busy}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />
      ) : null}
    </div>
  );
};
