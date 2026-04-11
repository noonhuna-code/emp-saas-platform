import { createSupabaseAdminServerClient } from "@/lib/server/supabase-admin";

export const websiteInquiryKinds = ["contact", "demo", "workspace_request"] as const;

export type WebsiteInquiryKind = (typeof websiteInquiryKinds)[number];

export type WebsiteInquiryInput = {
  inquiryKind: WebsiteInquiryKind;
  name: string;
  email: string;
  company: string;
  sourcePath: string;
  message?: string | null;
  teamSize?: string | null;
  buyerRole?: string | null;
  buyingTimeline?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  requestIp?: string | null;
  userAgent?: string | null;
};

export const normalizeOptionalText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

export const requireText = (
  value: unknown,
  field: string,
  maxLength: number,
  options?: { email?: boolean }
): string => {
  if (typeof value !== "string") {
    throw new Error(`${field} is required`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }

  if (options?.email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      throw new Error("A valid work email is required");
    }
  }

  return trimmed.slice(0, maxLength);
};

export const createWebsiteInquiry = async (input: WebsiteInquiryInput): Promise<void> => {
  const supabase = createSupabaseAdminServerClient();

  const { error } = await supabase.from("website_inquiries").insert({
    inquiry_kind: input.inquiryKind,
    name: input.name,
    email: input.email,
    company: input.company,
    source_path: input.sourcePath,
    message: input.message ?? null,
    team_size: input.teamSize ?? null,
    buyer_role: input.buyerRole ?? null,
    buying_timeline: input.buyingTimeline ?? null,
    utm_source: input.utmSource ?? null,
    utm_medium: input.utmMedium ?? null,
    utm_campaign: input.utmCampaign ?? null,
    utm_content: input.utmContent ?? null,
    utm_term: input.utmTerm ?? null,
    request_ip: input.requestIp ?? null,
    user_agent: input.userAgent ?? null
  });

  if (error) {
    throw new Error(error.message || "Unable to store website inquiry");
  }
};
