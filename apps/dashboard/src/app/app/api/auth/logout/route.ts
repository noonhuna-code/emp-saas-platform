import { NextResponse } from "next/server";

const redirectToCanonical = (request: Request) =>
  NextResponse.redirect(new URL("/api/auth/logout", request.url), { status: 307 });

export async function GET(request: Request) {
  return redirectToCanonical(request);
}

export async function POST(request: Request) {
  return redirectToCanonical(request);
}

