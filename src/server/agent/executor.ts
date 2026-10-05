import { sendGmailMessage, trashGmailMessage } from "@/server/gmail";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/server/googlecalendar";
import type { PendingActionPayload } from "@/types/agent-actions";

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Executes a server-verified confirmed action using the tenant-scoped Corsair SDK.
 * Note: Never accepts tenantId or userId from client or model.
 */
export async function executeConfirmedAction(
  payload: PendingActionPayload,
  tenantId: string,
): Promise<ExecutionResult> {
  const { action, params } = payload;

  switch (action) {
    case "send_email":
    case "send_reply": {
      const to = String(params.to || "");
      const subject = String(params.subject || "");
      const body = String(params.body || "");
      const threadId = params.threadId ? String(params.threadId) : undefined;
      const inReplyTo = params.inReplyTo ? String(params.inReplyTo) : undefined;
      const cc = params.cc ? String(params.cc) : undefined;

      if (!to || !body) {
        throw new Error("Cannot send email without a recipient and body content.");
      }

      const result = await sendGmailMessage(tenantId, {
        to,
        subject,
        body,
        threadId,
        inReplyTo,
        cc,
      });

      const recipientText = to;
      return {
        success: true,
        message: action === "send_reply"
          ? `Reply sent to ${recipientText}.`
          : `Email sent to ${recipientText}.`,
        data: result,
      };
    }

    case "trash_message": {
      const messageId = String(params.messageId || "");
      if (!messageId) {
        throw new Error("Message ID required to trash email.");
      }

      const result = await trashGmailMessage(tenantId, messageId);
      return {
        success: true,
        message: "Email moved to trash.",
        data: result,
      };
    }

    case "create_calendar_event": {
      const summary = String(params.summary || "New Event");
      const description = params.description ? String(params.description) : undefined;
      const location = params.location ? String(params.location) : undefined;
      const calendarId = params.calendarId ? String(params.calendarId) : "primary";

      const start = params.start as { dateTime?: string; date?: string; timeZone?: string };
      const end = params.end as { dateTime?: string; date?: string; timeZone?: string };

      if (!start || !end) {
        throw new Error("Start and end times are required to create a calendar event.");
      }

      const attendees = Array.isArray(params.attendees)
        ? (params.attendees as Array<{ email: string; displayName?: string }>)
        : undefined;

      const result = await createCalendarEvent(tenantId, {
        summary,
        description,
        location,
        calendarId,
        start,
        end,
        attendees,
      });

      return {
        success: true,
        message: `Meeting "${summary}" scheduled successfully.`,
        data: result,
      };
    }

    case "update_calendar_event": {
      const eventId = String(params.eventId || "");
      if (!eventId) {
        throw new Error("Event ID required to update calendar event.");
      }

      const summary = params.summary ? String(params.summary) : undefined;
      const description = params.description ? String(params.description) : undefined;
      const location = params.location ? String(params.location) : undefined;
      const calendarId = params.calendarId ? String(params.calendarId) : "primary";

      const start = params.start as { dateTime?: string; date?: string; timeZone?: string } | undefined;
      const end = params.end as { dateTime?: string; date?: string; timeZone?: string } | undefined;

      const attendees = Array.isArray(params.attendees)
        ? (params.attendees as Array<{ email: string; displayName?: string }>)
        : undefined;

      const result = await updateCalendarEvent(tenantId, eventId, {
        summary,
        description,
        location,
        calendarId,
        start,
        end,
        attendees,
      });

      const updatedTitle = summary || (payload.preview as { title?: string })?.title || "Event";
      return {
        success: true,
        message: `Calendar event "${updatedTitle}" updated successfully.`,
        data: result,
      };
    }

    case "delete_calendar_event": {
      const eventId = String(params.eventId || "");
      if (!eventId) {
        throw new Error("Event ID required to delete calendar event.");
      }

      const calendarId = params.calendarId ? String(params.calendarId) : "primary";
      const result = await deleteCalendarEvent(tenantId, eventId, calendarId);

      const eventTitle = (payload.preview as { title?: string })?.title || "Meeting";
      return {
        success: true,
        message: `Calendar event "${eventTitle}" has been deleted.`,
        data: result,
      };
    }

    default:
      throw new Error(`Unsupported action type: ${action}`);
  }
}
