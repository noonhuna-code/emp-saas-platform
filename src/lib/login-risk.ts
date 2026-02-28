import { createHash } from "crypto";

const hashValue = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};

const readHeader = (headers: Headers, name: string): string | null => {
  const value = headers.get(name);
  if (!value) return null;
  return value.trim();
};

export const getIpHash = (request: Request): string | null => {
  const forwarded = readHeader(request.headers, "x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return hashValue(first);
  }
  const realIp = readHeader(request.headers, "x-real-ip");
  if (realIp) return hashValue(realIp);
  const cfIp = readHeader(request.headers, "cf-connecting-ip");
  if (cfIp) return hashValue(cfIp);
  return null;
};

export const getEmailHash = (email: string): string | null => {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;
  return hashValue(trimmed);
};

const normalizeCountry = (value: string): string | null => {
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(trimmed)) return null;
  return trimmed;
};

export const getGeoCountry = (request: Request): string | null => {
  const vercel = readHeader(request.headers, "x-vercel-ip-country");
  if (vercel) return normalizeCountry(vercel);
  const cloudflare = readHeader(request.headers, "cf-ipcountry");
  if (cloudflare) return normalizeCountry(cloudflare);
  const fallback = readHeader(request.headers, "x-country-code");
  if (fallback) return normalizeCountry(fallback);
  return null;
};
