import { createHash } from "crypto";

const hashValue = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};

const readHeader = (headers: Headers, name: string): string | null => {
  const value = headers.get(name);
  if (!value) return null;
  return value.trim();
};

export const getDeviceFingerprintHash = (request: Request): string | null => {
  const headerFingerprint = readHeader(request.headers, "x-device-fingerprint");
  if (headerFingerprint) {
    return hashValue(headerFingerprint);
  }

  const userAgent = readHeader(request.headers, "user-agent") ?? "";
  const acceptLanguage = readHeader(request.headers, "accept-language") ?? "";
  const fallback = `${userAgent}|${acceptLanguage}`.trim();

  if (!fallback) {
    return null;
  }

  return hashValue(fallback);
};
