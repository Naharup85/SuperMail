/**
 * Agent Actions and Confirmation Types for SuperMail Phase 11.
 */

export type HighImpactActionType =
  | "send_email"
  | "send_reply"
  | "trash_message"
  | "create_calendar_event"
  | "update_calendar_event"
  | "delete_calendar_event";

export type LowRiskActionType =
  | "create_draft"
  | "modify_message";

export type AgentActionType = HighImpactActionType | LowRiskActionType;

export interface EmailActionPreview {
  action: "send_email" | "send_reply";
  recipient: string;
  cc?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}

export interface DraftActionPreview {
  action: "create_draft";
  recipient?: string;
  subject?: string;
  body?: string;
  threadId?: string;
}

export interface TrashMessagePreview {
  action: "trash_message";
  messageId: string;
  subject?: string;
  sender?: string;
  warning: string;
}

export interface CalendarCreatePreview {
  action: "create_calendar_event";
  title: string;
  date: string;
  start: string;
  end: string;
  timeZone?: string;
  attendees?: string[];
  location?: string;
  description?: string;
}

export interface CalendarUpdatePreview {
  action: "update_calendar_event";
  eventId: string;
  title?: string;
  date?: string;
  start?: string;
  end?: string;
  timeZone?: string;
  attendees?: string[];
  location?: string;
  description?: string;
  originalTitle?: string;
}

export interface CalendarDeletePreview {
  action: "delete_calendar_event";
  eventId: string;
  title?: string;
  date?: string;
  warning: string;
}

export type ActionPreview =
  | EmailActionPreview
  | DraftActionPreview
  | TrashMessagePreview
  | CalendarCreatePreview
  | CalendarUpdatePreview
  | CalendarDeletePreview;

export interface PendingActionPayload {
  id: string; // Unique nonce/UUID
  tenantId: string;
  userId: string;
  action: HighImpactActionType;
  params: Record<string, unknown>;
  preview: ActionPreview;
  createdAt: number;
  expiresAt: number;
}

export interface ActionPreparationResult {
  status: "requires_confirmation";
  actionId: string;
  confirmationToken: string;
  actionType: HighImpactActionType;
  preview: ActionPreview;
  message: string;
}

export interface ActionExecutionRequest {
  actionId: string;
  confirmationToken: string;
  cancel?: boolean;
}

export type ActionCardState =
  | "pending_confirmation"
  | "executing"
  | "confirmed"
  | "cancelled"
  | "failed"
  | "expired";

export interface ActionExecutionResponse {
  success: boolean;
  status: "executed" | "cancelled" | "failed";
  actionId: string;
  actionType: HighImpactActionType;
  message: string;
  error?: string;
  data?: unknown;
}
