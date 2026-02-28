import { NextResponse } from "next/server";
import { getRequestId } from "./request-id";

export const mapServiceErrorStatus = (error?: string): number => {
  if (!error) return 500;
  if (error.startsWith("Missing permission:")) return 403;
  if (error === "Permission denied") return 403;
  if (error === "Authentication required") return 401;
  if (error.toLowerCase().includes("not found")) return 404;
  if (error.toLowerCase().includes("already processed")) return 409;
  if (error.toLowerCase().includes("being processed")) return 409;
  if (error.toLowerCase().includes("conflict")) return 409;
  return 400;
};

export const sanitizeServiceError = (error?: string, fallback = "Request failed"): string => {
  if (!error) return fallback;
  if (error.toLowerCase().includes("jwt")) return "Authentication required";
  if (error.toLowerCase().includes("permission")) return "Permission denied";
  return fallback;
};

export const jsonError = (message: string, status = 400, requestId?: string) => {
  const id = requestId ?? getRequestId();
  return NextResponse.json(
    { ok: false, error: message, requestId: id },
    { status, headers: { "x-request-id": id } }
  );
};

export const isUnauthenticatedError = (error: unknown): boolean => {
  return error instanceof Error && error.message === "Authenticated company-scoped session required";
};

export const isPermissionError = (error: unknown): boolean => {
  return error instanceof Error && error.message.startsWith("Missing permission:");
};

export const handleRouteError = (error: unknown, fallbackMessage: string, requestId?: string) => {
  if (isUnauthenticatedError(error)) {
    return jsonError("Authentication required", 401, requestId);
  }
  if (isPermissionError(error)) {
    return jsonError("Permission denied", 403, requestId);
  }
  return jsonError(fallbackMessage, 500, requestId);
};
