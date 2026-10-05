export type AutomationStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "FAILED";

export type AutomationTriggerType = "schedule" | "one_time";

export type ScheduleType = "daily" | "weekdays" | "weekly" | "one_time" | "custom_cron";

export interface ScheduleConfig {
  type: ScheduleType;
  time?: string; // e.g., "09:00", "17:00" (24h format)
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  datetime?: string; // ISO datetime string for one_time schedules
  cron?: string; // Standard cron pattern for custom_cron
}

export interface AutomationRecord {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  tenantId: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  status: AutomationStatus;
  triggerType: AutomationTriggerType;
  schedule: ScheduleConfig;
  timezone: string;
  instruction: string;
  allowedTools: string[];
  lastRunAt?: Date | string | null;
  nextRunAt?: Date | string | null;
  failureCount: number;
  lockedUntil?: Date | string | null;
  lastRunStatus?: "success" | "failed" | null;
  lastRunResult?: string | null;
}

export type AutomationRunStatus = "running" | "succeeded" | "failed" | "cancelled";

export type AutomationErrorCategory =
  | "provider_error"
  | "permission_error"
  | "connection_error"
  | "timeout"
  | "rate_limit"
  | "execution_error";

export interface AutomationRunRecord {
  id: string;
  createdAt: Date | string;
  automationId: string;
  userId: string;
  tenantId: string;
  startedAt: Date | string;
  finishedAt?: Date | string | null;
  status: AutomationRunStatus;
  summary?: string | null;
  error?: string | null;
  errorCategory?: AutomationErrorCategory | null;
  stepsCount?: number;
  toolCallsCount?: number;
  durationMs?: number;
}

export interface CreateAutomationInput {
  name: string;
  description?: string;
  schedule: ScheduleConfig;
  timezone: string;
  instruction: string;
  allowedTools?: string[];
}

export interface UpdateAutomationInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  status?: AutomationStatus;
  schedule?: ScheduleConfig;
  timezone?: string;
  instruction?: string;
  allowedTools?: string[];
}

export interface AutomationActionPreview {
  action: "create_automation" | "update_automation" | "delete_automation";
  automationId?: string;
  name: string;
  scheduleDescription: string;
  schedule: ScheduleConfig;
  timezone: string;
  instruction: string;
  allowedTools: string[];
  isReadOnly: boolean;
  warning?: string;
}
