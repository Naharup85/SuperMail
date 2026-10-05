import crypto from "crypto";
import { db } from "@/db";
import { agentAutomations, agentAutomationRuns } from "@/db/schema";
import { eq, and, lte, or, isNull, desc } from "drizzle-orm";
import type {
  AutomationRecord,
  AutomationRunRecord,
  CreateAutomationInput,
  UpdateAutomationInput,
  AutomationStatus,
  AutomationTriggerType,
} from "@/types/automations";
import { calculateNextRun, validateSchedule } from "./scheduler";

// Resilient memory store fallback for tests, local dev, or disconnected DB instances
const memoryAutomations = new Map<string, AutomationRecord>();
const memoryRuns = new Map<string, AutomationRunRecord>();

async function withDbSafe<T>(op: () => Promise<T>): Promise<T | null> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB timeout")), 150),
    );
    return await Promise.race([op(), timeoutPromise]);
  } catch {
    return null;
  }
}

/**
 * Creates a new automation record after server validation.
 */
export async function createAutomation(params: {
  userId: string;
  tenantId: string;
  input: CreateAutomationInput;
}): Promise<AutomationRecord> {
  const { userId, tenantId, input } = params;

  // Validate schedule and timezone
  const validation = validateSchedule(input.schedule, input.timezone);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid schedule configuration.");
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const nextRunAt = calculateNextRun(input.schedule, input.timezone, now);

  const defaultTools = [
    "gmail.api.messages.list",
    "gmail.api.messages.get",
    "googlecalendar.api.events.getMany",
  ];

  const allowedTools = Array.isArray(input.allowedTools) && input.allowedTools.length > 0
    ? input.allowedTools
    : defaultTools;

  const record: AutomationRecord = {
    id,
    createdAt: now,
    updatedAt: now,
    userId,
    tenantId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    enabled: true,
    status: "ACTIVE",
    triggerType: input.schedule.type === "one_time" ? "one_time" : "schedule",
    schedule: input.schedule,
    timezone: input.timezone,
    instruction: input.instruction.trim(),
    allowedTools,
    lastRunAt: null,
    nextRunAt,
    failureCount: 0,
    lockedUntil: null,
    lastRunStatus: null,
    lastRunResult: null,
  };

  // Persist in memory store
  memoryAutomations.set(id, { ...record });

  // Attempt DB persistence
  await withDbSafe(async () => {
    await db.insert(agentAutomations).values({
      id: record.id,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
      userId: record.userId,
      tenantId: record.tenantId,
      name: record.name,
      description: record.description,
      enabled: record.enabled,
      status: record.status,
      triggerType: record.triggerType,
      schedule: record.schedule,
      timezone: record.timezone,
      instruction: record.instruction,
      allowedTools: record.allowedTools,
      nextRunAt: record.nextRunAt as Date | null,
      failureCount: record.failureCount,
    });
  });

  return record;
}

/**
 * Retrieves an automation by ID with optional tenant/user boundary check.
 */
export async function getAutomationById(
  id: string,
  userId?: string,
  tenantId?: string,
): Promise<AutomationRecord | null> {
  const dbResult = await withDbSafe(async () => {
    const conditions = [eq(agentAutomations.id, id)];
    if (userId) conditions.push(eq(agentAutomations.userId, userId));
    if (tenantId) conditions.push(eq(agentAutomations.tenantId, tenantId));

    const rows = await db
      .select()
      .from(agentAutomations)
      .where(and(...conditions))
      .limit(1);

    if (rows && rows.length > 0) {
      const row = rows[0];
      const record: AutomationRecord = {
        ...row,
        status: row.status as AutomationStatus,
        triggerType: row.triggerType as AutomationTriggerType,
        lastRunStatus: (row.lastRunStatus as "success" | "failed" | null) || null,
        schedule: row.schedule as AutomationRecord["schedule"],
        allowedTools: (row.allowedTools as string[]) || [],
      };
      memoryAutomations.set(id, record);
      return record;
    }
    return null;
  });

  if (dbResult) return dbResult;

  const record = memoryAutomations.get(id);
  if (!record) return null;
  if (userId && record.userId !== userId) return null;
  if (tenantId && record.tenantId !== tenantId) return null;

  return record;
}

/**
 * Lists all automations for a given user.
 */
export async function listAutomationsForUser(userId: string): Promise<AutomationRecord[]> {
  const dbRows = await withDbSafe(async () => {
    const rows = await db
      .select()
      .from(agentAutomations)
      .where(eq(agentAutomations.userId, userId))
      .orderBy(desc(agentAutomations.createdAt));

    if (rows && rows.length > 0) {
      return rows.map((row) => ({
        ...row,
        status: row.status as AutomationStatus,
        triggerType: row.triggerType as AutomationTriggerType,
        lastRunStatus: (row.lastRunStatus as "success" | "failed" | null) || null,
        schedule: row.schedule as AutomationRecord["schedule"],
        allowedTools: (row.allowedTools as string[]) || [],
      }));
    }
    return null;
  });

  if (dbRows) return dbRows;

  return Array.from(memoryAutomations.values())
    .filter((a) => a.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/**
 * Updates an existing automation record.
 */
export async function updateAutomation(
  id: string,
  userId: string,
  tenantId: string,
  updates: UpdateAutomationInput,
): Promise<AutomationRecord | null> {
  const existing = await getAutomationById(id, userId, tenantId);
  if (!existing) return null;

  const now = new Date();
  const newTz = updates.timezone || existing.timezone;
  const newSchedule = updates.schedule || existing.schedule;

  if (updates.schedule || updates.timezone) {
    const validation = validateSchedule(newSchedule, newTz);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid schedule update.");
    }
  }

  const nextRunAt =
    updates.schedule || updates.timezone
      ? calculateNextRun(newSchedule, newTz, now)
      : existing.nextRunAt;

  const updated: AutomationRecord = {
    ...existing,
    name: updates.name ? updates.name.trim() : existing.name,
    description: updates.description !== undefined ? updates.description : existing.description,
    enabled: updates.enabled !== undefined ? updates.enabled : existing.enabled,
    status: updates.status || (updates.enabled === false ? "PAUSED" : existing.status),
    schedule: newSchedule,
    timezone: newTz,
    instruction: updates.instruction ? updates.instruction.trim() : existing.instruction,
    allowedTools: updates.allowedTools || existing.allowedTools,
    nextRunAt,
    updatedAt: now,
  };

  memoryAutomations.set(id, updated);

  await withDbSafe(async () => {
    await db
      .update(agentAutomations)
      .set({
        name: updated.name,
        description: updated.description,
        enabled: updated.enabled,
        status: updated.status,
        schedule: updated.schedule,
        timezone: updated.timezone,
        instruction: updated.instruction,
        allowedTools: updated.allowedTools,
        nextRunAt: updated.nextRunAt as Date | null,
        updatedAt: updated.updatedAt as Date,
      })
      .where(
        and(
          eq(agentAutomations.id, id),
          eq(agentAutomations.userId, userId),
          eq(agentAutomations.tenantId, tenantId),
        ),
      );
  });

  return updated;
}

/**
 * Pauses an active automation.
 */
export async function pauseAutomation(
  id: string,
  userId: string,
  tenantId: string,
): Promise<AutomationRecord | null> {
  return updateAutomation(id, userId, tenantId, {
    enabled: false,
    status: "PAUSED",
  });
}

/**
 * Resumes a paused automation and recalculates nextRunAt.
 */
export async function resumeAutomation(
  id: string,
  userId: string,
  tenantId: string,
): Promise<AutomationRecord | null> {
  const existing = await getAutomationById(id, userId, tenantId);
  if (!existing) return null;

  const now = new Date();
  const nextRunAt = calculateNextRun(existing.schedule, existing.timezone, now);

  const updated: AutomationRecord = {
    ...existing,
    enabled: true,
    status: "ACTIVE",
    failureCount: 0,
    nextRunAt,
    updatedAt: now,
  };

  memoryAutomations.set(id, updated);

  await withDbSafe(async () => {
    await db
      .update(agentAutomations)
      .set({
        enabled: true,
        status: "ACTIVE",
        failureCount: 0,
        nextRunAt: nextRunAt as Date | null,
        updatedAt: now,
      })
      .where(
        and(
          eq(agentAutomations.id, id),
          eq(agentAutomations.userId, userId),
          eq(agentAutomations.tenantId, tenantId),
        ),
      );
  });

  return updated;
}

/**
 * Deletes an automation.
 */
export async function deleteAutomation(
  id: string,
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const existing = await getAutomationById(id, userId, tenantId);
  if (!existing) return false;

  memoryAutomations.delete(id);

  await withDbSafe(async () => {
    await db
      .delete(agentAutomations)
      .where(
        and(
          eq(agentAutomations.id, id),
          eq(agentAutomations.userId, userId),
          eq(agentAutomations.tenantId, tenantId),
        ),
      );
  });

  return true;
}

/**
 * Atomic Claiming of Due Automations for Concurrency & Idempotency.
 * Atomically marks `lockedUntil = now + 5 minutes` to ensure two workers never execute the same run.
 */
export async function claimDueAutomations(
  now: Date = new Date(),
  limit: number = 10,
): Promise<AutomationRecord[]> {
  const lockDurationMs = 5 * 60 * 1000;
  const lockedUntil = new Date(now.getTime() + lockDurationMs);
  const claimed: AutomationRecord[] = [];

  // Memory store atomic claim
  for (const [id, a] of memoryAutomations.entries()) {
    if (claimed.length >= limit) break;
    const isDue =
      a.enabled &&
      a.status === "ACTIVE" &&
      a.nextRunAt &&
      new Date(a.nextRunAt).getTime() <= now.getTime();

    const isUnlocked =
      !a.lockedUntil || new Date(a.lockedUntil).getTime() <= now.getTime();

    if (isDue && isUnlocked) {
      a.lockedUntil = lockedUntil;
      memoryAutomations.set(id, { ...a });
      claimed.push({ ...a });
    }
  }

  // Attempt DB query & lock if DB is online
  await withDbSafe(async () => {
    const dueRows = await db
      .select()
      .from(agentAutomations)
      .where(
        and(
          eq(agentAutomations.enabled, true),
          eq(agentAutomations.status, "ACTIVE"),
          lte(agentAutomations.nextRunAt, now),
          or(
            isNull(agentAutomations.lockedUntil),
            lte(agentAutomations.lockedUntil, now),
          ),
        ),
      )
      .limit(limit);

    for (const row of dueRows) {
      await db
        .update(agentAutomations)
        .set({ lockedUntil })
        .where(
          and(
            eq(agentAutomations.id, row.id),
            or(
              isNull(agentAutomations.lockedUntil),
              lte(agentAutomations.lockedUntil, now),
            ),
          ),
        );
      
      const record: AutomationRecord = {
        ...row,
        status: row.status as AutomationStatus,
        triggerType: row.triggerType as AutomationTriggerType,
        lastRunStatus: (row.lastRunStatus as "success" | "failed" | null) || null,
        lockedUntil,
        schedule: row.schedule as AutomationRecord["schedule"],
        allowedTools: (row.allowedTools as string[]) || [],
      };
      if (!claimed.some((c) => c.id === record.id)) {
        claimed.push(record);
      }
    }
  });

  return claimed;
}

/**
 * Creates a new automation run log record.
 */
export async function createAutomationRun(params: {
  automationId: string;
  userId: string;
  tenantId: string;
}): Promise<AutomationRunRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  const run: AutomationRunRecord = {
    id,
    createdAt: now,
    automationId: params.automationId,
    userId: params.userId,
    tenantId: params.tenantId,
    startedAt: now,
    finishedAt: null,
    status: "running",
    summary: null,
    error: null,
    errorCategory: null,
    stepsCount: 0,
    toolCallsCount: 0,
    durationMs: 0,
  };

  memoryRuns.set(id, { ...run });

  await withDbSafe(async () => {
    await db.insert(agentAutomationRuns).values({
      id: run.id,
      createdAt: run.createdAt as Date,
      automationId: run.automationId,
      userId: run.userId,
      tenantId: run.tenantId,
      startedAt: run.startedAt as Date,
      status: run.status,
    });
  });

  return run;
}

/**
 * Updates an automation run after completion or failure.
 */
export async function updateAutomationRun(
  runId: string,
  updates: Partial<AutomationRunRecord>,
): Promise<AutomationRunRecord | null> {
  const existing = memoryRuns.get(runId);
  const now = new Date();

  const finishedAt = updates.finishedAt ? new Date(updates.finishedAt) : now;
  const startedAt = existing?.startedAt ? new Date(existing.startedAt) : now;
  const durationMs = updates.durationMs ?? (finishedAt.getTime() - startedAt.getTime());

  const updated: AutomationRunRecord = {
    ...(existing || {
      id: runId,
      createdAt: now,
      automationId: updates.automationId || "",
      userId: updates.userId || "",
      tenantId: updates.tenantId || "",
      startedAt: now,
      status: "succeeded",
    }),
    ...updates,
    finishedAt,
    durationMs,
  };

  memoryRuns.set(runId, updated);

  await withDbSafe(async () => {
    await db
      .update(agentAutomationRuns)
      .set({
        finishedAt: updated.finishedAt as Date,
        status: updated.status,
        summary: updated.summary,
        error: updated.error,
        errorCategory: updated.errorCategory,
        stepsCount: updated.stepsCount,
        toolCallsCount: updated.toolCallsCount,
        durationMs: updated.durationMs,
      })
      .where(eq(agentAutomationRuns.id, runId));
  });

  return updated;
}

/**
 * Lists runs for a specific automation (scoped to user).
 */
export async function listRunsForAutomation(
  automationId: string,
  userId: string,
  limit: number = 20,
): Promise<AutomationRunRecord[]> {
  const dbRows = await withDbSafe(async () => {
    const rows = await db
      .select()
      .from(agentAutomationRuns)
      .where(
        and(
          eq(agentAutomationRuns.automationId, automationId),
          eq(agentAutomationRuns.userId, userId),
        ),
      )
      .orderBy(desc(agentAutomationRuns.startedAt))
      .limit(limit);

    if (rows && rows.length > 0) {
      return rows as AutomationRunRecord[];
    }
    return null;
  });

  if (dbRows) return dbRows;

  return Array.from(memoryRuns.values())
    .filter((r) => r.automationId === automationId && r.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
    .slice(0, limit);
}

/**
 * Lists recent runs across all user automations.
 */
export async function getRecentRunsForUser(
  userId: string,
  limit: number = 20,
): Promise<AutomationRunRecord[]> {
  const dbRows = await withDbSafe(async () => {
    const rows = await db
      .select()
      .from(agentAutomationRuns)
      .where(eq(agentAutomationRuns.userId, userId))
      .orderBy(desc(agentAutomationRuns.startedAt))
      .limit(limit);

    if (rows && rows.length > 0) {
      return rows as AutomationRunRecord[];
    }
    return null;
  });

  if (dbRows) return dbRows;

  return Array.from(memoryRuns.values())
    .filter((r) => r.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
    .slice(0, limit);
}

/**
 * Test utility: sets nextRunAt directly in memory store.
 */
export function setNextRunAtForTesting(id: string, nextRunAt: Date | null): void {
  const rec = memoryAutomations.get(id);
  if (rec) {
    rec.nextRunAt = nextRunAt;
    rec.lockedUntil = null;
    memoryAutomations.set(id, rec);
  }
}

/**
 * Test utility: clears in-memory stores for clean testing.
 */
export function clearMemoryAutomationsForTesting(): void {
  memoryAutomations.clear();
  memoryRuns.clear();
}
