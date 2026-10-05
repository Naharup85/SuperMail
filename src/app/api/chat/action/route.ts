import { auth } from "@/auth";
import { getTenantId } from "@/server/tenant";
import {
  validateAndConsumeAction,
  cancelPendingAction,
} from "@/server/agent/action-security";
import { executeConfirmedAction } from "@/server/agent/executor";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 1. Authenticate user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to confirm actions." },
        { status: 401 },
      );
    }

    // 2. Validate request payload
    let body: { actionId?: string; confirmationToken?: string; cancel?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload in request." },
        { status: 400 },
      );
    }

    const { actionId, confirmationToken, cancel } = body;

    if (!actionId || typeof actionId !== "string") {
      return NextResponse.json(
        { error: "Missing required 'actionId'." },
        { status: 400 },
      );
    }

    // 3. Handle action cancellation
    if (cancel) {
      const cancelResult = cancelPendingAction(actionId, session.user.id);
      if (!cancelResult.success) {
        return NextResponse.json(
          { error: cancelResult.error || "Failed to cancel action." },
          { status: 403 },
        );
      }

      return NextResponse.json({
        success: true,
        status: "cancelled",
        actionId,
        message: "Action was cancelled.",
      });
    }

    // 4. Validate confirmation token is present
    if (!confirmationToken || typeof confirmationToken !== "string") {
      return NextResponse.json(
        { error: "Missing required 'confirmationToken'." },
        { status: 400 },
      );
    }

    // 5. Derive tenantId strictly from authenticated session
    const tenantId = getTenantId(session.user.id);

    // 6. Validate token signature, expiration, user ownership, and replay protection
    const validation = await validateAndConsumeAction(
      actionId,
      session.user.id,
      tenantId,
      confirmationToken,
    );

    if (!validation.valid || !validation.payload) {
      return NextResponse.json(
        { error: validation.error || "Invalid or expired confirmation token." },
        { status: 400 },
      );
    }

    // 7. Execute the confirmed action with Corsair
    const execution = await executeConfirmedAction(validation.payload, tenantId);

    // 8. Return successful execution response
    return NextResponse.json({
      success: true,
      status: "executed",
      actionId,
      actionType: validation.payload.action,
      message: execution.message,
      data: execution.data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to execute confirmed action";
    console.error("[ActionAPI] Execution error:", message);

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
