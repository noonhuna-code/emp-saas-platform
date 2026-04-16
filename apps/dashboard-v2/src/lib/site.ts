const normalizeAbsoluteUrl = (value: string | undefined | null): string | null => {
  const raw = value?.trim();
  if (!raw) return null;
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
};

export const publicWebsiteUrl =
  normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
  "https://emp-saas-platform.vercel.app";

export const productOwnerContact = {
  name: "Muhammad Umair",
  phone: "03106598623",
  email: "noonhuna@gmail.com",
} as const;

const createUrl = (path: string, baseUrl = publicWebsiteUrl) => {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return new URL(safePath, baseUrl);
};

export const buildPublicWebsiteUrl = (path = "/", searchParams?: Record<string, string | null | undefined>) => {
  const url = createUrl(path);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string" && value.length > 0) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
};

export const resolveSafeExternalReturnTo = (rawValue: string | null | undefined, fallbackPath = "/sign-in"): string => {
  const fallbackUrl = createUrl(fallbackPath);
  const value = rawValue?.trim();

  if (!value) {
    return fallbackUrl.toString();
  }

  try {
    const candidate = new URL(value);
    if (candidate.origin !== fallbackUrl.origin) {
      return fallbackUrl.toString();
    }

    return candidate.toString();
  } catch {
    return fallbackUrl.toString();
  }
};
