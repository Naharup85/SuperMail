import { corsair } from "@/server/corsair";
import { buildCorsairTools, type CorsairOperationTool } from "corsair";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { READ_ONLY_OPERATIONS } from "./config";
import { createGmailDraft, modifyGmailMessage } from "@/server/gmail";
import { registerPendingAction } from "./action-security";
import { isActionAllowed, getUserPermissions } from "./policy";
import { logAuditEvent } from "./audit";
import type {
  EmailActionPreview,
  TrashMessagePreview,
  CalendarCreatePreview,
  CalendarUpdatePreview,
  CalendarDeletePreview,
} from "@/types/agent-actions";

import {
  normalizeGmailMessageForAgent,
  normalizeCalendarEventForAgent,
} from "./context-normalizer";

/**
 * Builds AI SDK compatible tools combining:
 * 1. Native READ-ONLY Corsair operations (scoped to the authenticated tenant)
 * 2. Low-risk direct tools (Draft creation, Label modification) with server policy checks
 * 3. High-impact staged action tools requiring user confirmation
 *
 * Guarantees strict tenant isolation and server-side authorization.
 */
export function buildAgentTools(tenantId: string, userId: string): ToolSet {
  const tools: ToolSet = {};

  // 1. Mount Native Corsair READ tools with context normalization
  const corsairReadTools: CorsairOperationTool[] = buildCorsairTools(corsair, {
    tenantId,
    operations: [...READ_ONLY_OPERATIONS],
  });

  for (const corsairTool of corsairReadTools) {
    tools[corsairTool.name] = tool({
      description:
        corsairTool.description || `Execute read operation ${corsairTool.operation}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: corsairTool.schema as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) => {
        try {
          const userPerms = await getUserPermissions(userId);
          const policyCheck = isActionAllowed(corsairTool.operation, userPerms);
          if (!policyCheck.allowed) {
            return { error: policyCheck.reason || "Read operation not permitted by policy." };
          }

          const result = await corsairTool.execute(args || {});

          // Enrich and normalize responses for LLM short-term context efficiency
          if (corsairTool.operation === "gmail.api.messages.list") {
            const rawList = result as {
              messages?: Array<{ id?: string; threadId?: string }>;
              nextPageToken?: string;
              resultSizeEstimate?: number;
            };

            if (Array.isArray(rawList?.messages) && rawList.messages.length > 0) {
              const enrichedMessages = await Promise.all(
                rawList.messages.slice(0, 10).map(async (item) => {
                  if (!item.id) return item;
                  try {
                    const fullMsg = await corsair
                      .withTenant(tenantId)
                      .gmail.api.messages.get({ id: item.id, format: "full" });
                    return normalizeGmailMessageForAgent(fullMsg);
                  } catch {
                    return item;
                  }
                }),
              );

              return {
                messages: enrichedMessages,
                nextPageToken: rawList.nextPageToken,
                resultSizeEstimate: rawList.resultSizeEstimate,
              };
            }
            return {
              messages: [],
              nextPageToken: rawList?.nextPageToken,
              resultSizeEstimate: rawList?.resultSizeEstimate || 0,
            };
          }

          if (corsairTool.operation === "gmail.api.messages.get") {
            return normalizeGmailMessageForAgent(result);
          }

          if (corsairTool.operation === "gmail.api.threads.get") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawThread = result as { id?: string; messages?: any[] };
            if (Array.isArray(rawThread?.messages)) {
              return {
                id: rawThread.id,
                messages: rawThread.messages.map(normalizeGmailMessageForAgent),
              };
            }
            return result;
          }

          if (corsairTool.operation === "googlecalendar.api.events.getMany") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = result as any;
            if (Array.isArray(raw)) {
              return { events: raw.map(normalizeCalendarEventForAgent) };
            }
            if (Array.isArray(raw?.items)) {
              return {
                events: raw.items.map(normalizeCalendarEventForAgent),
                nextPageToken: raw.nextPageToken,
              };
            }
            return result;
          }

          if (corsairTool.operation === "googlecalendar.api.events.get") {
            return normalizeCalendarEventForAgent(result);
          }

          return result;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Read operation failed";
          return { error: message };
        }
      },
    });
  }

  // 2. Low-Risk Direct Tool: Create Draft (Checks server policy & user permission)
  tools["create_draft"] = tool({
    description:
      "Create an email draft in Gmail without sending it. Use this when the user asks to draft or compose an email.",
    inputSchema: z.object({
      to: z.string().optional().describe("Recipient email address"),
      subject: z.string().optional().describe("Email subject line"),
      body: z.string().optional().describe("Email plain text content"),
      threadId: z.string().optional().describe("Optional thread ID to link draft to a thread"),
    }),
    execute: async ({ to, subject, body, threadId }) => {
      try {
        const userPerms = await getUserPermissions(userId);
        const policyCheck = isActionAllowed("create_draft", userPerms);
        if (!policyCheck.allowed) {
          logAuditEvent({
            userId,
            tenantId,
            action: "create_draft",
            status: "rejected",
            reason: policyCheck.reason,
          });
          return { success: false, error: policyCheck.reason };
        }

        const draft = await createGmailDraft(tenantId, {
          to,
          subject,
          body,
          threadId,
        });

        logAuditEvent({
          userId,
          tenantId,
          action: "create_draft",
          status: "executed",
        });

        return {
          success: true,
          status: "draft_created",
          message: `Draft created for ${to || "recipient"}.`,
          draftId: draft.id,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to create draft";
        logAuditEvent({
          userId,
          tenantId,
          action: "create_draft",
          status: "failed",
          error: message,
        });
        return { success: false, error: message };
      }
    },
  });

  // 3. Low-Risk Direct Tool: Modify Email (Checks server policy & user permission)
  tools["modify_email"] = tool({
    description:
      "Modify email labels such as marking as read/unread, starring/unstarring, or archiving.",
    inputSchema: z.object({
      id: z.string().describe("The message ID to modify"),
      addLabelIds: z
        .array(z.string())
        .optional()
        .describe("Labels to add (e.g. ['STARRED', 'UNREAD'])"),
      removeLabelIds: z
        .array(z.string())
        .optional()
        .describe("Labels to remove (e.g. ['INBOX', 'UNREAD', 'STARRED'])"),
    }),
    execute: async ({ id, addLabelIds, removeLabelIds }) => {
      try {
        const userPerms = await getUserPermissions(userId);
        const policyCheck = isActionAllowed("modify_email", userPerms);
        if (!policyCheck.allowed) {
          logAuditEvent({
            userId,
            tenantId,
            action: "modify_email",
            status: "rejected",
            reason: policyCheck.reason,
          });
          return { success: false, error: policyCheck.reason };
        }

        const res = await modifyGmailMessage(tenantId, id, {
          addLabelIds,
          removeLabelIds,
        });

        logAuditEvent({
          userId,
          tenantId,
          action: "modify_email",
          status: "executed",
        });

        return {
          success: true,
          message: "Email labels updated.",
          data: res,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to modify email";
        logAuditEvent({
          userId,
          tenantId,
          action: "modify_email",
          status: "failed",
          error: message,
        });
        return { success: false, error: message };
      }
    },
  });

  // 4. High-Impact Staged Action: Send Email / Reply (Requires Confirmation)
  tools["prepare_send_email"] = tool({
    description:
      "Prepare to send a new email or a reply. This generates a structured preview card in the UI and requires explicit user confirmation before sending.",
    inputSchema: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body text"),
      cc: z.string().optional().describe("Optional CC email address"),
      inReplyTo: z.string().optional().describe("Message-ID being replied to if replying"),
      threadId: z.string().optional().describe("Thread ID if this is a reply in an existing thread"),
    }),
    execute: async ({ to, subject, body, cc, inReplyTo, threadId }) => {
      try {
        const isReply = Boolean(inReplyTo || threadId);
        const actionType = isReply ? "send_reply" : "send_email";

        const preview: EmailActionPreview = {
          action: actionType,
          recipient: to,
          cc,
          subject,
          body,
          inReplyTo,
          threadId,
        };

        const pending = await registerPendingAction({
          userId,
          tenantId,
          action: actionType,
          actionParams: { to, subject, body, cc, inReplyTo, threadId },
          preview,
        });

        return {
          status: "requires_confirmation",
          actionId: pending.actionId,
          confirmationToken: pending.confirmationToken,
          actionType,
          preview,
          message: isReply
            ? `I've prepared your reply to ${to}. Please review and confirm below.`
            : `I've prepared your email to ${to}. Please review and confirm below.`,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to prepare send action.";
        return { status: "rejected", error: message };
      }
    },
  });

  // 5. High-Impact Staged Action: Trash Email (Requires Confirmation)
  tools["prepare_trash_email"] = tool({
    description:
      "Prepare to move an email to the Trash. Generates a confirmation card in the UI with a destructive warning.",
    inputSchema: z.object({
      messageId: z.string().describe("Message ID to move to trash"),
      subject: z.string().optional().describe("Subject of the message being trashed"),
      sender: z.string().optional().describe("Sender of the message"),
    }),
    execute: async ({ messageId, subject, sender }) => {
      try {
        const preview: TrashMessagePreview = {
          action: "trash_message",
          messageId,
          subject,
          sender,
          warning: "This will move the message to your Gmail Trash folder.",
        };

        const pending = await registerPendingAction({
          userId,
          tenantId,
          action: "trash_message",
          actionParams: { messageId },
          preview,
        });

        return {
          status: "requires_confirmation",
          actionId: pending.actionId,
          confirmationToken: pending.confirmationToken,
          actionType: "trash_message",
          preview,
          message: "I've prepared to move this email to the Trash. Please confirm below.",
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to prepare trash action.";
        return { status: "rejected", error: message };
      }
    },
  });

  // 6. High-Impact Staged Action: Create Calendar Event (Requires Confirmation)
  tools["prepare_create_calendar_event"] = tool({
    description:
      "Prepare to schedule a new Google Calendar event. Generates a confirmation card in the UI with event details.",
    inputSchema: z.object({
      summary: z.string().describe("Event title / summary"),
      date: z.string().describe("Event date (e.g. YYYY-MM-DD or readable string)"),
      startDateTime: z.string().describe("Start ISO date-time string (e.g. 2026-10-06T15:00:00Z)"),
      endDateTime: z.string().describe("End ISO date-time string (e.g. 2026-10-06T16:00:00Z)"),
      timeZone: z.string().optional().describe("Timezone (e.g. 'America/New_York' or 'UTC')"),
      attendees: z.array(z.string()).optional().describe("List of attendee email addresses"),
      location: z.string().optional().describe("Meeting location or video link"),
      description: z.string().optional().describe("Event description / agenda"),
    }),
    execute: async ({
      summary,
      date,
      startDateTime,
      endDateTime,
      timeZone,
      attendees,
      location,
      description,
    }) => {
      try {
        const preview: CalendarCreatePreview = {
          action: "create_calendar_event",
          title: summary,
          date,
          start: startDateTime,
          end: endDateTime,
          timeZone,
          attendees,
          location,
          description,
        };

        const attendeeObjects = attendees?.map((email) => ({ email }));

        const pending = await registerPendingAction({
          userId,
          tenantId,
          action: "create_calendar_event",
          actionParams: {
            summary,
            description,
            location,
            start: { dateTime: startDateTime, timeZone },
            end: { dateTime: endDateTime, timeZone },
            attendees: attendeeObjects,
          },
          preview,
        });

        return {
          status: "requires_confirmation",
          actionId: pending.actionId,
          confirmationToken: pending.confirmationToken,
          actionType: "create_calendar_event",
          preview,
          message: `I've prepared to schedule "${summary}" on ${date}. Please review and confirm below.`,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to prepare event creation.";
        return { status: "rejected", error: message };
      }
    },
  });

  // 7. High-Impact Staged Action: Update Calendar Event (Requires Confirmation)
  tools["prepare_update_calendar_event"] = tool({
    description:
      "Prepare to update, reschedule, or modify an existing Google Calendar event. Generates a confirmation card in the UI.",
    inputSchema: z.object({
      eventId: z.string().describe("ID of the calendar event to update"),
      summary: z.string().optional().describe("Updated event title"),
      date: z.string().optional().describe("Updated event date"),
      startDateTime: z.string().optional().describe("Updated start ISO date-time"),
      endDateTime: z.string().optional().describe("Updated end ISO date-time"),
      timeZone: z.string().optional().describe("Timezone"),
      attendees: z.array(z.string()).optional().describe("Updated attendee emails"),
      location: z.string().optional().describe("Updated location"),
      description: z.string().optional().describe("Updated description"),
      originalTitle: z.string().optional().describe("Original event title for reference"),
    }),
    execute: async ({
      eventId,
      summary,
      date,
      startDateTime,
      endDateTime,
      timeZone,
      attendees,
      location,
      description,
      originalTitle,
    }) => {
      try {
        const preview: CalendarUpdatePreview = {
          action: "update_calendar_event",
          eventId,
          title: summary,
          date: date || "Updated Date",
          start: startDateTime || "",
          end: endDateTime || "",
          timeZone,
          attendees,
          location,
          description,
          originalTitle,
        };

        const start = startDateTime ? { dateTime: startDateTime, timeZone } : undefined;
        const end = endDateTime ? { dateTime: endDateTime, timeZone } : undefined;
        const attendeeObjects = attendees?.map((email) => ({ email }));

        const pending = await registerPendingAction({
          userId,
          tenantId,
          action: "update_calendar_event",
          actionParams: {
            eventId,
            summary,
            description,
            location,
            start,
            end,
            attendees: attendeeObjects,
          },
          preview,
        });

        return {
          status: "requires_confirmation",
          actionId: pending.actionId,
          confirmationToken: pending.confirmationToken,
          actionType: "update_calendar_event",
          preview,
          message: `I've prepared to update the event "${summary || originalTitle || eventId}". Please review and confirm below.`,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to prepare event update.";
        return { status: "rejected", error: message };
      }
    },
  });

  // 8. High-Impact Staged Action: Delete Calendar Event (Requires Confirmation)
  tools["prepare_delete_calendar_event"] = tool({
    description:
      "Prepare to delete a calendar event. Generates a confirmation card in the UI with a destructive warning.",
    inputSchema: z.object({
      eventId: z.string().describe("ID of the calendar event to delete"),
      summary: z.string().optional().describe("Title of the event being deleted"),
      date: z.string().optional().describe("Date of the event being deleted"),
    }),
    execute: async ({ eventId, summary, date }) => {
      try {
        const preview: CalendarDeletePreview = {
          action: "delete_calendar_event",
          eventId,
          title: summary,
          date,
          warning: "This will permanently remove the event from your Google Calendar.",
        };

        const pending = await registerPendingAction({
          userId,
          tenantId,
          action: "delete_calendar_event",
          actionParams: { eventId },
          preview,
        });

        return {
          status: "requires_confirmation",
          actionId: pending.actionId,
          confirmationToken: pending.confirmationToken,
          actionType: "delete_calendar_event",
          preview,
          message: `I've prepared to delete "${summary || 'this event'}". Please confirm below.`,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to prepare event deletion.";
        return { status: "rejected", error: message };
      }
    },
  });

  return tools;
}

