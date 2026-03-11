"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSupervisorFeedback, submitSupervisorFeedback } from "@/lib/client/api";
import type { SupervisorFeedbackItem, SupervisorFeedbackInput } from "@/lib/types/intelligence";
import { SupervisorFeedbackForm } from "@/components/intelligence/SupervisorFeedbackForm";
import { SupervisorFeedbackTimeline } from "@/components/intelligence/SupervisorFeedbackTimeline";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

export const FeedbackPageClient = ({ canSubmit }: { canSubmit: boolean }) => {
  const [feedback, setFeedback] = useState<SupervisorFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSupervisorFeedback();
      if (!result.ok || !result.data) {
        setError(result.error ?? "Unable to load feedback");
        setFeedback([]);
        return;
      }
      setFeedback(result.data.feedback ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load feedback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = useCallback(async (payload: SupervisorFeedbackInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitSupervisorFeedback(payload);
      if (!result.ok) {
        setError(result.error ?? "Feedback submission failed");
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [load]);

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Supervisor Feedback</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Structured feedback captured by managers. Immutable once submitted.
        </p>
      </section>

      {loading ? <LoadingState label="Loading feedback..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <>
          {canSubmit ? <SupervisorFeedbackForm onSubmit={handleSubmit} loading={submitting} /> : null}
          <SupervisorFeedbackTimeline feedback={feedback} />
        </>
      ) : null}
    </div>
  );
};
