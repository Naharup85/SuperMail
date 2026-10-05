/**
 * Context normalizer and sanitizer for AI Agent tool outputs.
 * Extracts clean, structured metadata (IDs, subjects, senders, attendees, dates, snippets, bodies)
 * while stripping verbose transport headers, raw base64 payloads, and internal credentials.
 */

export interface AgentNormalizedEmail {
  id: string;
  threadId?: string;
  sender: string;
  senderEmail?: string;
  to?: string;
  cc?: string;
  subject: string;
  snippet: string;
  body?: string;
  date: string;
  labelIds?: string[];
  isStarred?: boolean;
  isUnread?: boolean;
}

export interface AgentNormalizedCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  timeZone?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
  htmlLink?: string;
  hangoutLink?: string;
}

const MAX_BODY_LENGTH = 4000;

export function decodeBase64Url(data: string): string {
  if (!data) return "";
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    if (typeof Buffer !== "undefined") {
      return Buffer.from(base64, "base64").toString("utf-8");
    }
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      return window.atob(base64);
    }
    return "";
  } catch {
    return "";
  }
}

interface MessageHeader {
  name?: string;
  value?: string;
}

interface MessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: MessageHeader[];
  body?: {
    data?: string;
    size?: number;
  };
  parts?: MessagePart[];
}

export function extractTextBody(payload?: MessagePart): string {
  if (!payload) return "";
  let text = "";
  let html = "";

  const traverse = (part?: MessagePart) => {
    if (!part) return;
    const mime = part.mimeType?.toLowerCase() || "";
    const rawData = part.body?.data;

    if (rawData) {
      if (mime === "text/plain" && !text) {
        text = decodeBase64Url(rawData);
      } else if (mime === "text/html" && !html) {
        html = decodeBase64Url(rawData);
      }
    }

    if (Array.isArray(part.parts)) {
      for (const sub of part.parts) {
        traverse(sub);
      }
    }
  };

  if (payload.body?.data) {
    const rootMime = payload.mimeType?.toLowerCase() || "";
    if (rootMime === "text/plain") {
      text = decodeBase64Url(payload.body.data);
    } else if (rootMime === "text/html") {
      html = decodeBase64Url(payload.body.data);
    }
  }

  if (Array.isArray(payload.parts)) {
    for (const sub of payload.parts) {
      traverse(sub);
    }
  }

  // If plain text found, return it
  if (text) return text.trim();

  // If only HTML found, strip tags for a readable plain text representation
  if (html) {
    const stripped = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();
    return stripped;
  }

  return "";
}

/**
 * Normalizes a raw Gmail message object into a clean, compact representation for LLM context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeGmailMessageForAgent(msg: any): AgentNormalizedEmail {
  if (!msg || typeof msg !== "object") {
    return {
      id: "unknown",
      sender: "Unknown",
      subject: "(No Subject)",
      snippet: "",
      date: "",
    };
  }

  const raw = msg.data || msg;
  const id = String(raw.id || raw.entityId || "unknown");
  const threadId = raw.threadId ? String(raw.threadId) : undefined;
  const labelIds: string[] = Array.isArray(raw.labelIds) ? raw.labelIds : [];

  const headers: MessageHeader[] = raw.payload?.headers || [];
  const getHeader = (name: string): string => {
    const found = headers.find(
      (h) => h?.name?.toLowerCase() === name.toLowerCase(),
    );
    return found?.value || "";
  };

  const rawFrom = raw.from || raw.sender || getHeader("from") || "Unknown";
  let sender = String(rawFrom).trim();
  let senderEmail = "";
  const fromMatch = rawFrom.match(/(.*)<(.+)>/);
  if (fromMatch) {
    sender = fromMatch[1].trim().replace(/^["']|["']$/g, "") || fromMatch[2].trim();
    senderEmail = fromMatch[2].trim();
  } else if (sender.includes("@")) {
    senderEmail = sender;
  }

  const rawTo = raw.to || getHeader("to") || "";
  let to = String(rawTo).trim();
  const toMatch = rawTo.match(/(.*)<(.+)>/);
  if (toMatch) {
    to = toMatch[1].trim().replace(/^["']|["']$/g, "") || toMatch[2].trim();
  }

  const cc = getHeader("cc") || raw.cc || undefined;
  const subject = raw.subject || getHeader("subject") || "(No Subject)";
  const snippet = raw.snippet || "";

  // Extract body
  let body = raw.bodyText || raw.body || extractTextBody(raw.payload);
  if (body && body.length > MAX_BODY_LENGTH) {
    body = `${body.slice(0, MAX_BODY_LENGTH)}\n\n[... Email body truncated for length (${body.length} characters total) ...]`;
  }

  // Parse Date
  const rawDate = raw.date || raw.internalDate || getHeader("date");
  let date = "";
  if (rawDate) {
    const num = Number(rawDate);
    const parsed = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      date = parsed.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });
    } else {
      date = String(rawDate);
    }
  }

  const isStarred = labelIds.includes("STARRED") || Boolean(raw.isStarred);
  const isUnread =
    labelIds.includes("UNREAD") ||
    Boolean(raw.isUnread) ||
    (!labelIds.includes("READ") && labelIds.length === 0);

  return {
    id,
    threadId,
    sender: sender || "Unknown",
    senderEmail: senderEmail || undefined,
    to: to || undefined,
    cc,
    subject,
    snippet,
    body: body || undefined,
    date,
    labelIds: labelIds.length > 0 ? labelIds : undefined,
    isStarred,
    isUnread,
  };
}

/**
 * Normalizes a Google Calendar event object into a clean, compact representation for LLM context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeCalendarEventForAgent(evt: any): AgentNormalizedCalendarEvent {
  if (!evt || typeof evt !== "object") {
    return {
      id: "unknown",
      summary: "(Untitled Event)",
      start: "",
      end: "",
    };
  }

  const raw = evt.data || evt;
  const id = String(raw.id || raw.entityId || "unknown");
  const summary = String(raw.summary || raw.title || "(Untitled Event)");
  const description = raw.description ? String(raw.description).trim() : undefined;
  const location = raw.location ? String(raw.location).trim() : undefined;

  const startVal = raw.start?.dateTime || raw.start?.date || raw.startTime || "";
  const endVal = raw.end?.dateTime || raw.end?.date || raw.endTime || "";
  const timeZone = raw.start?.timeZone || raw.end?.timeZone || raw.timeZone || undefined;

  const formatDate = (val: string) => {
    if (!val) return "";
    const parsed = new Date(val);
    if (isNaN(parsed.getTime())) return val;
    return parsed.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const start = formatDate(startVal) || String(startVal);
  const end = formatDate(endVal) || String(endVal);

  // Attendees
  const rawAttendees = Array.isArray(raw.attendees) ? raw.attendees : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attendees = rawAttendees.map((att: any) => {
    if (typeof att === "string") return { email: att };
    return {
      email: att.email || "",
      displayName: att.displayName || undefined,
      responseStatus: att.responseStatus || undefined,
    };
  }).filter((att: { email?: string }) => Boolean(att.email));

  const status = raw.status ? String(raw.status) : undefined;
  const htmlLink = raw.htmlLink ? String(raw.htmlLink) : undefined;
  const hangoutLink =
    raw.hangoutLink ||
    raw.conferenceData?.entryPoints?.[0]?.uri ||
    undefined;

  return {
    id,
    summary,
    description: description || undefined,
    location: location || undefined,
    start,
    end,
    timeZone,
    attendees: attendees.length > 0 ? attendees : undefined,
    status,
    htmlLink,
    hangoutLink,
  };
}
