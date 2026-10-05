/**
 * Comprehensive Automated Test Suite for Phase 13:
 * Agent Permissions & Confirmation Policies Security & Regression Tests.
 */

import {
  getActionPolicy,
  getAllActionPolicies,
  isActionAllowed,
  requiresConfirmation,
  checkActionExecutionPermission,
  DEFAULT_USER_PERMISSIONS,
} from "../policy";

import {
  createSignedConfirmationToken,
  verifyConfirmationToken,
  registerPendingAction,
  validateAndConsumeAction,
  cancelPendingAction,
} from "../action-security";

import type { PendingActionPayload, ActionPreview } from "@/types/agent-actions";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("PHASE 13 SECURITY & PERMISSION POLICY TEST SUITE");
  console.log("=======================================================\n");

  const testUserId = "user-test-123";
  const testTenantId = "tenant-test-123";
  const attackerUserId = "user-attacker-666";
  const attackerTenantId = "tenant-attacker-666";

  // -------------------------------------------------------------
  // TEST GROUP 1: Centralized Action Policy Matrix (Step 2 & 28)
  // -------------------------------------------------------------
  console.log("--- Group 1: Action Policy Matrix ---");

  const draftPolicy = getActionPolicy("create_draft");
  assert(
    draftPolicy !== null &&
      draftPolicy.allowed === true &&
      draftPolicy.riskLevel === "LOW" &&
      draftPolicy.requiresConfirmation === false &&
      draftPolicy.requiredPermission === "gmail.draft",
    "create_draft policy: allowed=true, risk=LOW, confirmation=false",
  );

  const modifyPolicy = getActionPolicy("modify_email");
  assert(
    modifyPolicy !== null &&
      modifyPolicy.allowed === true &&
      modifyPolicy.riskLevel === "LOW" &&
      modifyPolicy.requiresConfirmation === false &&
      modifyPolicy.requiredPermission === "gmail.modify",
    "modify_email policy: allowed=true, risk=LOW, confirmation=false",
  );

  const sendPolicy = getActionPolicy("send_email");
  assert(
    sendPolicy !== null &&
      sendPolicy.allowed === true &&
      sendPolicy.riskLevel === "HIGH" &&
      sendPolicy.requiresConfirmation === true &&
      sendPolicy.requiredPermission === "gmail.send",
    "send_email policy: allowed=true, risk=HIGH, confirmation=true",
  );

  const replyPolicy = getActionPolicy("send_reply");
  assert(
    replyPolicy !== null &&
      replyPolicy.allowed === true &&
      replyPolicy.riskLevel === "HIGH" &&
      replyPolicy.requiresConfirmation === true &&
      replyPolicy.requiredPermission === "gmail.send",
    "send_reply policy: allowed=true, risk=HIGH, confirmation=true",
  );

  const trashPolicy = getActionPolicy("trash_message");
  assert(
    trashPolicy !== null &&
      trashPolicy.allowed === true &&
      trashPolicy.riskLevel === "DESTRUCTIVE" &&
      trashPolicy.isDestructive === true &&
      trashPolicy.requiresConfirmation === true &&
      trashPolicy.requiredPermission === "gmail.trash",
    "trash_message policy: allowed=true, risk=DESTRUCTIVE, confirmation=true, isDestructive=true",
  );

  const calCreatePolicy = getActionPolicy("create_calendar_event");
  assert(
    calCreatePolicy !== null &&
      calCreatePolicy.allowed === true &&
      calCreatePolicy.riskLevel === "HIGH" &&
      calCreatePolicy.requiresConfirmation === true &&
      calCreatePolicy.requiredPermission === "calendar.create",
    "create_calendar_event policy: allowed=true, risk=HIGH, confirmation=true",
  );

  const calUpdatePolicy = getActionPolicy("update_calendar_event");
  assert(
    calUpdatePolicy !== null &&
      calUpdatePolicy.allowed === true &&
      calUpdatePolicy.riskLevel === "HIGH" &&
      calUpdatePolicy.requiresConfirmation === true &&
      calUpdatePolicy.requiredPermission === "calendar.update",
    "update_calendar_event policy: allowed=true, risk=HIGH, confirmation=true",
  );

  const calDeletePolicy = getActionPolicy("delete_calendar_event");
  assert(
    calDeletePolicy !== null &&
      calDeletePolicy.allowed === true &&
      calDeletePolicy.riskLevel === "DESTRUCTIVE" &&
      calDeletePolicy.isDestructive === true &&
      calDeletePolicy.requiresConfirmation === true &&
      calDeletePolicy.requiredPermission === "calendar.delete",
    "delete_calendar_event policy: allowed=true, risk=DESTRUCTIVE, confirmation=true, isDestructive=true",
  );

  const permDeletePolicy = getActionPolicy("permanent_email_delete");
  assert(
    permDeletePolicy !== null &&
      permDeletePolicy.allowed === false &&
      permDeletePolicy.riskLevel === "BLOCKED",
    "permanent_email_delete policy: allowed=false, risk=BLOCKED",
  );

  const allPolicies = getAllActionPolicies();
  assert(
    allPolicies.length >= 10,
    `Registry contains all defined operations (${allPolicies.length} registered)`,
  );

  // -------------------------------------------------------------
  // TEST GROUP 2: Server-Side Permission Checks (Step 3, 9, 10, 11)
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Permission Enforcement & Evaluation ---");

  // Default permissions
  const defaultCheck = isActionAllowed("send_email", DEFAULT_USER_PERMISSIONS);
  assert(defaultCheck.allowed === true, "send_email allowed with default permissions");

  // Revoked permission check
  const revokedPerms = { ...DEFAULT_USER_PERMISSIONS, "gmail.send": false };
  const revokedCheck = isActionAllowed("send_email", revokedPerms);
  assert(
    revokedCheck.allowed === false &&
      Boolean(revokedCheck.reason?.includes("gmail.send")),
    "send_email rejected when 'gmail.send' permission is revoked",
  );

  // Blocked action is rejected even if client pretends to have all permissions
  const blockedCheck = isActionAllowed("permanent_email_delete", DEFAULT_USER_PERMISSIONS);
  assert(
    blockedCheck.allowed === false &&
      Boolean(blockedCheck.reason?.includes("Permanent email deletion is not available")),
    "permanent_email_delete unconditionally rejected without exposing internal details",
  );

  // Confirmation requirement is strictly from server policy
  assert(
    requiresConfirmation("send_email") === true,
    "requiresConfirmation('send_email') returns true from server policy",
  );
  assert(
    requiresConfirmation("create_draft") === false,
    "requiresConfirmation('create_draft') returns false from server policy",
  );

  // Comprehensive check
  const compCheck = checkActionExecutionPermission("create_calendar_event", DEFAULT_USER_PERMISSIONS);
  assert(
    compCheck.allowed === true && compCheck.requiresConfirmation === true,
    "checkActionExecutionPermission correctly flags allowed + requiresConfirmation",
  );

  // -------------------------------------------------------------
  // TEST GROUP 3: HMAC Token Binding & Integrity (Step 7 & 8)
  // -------------------------------------------------------------
  console.log("\n--- Group 3: Token Cryptographic Integrity & Tampering ---");

  const pending1 = await registerPendingAction({
    userId: testUserId,
    tenantId: testTenantId,
    action: "send_email",
    actionParams: { to: "alice@example.com", subject: "Hello", body: "Meeting notes" },
    preview: {
      action: "send_email",
      recipient: "alice@example.com",
      subject: "Hello",
      body: "Meeting notes",
    },
  });

  assert(
    Boolean(pending1.actionId && pending1.confirmationToken),
    "registerPendingAction generates valid actionId and token",
  );

  // Valid token verification
  const validVerification = verifyConfirmationToken(pending1.confirmationToken);
  assert(
    validVerification.valid === true && validVerification.payload?.id === pending1.actionId,
    "verifyConfirmationToken accepts authentic signed token",
  );

  // Attacker tampers with token payload (modifies recipient)
  const [serialized, signature] = pending1.confirmationToken.split(".");
  const decodedJson = Buffer.from(serialized, "base64url").toString("utf-8");
  const tamperedJson = decodedJson.replace("alice@example.com", "attacker@evil.com");
  const tamperedSerialized = Buffer.from(tamperedJson, "utf-8").toString("base64url");
  const tamperedToken = `${tamperedSerialized}.${signature}`;

  const tamperedVerification = verifyConfirmationToken(tamperedToken);
  assert(
    tamperedVerification.valid === false &&
      Boolean(tamperedVerification.error?.includes("Invalid token signature")),
    "Tampered action parameters fail cryptographic signature verification",
  );

  // -------------------------------------------------------------
  // TEST GROUP 4: Cross-Tenant & Cross-User Security (Step 27)
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Cross-Tenant & User Boundary Protection ---");

  // User B tries to confirm User A's action
  const crossUserAttempt = await validateAndConsumeAction(
    pending1.actionId,
    attackerUserId, // Wrong user
    testTenantId,
    pending1.confirmationToken,
  );
  assert(
    crossUserAttempt.valid === false &&
      Boolean(crossUserAttempt.error?.includes("authenticated user")),
    "Cross-user confirmation is blocked (User B cannot confirm User A's action)",
  );

  // Attacker tries to execute under a different tenant
  const crossTenantAttempt = await validateAndConsumeAction(
    pending1.actionId,
    testUserId,
    attackerTenantId, // Wrong tenant
    pending1.confirmationToken,
  );
  assert(
    crossTenantAttempt.valid === false &&
      Boolean(crossTenantAttempt.error?.includes("Tenant authorization")),
    "Cross-tenant confirmation is blocked (Tenant mismatch rejected)",
  );

  // -------------------------------------------------------------
  // TEST GROUP 5: Replay, Concurrency, and Cancellation (Step 21 & 22)
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Replay Protection, Concurrency & Cancellation ---");

  // Successful first confirmation
  const firstConsume = await validateAndConsumeAction(
    pending1.actionId,
    testUserId,
    testTenantId,
    pending1.confirmationToken,
  );
  assert(firstConsume.valid === true, "First confirmation succeeds");

  // Replay attempt on consumed action
  const replayAttempt = await validateAndConsumeAction(
    pending1.actionId,
    testUserId,
    testTenantId,
    pending1.confirmationToken,
  );
  assert(
    replayAttempt.valid === false &&
      Boolean(replayAttempt.error?.includes("replay prevented")),
    "Replay attack blocked: already-consumed action cannot execute a second time",
  );

  // Test Cancellation
  const pending2 = await registerPendingAction({
    userId: testUserId,
    tenantId: testTenantId,
    action: "trash_message",
    actionParams: { messageId: "msg-999" },
    preview: {
      action: "trash_message",
      messageId: "msg-999",
      warning: "Moving to trash",
    },
  });

  const cancelRes = cancelPendingAction(pending2.actionId, testUserId);
  assert(cancelRes.success === true, "Action cancelled successfully");

  // Confirmation of cancelled action must fail
  const cancelledConfirm = await validateAndConsumeAction(
    pending2.actionId,
    testUserId,
    testTenantId,
    pending2.confirmationToken,
  );
  assert(
    cancelledConfirm.valid === false &&
      Boolean(cancelledConfirm.error?.includes("cancelled")),
    "Cancelled action cannot be confirmed or executed",
  );

  // Test Concurrent / Double confirmation race condition
  const pending3 = await registerPendingAction({
    userId: testUserId,
    tenantId: testTenantId,
    action: "create_calendar_event",
    actionParams: { summary: "Concurrent Test" },
    preview: {
      action: "create_calendar_event",
      title: "Concurrent Test",
      date: "2026-10-06",
      start: "2026-10-06T10:00:00Z",
      end: "2026-10-06T11:00:00Z",
    },
  });

  const [race1, race2] = await Promise.all([
    validateAndConsumeAction(pending3.actionId, testUserId, testTenantId, pending3.confirmationToken),
    validateAndConsumeAction(pending3.actionId, testUserId, testTenantId, pending3.confirmationToken),
  ]);

  const raceSuccessCount = (race1.valid ? 1 : 0) + (race2.valid ? 1 : 0);
  assert(
    raceSuccessCount === 1,
    `Simultaneous confirmation race condition: exactly 1 wins (won: ${raceSuccessCount}, rejected: ${2 - raceSuccessCount})`,
  );

  // -------------------------------------------------------------
  // TEST GROUP 6: Expiration (Step 23)
  // -------------------------------------------------------------
  console.log("\n--- Group 6: Expiration Security ---");

  const expiredPayload: PendingActionPayload = {
    id: "expired-id-123",
    tenantId: testTenantId,
    userId: testUserId,
    action: "send_email",
    params: { to: "bob@example.com" },
    preview: { action: "send_email", recipient: "bob@example.com", subject: "Hi", body: "Test" },
    createdAt: Date.now() - 20 * 60 * 1000,
    expiresAt: Date.now() - 10 * 60 * 1000, // Expired 10 minutes ago
  };

  const expiredToken = createSignedConfirmationToken(expiredPayload);
  const expiredVerification = verifyConfirmationToken(expiredToken);
  assert(
    expiredVerification.valid === false &&
      Boolean(expiredVerification.error?.includes("expired")),
    "Expired confirmation token is rejected by server",
  );

  // -------------------------------------------------------------
  // TEST GROUP 7: Blocked Action Staging Prevention (Step 2 & 14)
  // -------------------------------------------------------------
  console.log("\n--- Group 7: Blocked Action Protection ---");

  let blockedRegistered = false;
  try {
    await registerPendingAction({
      userId: testUserId,
      tenantId: testTenantId,
      action: "permanent_email_delete" as unknown as "send_email",
      actionParams: {},
      preview: { action: "trash_message", messageId: "123", warning: "Blocked test" } as ActionPreview,
    });
    blockedRegistered = true;
  } catch {
    blockedRegistered = false;
  }

  assert(
    blockedRegistered === false,
    "Blocked action ('permanent_email_delete') cannot be registered or prepared",
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
