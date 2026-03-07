"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

const isPerfEnabled = process.env.NODE_ENV === "development";

const readMeasureDuration = (measureName: string): number | null => {
  if (typeof window === "undefined" || !("performance" in window)) return null;
  try {
    const entries = performance.getEntriesByName(measureName, "measure");
    const entry = entries[entries.length - 1];
    if (!entry) return null;
    return Math.round(entry.duration);
  } catch {
    return null;
  }
};

export const useDashboardPerf = (role: string) => {
  const routeRef = useRef<string>("");
  const statsRef = useRef<{ mount?: number; kpi?: number; charts?: number }>({});
  const instanceId = useMemo(() => `${role}-${Math.random().toString(36).slice(2, 8)}`, [role]);

  const flushLog = useCallback(() => {
    if (!isPerfEnabled || typeof window === "undefined") return;
    const route = routeRef.current || window.location.pathname;
    const { mount, kpi, charts } = statsRef.current;
    console.debug(
      `[dashboard_perf] role=${role} route=${route} mount=${mount ?? "-"}ms kpi=${kpi ?? "-"}ms charts=${charts ?? "-"}ms`
    );
  }, [role]);

  useEffect(() => {
    if (!isPerfEnabled || typeof window === "undefined" || !("performance" in window)) return;

    routeRef.current = window.location.pathname;
    const markBase = `dashboard_perf:${instanceId}`;
    performance.mark(`${markBase}:mount_start`);

    const rafId = window.requestAnimationFrame(() => {
      performance.mark(`${markBase}:mount_end`);
      performance.measure(`${markBase}:dashboard_mount`, `${markBase}:mount_start`, `${markBase}:mount_end`);
      const duration = readMeasureDuration(`${markBase}:dashboard_mount`);
      if (duration !== null) {
        statsRef.current.mount = duration;
        flushLog();
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [flushLog, instanceId]);

  const markKpiRendered = useCallback(() => {
    if (!isPerfEnabled || typeof window === "undefined" || !("performance" in window)) return;
    if (statsRef.current.kpi !== undefined) return;

    const markBase = `dashboard_perf:${instanceId}`;
    performance.mark(`${markBase}:kpi_end`);
    performance.measure(`${markBase}:kpi_render`, `${markBase}:mount_start`, `${markBase}:kpi_end`);
    const duration = readMeasureDuration(`${markBase}:kpi_render`);
    if (duration !== null) {
      statsRef.current.kpi = duration;
      flushLog();
    }
  }, [flushLog, instanceId]);

  const markChartsLoaded = useCallback(() => {
    if (!isPerfEnabled || typeof window === "undefined" || !("performance" in window)) return;
    if (statsRef.current.charts !== undefined) return;

    const markBase = `dashboard_perf:${instanceId}`;
    performance.mark(`${markBase}:charts_end`);
    performance.measure(`${markBase}:charts_loaded`, `${markBase}:mount_start`, `${markBase}:charts_end`);
    const duration = readMeasureDuration(`${markBase}:charts_loaded`);
    if (duration !== null) {
      statsRef.current.charts = duration;
      flushLog();
    }
  }, [flushLog, instanceId]);

  return {
    markKpiRendered,
    markChartsLoaded
  };
};

export const DashboardPerfMarker = ({ onReady }: { onReady: () => void }) => {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return null;
};
