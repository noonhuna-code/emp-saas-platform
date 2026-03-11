"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchEmployeeReliabilityCard, fetchReliabilityOverview } from "@/lib/client/api";
import type { EmployeeReliabilityCard, ReliabilityOverview } from "@/lib/types/intelligence";
import { ReliabilitySummaryCard } from "@/components/intelligence/ReliabilitySummaryCard";
import { ReliabilityRankingTable } from "@/components/intelligence/ReliabilityRankingTable";
import { EmployeeReliabilityCard as EmployeeReliabilityCardView } from "@/components/intelligence/EmployeeReliabilityCard";
import { DepartmentReliabilityTable } from "@/components/intelligence/DepartmentReliabilityTable";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

export const ReliabilityPageClient = () => {
  const [overview, setOverview] = useState<ReliabilityOverview | null>(null);
  const [employeeCard, setEmployeeCard] = useState<EmployeeReliabilityCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, employeeResult] = await Promise.all([
        fetchReliabilityOverview(),
        fetchEmployeeReliabilityCard()
      ]);

      if (!overviewResult.ok || !overviewResult.data) {
        setError(overviewResult.error ?? "Unable to load reliability overview");
        setOverview(null);
      } else {
        setOverview(overviewResult.data);
      }

      if (!employeeResult.ok || !employeeResult.data) {
        setEmployeeCard(null);
      } else {
        setEmployeeCard(employeeResult.data.card ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reliability overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Reliability</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          90-day reliability leaderboard and company trends.
        </p>
      </section>

      {loading ? <LoadingState label="Loading reliability..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && overview ? (
        <>
          <ReliabilitySummaryCard overview={overview} />
          <EmployeeReliabilityCardView card={employeeCard} />
          <DepartmentReliabilityTable overview={overview} />
          <ReliabilityRankingTable rows={overview.ranking} />
        </>
      ) : null}
    </div>
  );
};
