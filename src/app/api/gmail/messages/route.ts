import { auth } from "@/auth";
import { listGmailMessages } from "@/server/gmail";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";
import { rateLimiter, RATE_LIMIT_PRESETS, getRateLimitHeaders } from "@/server/rate-limit";
import { AppLogger } from "@/server/logger";
import { createApiErrorResponse } from "@/server/errors";

export async function GET(request: Request) {
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
  const tenantId = getTenantId(userId);

  const rlResult = rateLimiter.check(`gmail_list_${userId}`, RATE_LIMIT_PRESETS.apiGeneral);

  const { searchParams } = new URL(request.url);

  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const limit = isNaN(rawLimit) ? 20 : Math.min(100, Math.max(1, rawLimit));

  const rawOffset = Number(searchParams.get("offset") ?? "0");
  const offset = isNaN(rawOffset) ? 0 : Math.max(0, rawOffset);

  const q = searchParams.get("q")?.slice(0, 500) || undefined;
  const folder = searchParams.get("folder")?.slice(0, 50) || undefined;

  try {
    const messages = await listGmailMessages(tenantId, {
      limit,
      offset,
      q,
      folder,
    });
    return NextResponse.json(
      { ...messages, requestId },
      { headers: getRateLimitHeaders(rlResult) },
    );
  } catch (err: unknown) {
    return createApiErrorResponse("Failed to list messages", err, {
      status: 500,
      requestId,
    });
  }
}

