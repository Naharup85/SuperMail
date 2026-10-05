import { NextResponse } from "next/server";
import { claimDueAutomations } from "@/server/automations/repository";
import { executeAutomation } from "@/server/automations/runner";

function verifyCronAuthorization(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.AUTH_SECRET || "supermail-cron-secret-2026";
  const authHeader = request.headers.get("authorization");
  const xSecretHeader = request.headers.get("x-cron-secret");

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  if (xSecretHeader && xSecretHeader === cronSecret) {
    return true;
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === cronSecret) return true;
  }

  if (querySecret && querySecret === cronSecret) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  if (!verifyCronAuthorization(request)) {
    return NextResponse.json({ error: "Unauthorized cron trigger." }, { status: 401 });
  }

  const now = new Date();

  try {
    // 1. Claim due automations atomically with concurrency locking
    const dueAutomations = await claimDueAutomations(now, 10);

    if (dueAutomations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No automations due for execution.",
        executedCount: 0,
      });
    }

    // 2. Execute due automations in parallel with error isolation
    const results = await Promise.allSettled(
      dueAutomations.map((automation) => executeAutomation(automation)),
    );

    const summary = results.map((r, i) => {
      const auto = dueAutomations[i];
      if (r.status === "fulfilled") {
        return {
          automationId: auto.id,
          name: auto.name,
          status: r.value.status,
          summary: r.value.summary,
        };
      } else {
        return {
          automationId: auto.id,
          name: auto.name,
          status: "failed",
          error: r.reason instanceof Error ? r.reason.message : "Execution failed",
        };
      }
    });

    return NextResponse.json({
      success: true,
      executedCount: dueAutomations.length,
      results: summary,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Cron runner failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
