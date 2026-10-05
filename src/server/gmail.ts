import { corsair } from "./corsair";

export interface ListGmailMessagesOptions {
  limit?: number;
  offset?: number;
  q?: string;
  folder?: string;
}

export interface SendGmailMessageOptions {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  cc?: string;
}

export interface CreateGmailDraftOptions {
  to?: string;
  subject?: string;
  body?: string;
  threadId?: string;
}

/**
 * Creates an RFC 2822 compliant email string and encodes it as base64url.
 */
export function buildRawEmail(options: {
  to?: string;
  subject?: string;
  body?: string;
  inReplyTo?: string;
  cc?: string;
}): string {
  const headers: string[] = [];

  if (options.to) {
    headers.push(`To: ${options.to}`);
  }
  if (options.cc) {
    headers.push(`Cc: ${options.cc}`);
  }
  if (options.subject) {
    headers.push(`Subject: ${options.subject}`);
  }
  if (options.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
    headers.push(`References: ${options.inReplyTo}`);
  }

  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push("MIME-Version: 1.0");

  const email = `${headers.join("\r\n")}\r\n\r\n${options.body || ""}`;

  return Buffer.from(email, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function listGmailMessages(
  tenantId: string,
  options: ListGmailMessagesOptions = {},
) {
  const { limit = 20, q, folder } = options;

  // Build query parameter if folder is provided
  let query = q || "";
  if (folder) {
    if (folder === "starred") {
      query = query ? `${query} is:starred` : "is:starred";
    } else if (folder === "sent") {
      query = query ? `${query} is:sent` : "is:sent";
    } else if (folder === "drafts") {
      query = query ? `${query} is:draft` : "is:draft";
    } else if (folder === "inbox") {
      query = query ? `${query} in:inbox` : "in:inbox";
    }
  }

  const listRes = await corsair.withTenant(tenantId).gmail.api.messages.list({
    maxResults: limit,
    q: query || undefined,
    includeSpamTrash: false,
  });

  if (!listRes.messages || listRes.messages.length === 0) {
    return {
      messages: [],
      nextPageToken: listRes.nextPageToken,
      resultSizeEstimate: listRes.resultSizeEstimate,
    };
  }

  // Fetch full details for each message directly from Gmail API
  const messages = await Promise.all(
    listRes.messages.map(async (item) => {
      if (!item.id) return item;
      try {
        return await corsair.withTenant(tenantId).gmail.api.messages.get({
          id: item.id,
          format: "full",
        });
      } catch (err) {
        console.error(`Failed to fetch message details for ${item.id}:`, err);
        return item;
      }
    }),
  );

  return {
    messages,
    nextPageToken: listRes.nextPageToken,
    resultSizeEstimate: listRes.resultSizeEstimate,
  };
}

export async function getGmailMessage(tenantId: string, messageId: string) {
  return await corsair.withTenant(tenantId).gmail.api.messages.get({
    id: messageId,
    format: "full",
  });
}

export async function getGmailThread(tenantId: string, threadId: string) {
  return await corsair.withTenant(tenantId).gmail.api.threads.get({
    id: threadId,
    format: "full",
  });
}

export async function modifyGmailMessage(
  tenantId: string,
  messageId: string,
  options: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
  },
) {
  return await corsair.withTenant(tenantId).gmail.api.messages.modify({
    id: messageId,
    addLabelIds: options.addLabelIds,
    removeLabelIds: options.removeLabelIds,
  });
}

export async function trashGmailMessage(tenantId: string, messageId: string) {
  return await corsair.withTenant(tenantId).gmail.api.messages.trash({
    id: messageId,
  });
}

export async function untrashGmailMessage(tenantId: string, messageId: string) {
  return await corsair.withTenant(tenantId).gmail.api.messages.untrash({
    id: messageId,
  });
}

export async function deleteGmailMessage(tenantId: string, messageId: string) {
  return await corsair.withTenant(tenantId).gmail.api.messages.delete({
    id: messageId,
  });
}

export async function sendGmailMessage(
  tenantId: string,
  options: SendGmailMessageOptions,
) {
  const raw = buildRawEmail({
    to: options.to,
    subject: options.subject,
    body: options.body,
    inReplyTo: options.inReplyTo,
    cc: options.cc,
  });

  return await corsair.withTenant(tenantId).gmail.api.messages.send({
    raw,
    threadId: options.threadId,
  });
}

export async function createGmailDraft(
  tenantId: string,
  options: CreateGmailDraftOptions,
) {
  const raw = buildRawEmail({
    to: options.to,
    subject: options.subject,
    body: options.body,
  });

  return await corsair.withTenant(tenantId).gmail.api.drafts.create({
    draft: {
      message: {
        raw,
        threadId: options.threadId,
      },
    },
  });
}
