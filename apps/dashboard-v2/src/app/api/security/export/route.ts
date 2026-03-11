import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { exportSecurityAudit, recordSecurityExportEvent } from "@emp/services/security.service";
import { enforceRateLimit } from "@emp/lib/rate-limit";

const sanitizeCsvValue = (text: string): string => {
  const trimmed = text.trimStart();
  if (!trimmed) return text;
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${text}`;
  }
  return text;
};

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  const safe = sanitizeCsvValue(raw);
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
};

const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    return "event_type,company_id,profile_id,risk_score,details,created_at\n";
  }
  const headers = [
    "event_type",
    "company_id",
    "profile_id",
    "risk_score",
    "details",
    "created_at"
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    const line = headers.map((key) => escapeCsv(row[key] ?? "")).join(",");
    lines.push(line);
  }
  return `${lines.join("\n")}\n`;
};

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/security/export";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const format = (url.searchParams.get("format") ?? "json").toLowerCase();
    const limit = Math.min(Math.max(Number(limitRaw ?? 1000) || 1000, 1), 5000);

    const rate = await enforceRateLimit(route.ctx, endpoint, { windowSeconds: 60, limit: 30 });
    if (!rate.allowed) {
      return finalizeRoute(route, endpoint, jsonError("Too many requests. Please try again later.", 429, route.requestId));
    }

    const result = await exportSecurityAudit(route.ctx, { from, to, limit });
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to export security audit"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    const rows = result.data?.rows ?? [];
    try {
      await recordSecurityExportEvent(route.ctx, { format, rowCount: rows.length, from, to });
    } catch {
      // Best-effort audit logging; do not fail export.
    }
    if (format === "csv") {
      const csv = toCsv(rows as Record<string, unknown>[]);
      const response = new NextResponse(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": "attachment; filename=security-audit.csv"
        }
      });
      return finalizeRoute(route, endpoint, response);
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: rows }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to export security audit", route.requestId));
  }
}
