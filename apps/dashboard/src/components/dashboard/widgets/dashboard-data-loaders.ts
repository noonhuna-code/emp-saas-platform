"use client";

import {
  fetchAdminDashboard,
  fetchBillingOverview,
  fetchManagerDashboard,
  fetchPayrollRuns,
  fetchPayslipHistory
} from "@/lib/client/api";
import type { BillingOverview } from "@/lib/types/billing";
import type { AdminDashboardResponse, ManagerDashboardResponse } from "@/lib/types/dashboard";
import type { PayrollRunsResponse, PayslipHistoryResponse } from "@/lib/types/payroll";

type CacheState<T> = {
  value: T | null;
  ts: number;
  promise?: Promise<T | null>;
};

const createLoader = <T>(loadFn: () => Promise<T | null>, ttlMs = 30000) => {
  const cache: CacheState<T> = {
    value: null,
    ts: 0,
    promise: undefined
  };

  return async (): Promise<T | null> => {
    const now = Date.now();

    if (cache.value && now - cache.ts <= ttlMs) {
      return cache.value;
    }

    if (cache.promise) {
      return cache.promise;
    }

    const promise = loadFn()
      .then((value) => {
        if (value) {
          cache.value = value;
          cache.ts = Date.now();
        }
        return value;
      })
      .finally(() => {
        cache.promise = undefined;
      });

    cache.promise = promise;
    return promise;
  };
};

export const loadManagerDashboardData = createLoader<ManagerDashboardResponse>(async () => {
  const result = await fetchManagerDashboard();
  return result.ok && result.data ? result.data : null;
});

export const loadAdminDashboardData = createLoader<AdminDashboardResponse>(async () => {
  const result = await fetchAdminDashboard();
  return result.ok && result.data ? result.data : null;
});

export const loadBillingOverviewData = createLoader<BillingOverview>(async () => {
  const result = await fetchBillingOverview();
  return result.ok && result.data ? result.data : null;
});

export const loadPayrollRunsData = createLoader<PayrollRunsResponse>(async () => {
  const result = await fetchPayrollRuns({ limit: 8 });
  return result.ok && result.data ? result.data : null;
});

export const loadPayslipHistoryData = createLoader<PayslipHistoryResponse>(async () => {
  const result = await fetchPayslipHistory({ page: 1, pageSize: 10 });
  return result.ok && result.data ? result.data : null;
});
