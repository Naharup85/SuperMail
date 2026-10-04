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
  const { limit = 20, offset = 0 } = options;

  return corsair.withTenant(tenantId).gmail.db.messages.search({
    limit,
    offset,
  });
}

export async function getGmailMessage(tenantId: string, messageId: string) {
  try {
    return await corsair.withTenant(tenantId).gmail.api.messages.get({
      id: messageId,
      format: "full",
    });
  } catch {
    // Fallback to database cache if API direct fetch fails
    return await corsair
      .withTenant(tenantId)
      .gmail.db.messages.findByEntityId(messageId);
  }
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
