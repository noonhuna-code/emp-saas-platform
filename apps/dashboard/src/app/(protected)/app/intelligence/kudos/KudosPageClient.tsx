"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchKudosHistory, fetchKudosLeaderboards, sendKudos } from "@/lib/client/api";
import type { KudosHistoryResponse, KudosInput, KudosItem, KudosLeaderboardResponse } from "@/lib/types/intelligence";
import { KudosSendForm } from "@/components/intelligence/KudosSendForm";
import { KudosHistoryTable } from "@/components/intelligence/KudosHistoryTable";
import { KudosLeaderboardTable } from "@/components/intelligence/KudosLeaderboardTable";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

export const KudosPageClient = () => {
  const [history, setHistory] = useState<KudosItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<KudosLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyResult, leaderboardResult] = await Promise.all([
        fetchKudosHistory(),
        fetchKudosLeaderboards()
      ]);

      if (!historyResult.ok || !historyResult.data) {
        setError(historyResult.error ?? "Unable to load kudos history");
        setHistory([]);
      } else {
        setHistory((historyResult.data as KudosHistoryResponse).kudos ?? []);
      }

      if (!leaderboardResult.ok || !leaderboardResult.data) {
        setError(leaderboardResult.error ?? "Unable to load kudos leaderboard");
        setLeaderboard(null);
      } else {
        setLeaderboard(leaderboardResult.data as KudosLeaderboardResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load kudos data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = useCallback(async (payload: KudosInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await sendKudos(payload);
      if (!result.ok) {
        setError(result.error ?? "Kudos submission failed");
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kudos submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [load]);

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Kudos</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Peer recognition with monthly limits enforced at the database layer.
        </p>
      </section>

      {loading ? <LoadingState label="Loading kudos..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <>
          <KudosSendForm onSubmit={handleSubmit} loading={submitting} />
          <KudosHistoryTable items={history} />
          {leaderboard ? <KudosLeaderboardTable leaderboard={leaderboard} /> : null}
        </>
      ) : null}
    </div>
  );
};
