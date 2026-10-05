import crypto from "crypto";
import type {
  HighImpactActionType,
  PendingActionPayload,
  ActionPreview,
} from "@/types/agent-actions";

/**
 * Action validity duration: 10 minutes.
 */
export const ACTION_EXPIRATION_MS = 10 * 60 * 1000;

function getSigningSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.CORSAIR_KEK ||
    "supermail-secure-action-signing-secret-key-32b";
  return secret;
}

// In-memory store to prevent replay attacks and track action status
// Keys: actionId -> { status: "pending" | "consumed" | "cancelled", expiresAt: number, userId: string, tenantId: string }
interface ActionRecord {
  status: "pending" | "consumed" | "cancelled";
  expiresAt: number;
  userId: string;
  tenantId: string;
  action: HighImpactActionType;
}

const actionStore = new Map<string, ActionRecord>();

// Periodically clean up expired action records (every 5 minutes)
if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, record] of actionStore.entries()) {
      if (record.expiresAt < now) {
        actionStore.delete(id);
      }
    }
  }, 5 * 60 * 1000);

  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }
}

/**
 * Creates a cryptographically signed HMAC token for a pending action.
 */
export function createSignedConfirmationToken(payload: PendingActionPayload): string {
  const secret = getSigningSecret();
  const serialized = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(serialized)
    .digest("base64url");

  return `${serialized}.${signature}`;
}

/**
 * Verifies the cryptographic signature and format of a confirmation token.
 */
export function verifyConfirmationToken(
  token: string,
): { valid: boolean; payload?: PendingActionPayload; error?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing or invalid confirmation token format." };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed confirmation token." };
  }

  const [serialized, signature] = parts;
  const secret = getSigningSecret();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(serialized)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    return { valid: false, error: "Invalid token signature. Token may have been tampered with." };
  }

  try {
    const jsonStr = Buffer.from(serialized, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr) as PendingActionPayload;

    if (!payload.id || !payload.tenantId || !payload.userId || !payload.action || !payload.expiresAt) {
      return { valid: false, error: "Invalid token payload structure." };
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: "Confirmation token has expired." };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Failed to decode confirmation token payload." };
  }
}

/**
 * Registers a new pending action on the server.
 */
export function registerPendingAction(params: {
  userId: string;
  tenantId: string;
  action: HighImpactActionType;
  actionParams: Record<string, unknown>;
  preview: ActionPreview;
}): { actionId: string; confirmationToken: string; payload: PendingActionPayload } {
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + ACTION_EXPIRATION_MS;

  const payload: PendingActionPayload = {
    id,
    tenantId: params.tenantId,
    userId: params.userId,
    action: params.action,
    params: params.actionParams,
    preview: params.preview,
    createdAt: now,
    expiresAt,
  };

  actionStore.set(id, {
    status: "pending",
    expiresAt,
    userId: params.userId,
    tenantId: params.tenantId,
    action: params.action,
  });

  const confirmationToken = createSignedConfirmationToken(payload);

  return {
    actionId: id,
    confirmationToken,
    payload,
  };
}

/**
 * Validates that an action is valid, owned by the user, unexpired, and not yet consumed.
 * Consumes the action immediately to prevent replay attacks.
 */
export function validateAndConsumeAction(
  actionId: string,
  userId: string,
  tenantId: string,
  token: string,
): { valid: boolean; payload?: PendingActionPayload; error?: string } {
  // 1. Verify token signature and unexpired state
  const tokenVerification = verifyConfirmationToken(token);
  if (!tokenVerification.valid || !tokenVerification.payload) {
    return { valid: false, error: tokenVerification.error || "Invalid confirmation token." };
  }

  const payload = tokenVerification.payload;

  // 2. ID consistency check
  if (payload.id !== actionId) {
    return { valid: false, error: "Action ID mismatch." };
  }

  // 3. Strict User and Tenant boundary check
  if (payload.userId !== userId) {
    return { valid: false, error: "Action does not belong to the authenticated user." };
  }

  if (payload.tenantId !== tenantId) {
    return { valid: false, error: "Tenant authorization mismatch." };
  }

  // 4. Server-side replay prevention check
  const record = actionStore.get(actionId);
  if (!record) {
    // If action is not in store, treat as already expired or consumed
    return { valid: false, error: "Action has expired or has already been executed." };
  }

  if (record.status === "consumed") {
    return { valid: false, error: "Action has already been executed (replay prevented)." };
  }

  if (record.status === "cancelled") {
    return { valid: false, error: "Action was previously cancelled." };
  }

  if (record.userId !== userId || record.tenantId !== tenantId) {
    return { valid: false, error: "Action authorization mismatch." };
  }

  // Mark action as consumed
  record.status = "consumed";
  actionStore.set(actionId, record);

  return { valid: true, payload };
}

/**
 * Cancels a pending action.
 */
export function cancelPendingAction(
  actionId: string,
  userId: string,
): { success: boolean; error?: string } {
  const record = actionStore.get(actionId);
  if (!record) {
    return { success: true }; // Already gone
  }

  if (record.userId !== userId) {
    return { success: false, error: "Unauthorized to cancel this action." };
  }

  record.status = "cancelled";
  actionStore.set(actionId, record);
  return { success: true };
}
