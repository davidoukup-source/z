import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { buildAuthUrl } from "@/lib/google/oauth";

// Lance le flux OAuth Google (agenda + Gmail en lecture seule).
export async function GET() {
  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(buildAuthUrl(state));
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });
  return response;
}
