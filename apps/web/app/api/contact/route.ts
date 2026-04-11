import { NextResponse } from "next/server";
import {
  createWebsiteInquiry,
  normalizeOptionalText,
  requireText,
  websiteInquiryKinds,
  type WebsiteInquiryKind
} from "@/lib/server/website-inquiries";

const inquiryKindSet = new Set<string>(websiteInquiryKinds);

const badRequest = (message: string, status = 400) =>
  NextResponse.json({ ok: false, error: message }, { status });

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const honeypot = normalizeOptionalText(body.website, 200);
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    const rawKind = typeof body.kind === "string" ? body.kind.trim() : "";
    if (!inquiryKindSet.has(rawKind)) {
      return badRequest("Unsupported inquiry type");
    }

    const inquiryKind = rawKind as WebsiteInquiryKind;
    const name = requireText(body.name, "Name", 120);
    const email = requireText(body.email, "Work email", 160, { email: true });
    const company = requireText(body.company, "Company", 160);
    const sourcePath = requireText(body.sourcePath, "Source path", 260);
    const message = normalizeOptionalText(body.message, 4000);
    const teamSize = normalizeOptionalText(body.teamSize, 60);
    const buyerRole = normalizeOptionalText(body.buyerRole, 120);
    const buyingTimeline = normalizeOptionalText(body.timeline, 120);

    if ((inquiryKind === "demo" || inquiryKind === "contact") && !message) {
      return badRequest("Message is required for demo and contact requests");
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const requestIp = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = normalizeOptionalText(request.headers.get("user-agent"), 512);

    await createWebsiteInquiry({
      inquiryKind,
      name,
      email,
      company,
      sourcePath,
      message,
      teamSize,
      buyerRole,
      buyingTimeline,
      utmSource: normalizeOptionalText(body.utmSource, 240),
      utmMedium: normalizeOptionalText(body.utmMedium, 240),
      utmCampaign: normalizeOptionalText(body.utmCampaign, 240),
      utmContent: normalizeOptionalText(body.utmContent, 240),
      utmTerm: normalizeOptionalText(body.utmTerm, 240),
      requestIp,
      userAgent
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit your request right now";

    return badRequest(message, 500);
  }
}
