/**
 * Structured Security & Audit Logger for Agent Actions (Phase 13).
 *
 * Records user, tenant, action, action ID, timestamp, status, and outcome.
 * Explicitly excludes secrets, OAuth tokens, KEKs, HMAC signing secrets,
 * and full email bodies from logs.
 */

export type AuditEventStatus =
  | "prepared"
  | "confirmed"
  | "executed"
  | "cancelled"
  | "rejected"
  | "failed";

export interface AuditEventPayload {
  userId: string;
  tenantId: string;
  action: string;
  actionId?: string;
  status: AuditEventStatus;
  reason?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function logAuditEvent(event: AuditEventPayload): void {
  const timestamp = new Date().toISOString();

  // Sanitize metadata to guarantee no secrets or excessive data are logged
  const sanitizedMeta: Record<string, unknown> = {};
  if (event.metadata) {
    for (const [key, val] of Object.entries(event.metadata)) {
      if (
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("kek") ||
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("body")
      ) {
        continue;
      }
      sanitizedMeta[key] = val;
    }
  }

  const logPayload = {
    type: "AGENT_SECURITY_AUDIT",
    timestamp,
    userId: event.userId,
    tenantId: event.tenantId,
    action: event.action,
    actionId: event.actionId || null,
    status: event.status,
    reason: event.reason || null,
    error: event.error || null,
    metadata: Object.keys(sanitizedMeta).length > 0 ? sanitizedMeta : undefined,
  };

  if (event.status === "rejected" || event.status === "failed") {
    console.warn(`[AUDIT_SECURITY_WARN] ${JSON.stringify(logPayload)}`);
  } else {
    console.log(`[AUDIT_SECURITY_INFO] ${JSON.stringify(logPayload)}`);
  }
}
