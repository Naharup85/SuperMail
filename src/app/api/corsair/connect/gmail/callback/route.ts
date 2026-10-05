import { corsair } from "@/server/corsair";
import { processOAuthCallback } from "corsair/oauth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/?error=missing_oauth_params", baseUrl),
    );
  }

  const redirectUri =
    `${baseUrl}/api/corsair/connect/gmail/callback`;

  try {
    await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri,
    });

    return NextResponse.redirect(
      new URL("/?connected=gmail", baseUrl),
    );
  } catch (error) {
    console.error("Gmail OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=oauth_failed", baseUrl),
    );
  }
}