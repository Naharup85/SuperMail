export type MailFolder =
  | "inbox"
  | "starred"
  | "sent"
  | "drafts"
  | "calendar"
  | "ai"
  | "settings";

export interface NormalizedMessage {
  id: string;
  threadId?: string;
  sender: string;
  senderEmail?: string;
  to?: string;
  toEmail?: string;
  cc?: string;
  subject: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  date: string;
  rawDate?: Date | null;
  labelIds: string[];
  isStarred: boolean;
  isUnread: boolean;
}

export interface ThreadMessage extends NormalizedMessage {
  order?: number;
}

export interface EventAttendee {
  email?: string;
  displayName?: string;
  responseStatus?: "needsAction" | "declined" | "tentative" | "accepted" | string;
  self?: boolean;
  organizer?: boolean;
}

export interface EventOrganizer {
  email?: string;
  displayName?: string;
  self?: boolean;
}

export interface NormalizedEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  rawStart?: Date | null;
  rawEnd?: Date | null;
  rawStartStr?: string;
  rawEndStr?: string;
  hangoutLink?: string;
  htmlLink?: string;
  status?: string;
  attendeesCount?: number;
  attendees?: EventAttendee[];
  organizer?: EventOrganizer;
  creator?: EventOrganizer;
  isAllDay?: boolean;
  colorId?: string;
}

interface MessageHeaderLike {
  name?: string;
  value?: string;
}

interface MessagePartBodyLike {
  data?: string;
  size?: number;
}

interface MessagePartLike {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: MessageHeaderLike[];
  body?: MessagePartBodyLike;
  parts?: MessagePartLike[];
}

interface GenericMessageObject {
  id?: string;
  entityId?: string;
  threadId?: string;
  labelIds?: string[];
  from?: string;
  to?: string;
  sender?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  date?: string;
  internalDate?: string;
  createdAt?: string;
  isStarred?: boolean;
  isUnread?: boolean;
  payload?: MessagePartLike;
  data?: GenericMessageObject;
}

interface GenericEventObject {
  id?: string;
  entityId?: string;
  summary?: string;
  title?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  status?: string;
  colorId?: string;
  attendees?: EventAttendee[];
  organizer?: EventOrganizer;
  creator?: EventOrganizer;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  conferenceData?: {
    entryPoints?: Array<{
      uri?: string;
    }>;
  };
  data?: GenericEventObject;
}

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

export function extractBodyFromPayload(
  payload?: MessagePartLike,
): { text: string; html: string } {
  let text = "";
  let html = "";
  if (!payload) return { text, html };

  const traverse = (part?: MessagePartLike) => {
    if (!part) return;
    const mime = part.mimeType?.toLowerCase() || "";
    const rawData = part.body?.data;

    if (rawData) {
      if (mime === "text/html" && !html) {
        html = decodeBase64Url(rawData);
      } else if (mime === "text/plain" && !text) {
        text = decodeBase64Url(rawData);
      }
    }

    if (Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  };

  if (payload.body?.data) {
    const rootMime = payload.mimeType?.toLowerCase() || "";
    if (rootMime === "text/html") {
      html = decodeBase64Url(payload.body.data);
    } else {
      text = decodeBase64Url(payload.body.data);
    }
  }

  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      traverse(part);
    }
  }

  return { text, html };
}

export function parseGmailMessage(
  msg: unknown,
  index: number = 0,
): NormalizedMessage {
  if (!msg || typeof msg !== "object") {
    return {
      id: `msg-${index}`,
      sender: "Unknown Sender",
      subject: "(No Subject)",
      snippet: "",
      date: "",
      labelIds: [],
      isStarred: false,
      isUnread: false,
    };
  }

  const obj = msg as GenericMessageObject;
  const item = obj.data || obj;
  const id = item.id || item.entityId || obj.id || `msg-${index}`;
  const threadId = item.threadId || obj.threadId;
  const labelIds: string[] = Array.isArray(item.labelIds)
    ? item.labelIds
    : Array.isArray(obj.labelIds)
      ? obj.labelIds
      : [];

  const headers = item.payload?.headers || obj.payload?.headers || [];
  const getHeader = (name: string): string | undefined => {
    if (!Array.isArray(headers)) return undefined;
    const found = headers.find(
      (h) => h?.name?.toLowerCase() === name.toLowerCase(),
    );
    return found?.value;
  };

  const rawFrom =
    item.from ||
    item.sender ||
    getHeader("from") ||
    obj.from ||
    obj.sender ||
    "Unknown Sender";

  let sender = String(rawFrom).trim();
  let senderEmail = "";
  const fromMatch = rawFrom.match(/(.*)<(.+)>/);
  if (fromMatch) {
    sender = fromMatch[1].trim().replace(/^["']|["']$/g, "") || fromMatch[2].trim();
    senderEmail = fromMatch[2].trim();
  } else if (sender.includes("@")) {
    senderEmail = sender;
  }

  const rawTo = item.to || getHeader("to") || obj.to || "";
  let to = String(rawTo).trim();
  let toEmail = "";
  const toMatch = rawTo.match(/(.*)<(.+)>/);
  if (toMatch) {
    to = toMatch[1].trim().replace(/^["']|["']$/g, "") || toMatch[2].trim();
    toEmail = toMatch[2].trim();
  } else if (to.includes("@")) {
    toEmail = to;
  }

  const cc = getHeader("cc") || "";

  const subject =
    item.subject ||
    getHeader("subject") ||
    obj.subject ||
    "(No Subject)";

  const snippet =
    item.snippet ||
    obj.snippet ||
    item.body ||
    obj.body ||
    "";

  // Extract body if available in payload or item
  const payloadExtracted = extractBodyFromPayload(item.payload || obj.payload);
  const bodyText = payloadExtracted.text || item.body || obj.body || "";
  const bodyHtml = payloadExtracted.html || "";

  const rawDateStr =
    item.date ||
    item.internalDate ||
    getHeader("date") ||
    obj.date ||
    obj.internalDate ||
    item.createdAt ||
    obj.createdAt;

  let date = "";
  let rawDate: Date | null = null;
  if (rawDateStr) {
    const numeric = Number(rawDateStr);
    if (!isNaN(numeric) && numeric > 1000000000) {
      rawDate = new Date(numeric);
    } else {
      const parsed = new Date(rawDateStr);
      if (!isNaN(parsed.getTime())) {
        rawDate = parsed;
      }
    }
  }

  if (rawDate) {
    const now = new Date();
    const isToday = rawDate.toDateString() === now.toDateString();
    if (isToday) {
      date = rawDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } else {
      date = rawDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  }

  const isStarred =
    labelIds.includes("STARRED") ||
    Boolean(item.isStarred) ||
    Boolean(obj.isStarred);

  const isUnread =
    labelIds.includes("UNREAD") ||
    Boolean(item.isUnread) ||
    Boolean(obj.isUnread) ||
    (!labelIds.includes("READ") && labelIds.length === 0);

  return {
    id,
    threadId,
    sender: sender || "Unknown",
    senderEmail,
    to: to || undefined,
    toEmail: toEmail || undefined,
    cc: cc || undefined,
    subject: subject || "(No Subject)",
    snippet,
    bodyText: bodyText || undefined,
    bodyHtml: bodyHtml || undefined,
    date,
    rawDate,
    labelIds,
    isStarred,
    isUnread,
  };
}

export function parseCalendarEvent(
  evt: unknown,
  index: number = 0,
): NormalizedEvent {
  if (!evt || typeof evt !== "object") {
    return {
      id: `evt-${index}`,
      summary: "(Untitled Event)",
    };
  }

  const obj = evt as GenericEventObject;
  const item = obj.data || obj;
  const id = item.id || item.entityId || obj.id || `evt-${index}`;
  const summary = item.summary || item.title || "(Untitled Event)";
  const description = item.description || "";
  const location = item.location || "";
  const colorId = item.colorId;
  const hangoutLink =
    item.hangoutLink ||
    item.conferenceData?.entryPoints?.[0]?.uri ||
    "";
  const htmlLink = item.htmlLink || "";
  const status = item.status || "confirmed";
  const attendees = Array.isArray(item.attendees) ? item.attendees : [];
  const attendeesCount = attendees.length;
  const organizer = item.organizer;
  const creator = item.creator;

  const startVal =
    item.start?.dateTime || item.start?.date || item.startTime;
  const endVal =
    item.end?.dateTime || item.end?.date || item.endTime;
  const timeZone =
    item.start?.timeZone || item.end?.timeZone || item.timeZone || "";

  let rawStart: Date | null = startVal ? new Date(startVal) : null;
  if (rawStart && isNaN(rawStart.getTime())) rawStart = null;

  let rawEnd: Date | null = endVal ? new Date(endVal) : null;
  if (rawEnd && isNaN(rawEnd.getTime())) rawEnd = null;

  const isAllDay = !item.start?.dateTime && Boolean(item.start?.date);

  const formatTime = (d: Date | null, allDay: boolean) => {
    if (!d) return "";
    if (allDay) {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return {
    id,
    summary,
    description,
    location,
    startTime: formatTime(rawStart, isAllDay),
    endTime: formatTime(rawEnd, isAllDay),
    timeZone,
    rawStart,
    rawEnd,
    rawStartStr: startVal,
    rawEndStr: endVal,
    hangoutLink,
    htmlLink,
    status,
    attendeesCount,
    attendees,
    organizer,
    creator,
    isAllDay,
    colorId,
  };
}
