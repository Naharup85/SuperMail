import { auth } from "@/auth";
import { corsair } from "@/server/corsair";
import { ensureCorsairTenant } from "@/server/tenant";
import { generateOAuthUrl } from "corsair/oauth";
import { NextResponse } from "next/server";
import { rateLimiter, RATE_LIMIT_PRESETS, getRateLimitHeaders } from "@/server/rate-limit";
import { AppLogger } from "@/server/logger";
import { createApiErrorResponse } from "@/server/errors";

export async function GET() {
  const requestId = AppLogger.generateRequestId();
  const session = await auth();

  if (!session?.user?.id) {
    return createApiErrorResponse("Unauthorized", null, {
      status: 401,
      code: "UNAUTHORIZED",
      requestId,
    });
  }

  const userId = session.user.id;
  const rlResult = rateLimiter.check(`oauth_connect_cal_${userId}`, RATE_LIMIT_PRESETS.oauthConnect);
  if (!rlResult.success) {
    return createApiErrorResponse("Too many connection requests. Please wait.", null, {
      status: 429,
      code: "RATE_LIMITED",
      requestId,
      headers: getRateLimitHeaders(rlResult),
    });
  }

  try {
    const tenant = await ensureCorsairTenant(userId);
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/corsair/connect/calendar/callback`;

    const result = await generateOAuthUrl(corsair, "googlecalendar", {
      tenantId: tenant.id,
      redirectUri,
    });

    return NextResponse.json(result, {
      headers: getRateLimitHeaders(rlResult),
    });
  } catch (error) {
    AppLogger.error("Failed to generate Google Calendar OAuth URL", error, { requestId, userId });
    return createApiErrorResponse("Failed to generate OAuth URL", error, {
      status: 500,
      requestId,
    });
  }
}