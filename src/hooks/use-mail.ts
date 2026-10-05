"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NormalizedMessage, parseGmailMessage } from "@/types/mail";

export const GMAIL_MESSAGES_KEY = "gmail-messages";
export const GMAIL_MESSAGE_KEY = "gmail-message";
export const GMAIL_THREAD_KEY = "gmail-thread";

export interface UseGmailMessagesOptions {
  page?: number;
  pageSize?: number;
}

export function useGmailMessages({
  page = 1,
  pageSize = 20,
}: UseGmailMessagesOptions = {}) {
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  return useQuery<NormalizedMessage[]>({
    queryKey: [GMAIL_MESSAGES_KEY, page],
    queryFn: async () => {
      const res = await fetch(
        `/api/gmail/messages?limit=${limit}&offset=${offset}`,
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error || `Failed to fetch messages (Status: ${res.status})`,
        );
      }
      const data = await res.json();
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.messages)
          ? data.messages
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.data)
              ? data.data
              : [];

      return rawList.map((m: unknown, idx: number) =>
        parseGmailMessage(m, idx),
      );
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useGmailMessage(messageId: string | null | undefined) {
  return useQuery<NormalizedMessage>({
    queryKey: [GMAIL_MESSAGE_KEY, messageId],
    queryFn: async () => {
      if (!messageId) throw new Error("Message ID required");
      const res = await fetch(`/api/gmail/messages/${messageId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error || `Failed to fetch message (Status: ${res.status})`,
        );
      }
      const data = await res.json();
      return parseGmailMessage(data);
    },
    enabled: Boolean(messageId),
    staleTime: 60 * 1000,
  });
}

export function useGmailThread(threadId: string | null | undefined) {
  return useQuery<NormalizedMessage[]>({
    queryKey: [GMAIL_THREAD_KEY, threadId],
    queryFn: async () => {
      if (!threadId) throw new Error("Thread ID required");
      const res = await fetch(`/api/gmail/threads/${threadId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error || `Failed to fetch thread (Status: ${res.status})`,
        );
      }
      const threadData = await res.json();
      const rawMsgs = Array.isArray(threadData?.messages)
        ? threadData.messages
        : Array.isArray(threadData)
          ? threadData
          : [];

      return rawMsgs.map((m: unknown, idx: number) =>
        parseGmailMessage(m, idx),
      );
    },
    enabled: Boolean(threadId),
    staleTime: 60 * 1000,
  });
}

export function useMailMutations() {
  const queryClient = useQueryClient();

  const modifyMessage = useMutation({
    mutationFn: async ({
      id,
      addLabelIds = [],
      removeLabelIds = [],
    }: {
      id: string;
      addLabelIds?: string[];
      removeLabelIds?: string[];
      threadId?: string;
    }) => {
      const res = await fetch(`/api/gmail/messages/${id}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addLabelIds, removeLabelIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to modify message");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: [GMAIL_MESSAGES_KEY] });
      queryClient.invalidateQueries({
        queryKey: [GMAIL_MESSAGE_KEY, variables.id],
      });
      if (variables.threadId) {
        queryClient.invalidateQueries({
          queryKey: [GMAIL_THREAD_KEY, variables.threadId],
        });
      }
    },
  });

  const trashMessage = useMutation({
    mutationFn: async ({
      id,
    }: {
      id: string;
      threadId?: string;
    }) => {
      const res = await fetch(`/api/gmail/messages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to trash message");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [GMAIL_MESSAGES_KEY] });
      queryClient.invalidateQueries({
        queryKey: [GMAIL_MESSAGE_KEY, variables.id],
      });
      if (variables.threadId) {
        queryClient.invalidateQueries({
          queryKey: [GMAIL_THREAD_KEY, variables.threadId],
        });
      }
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (payload: {
      to: string;
      subject: string;
      body: string;
      threadId?: string;
      inReplyTo?: string;
      cc?: string;
    }) => {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [GMAIL_MESSAGES_KEY] });
      if (variables.threadId) {
        queryClient.invalidateQueries({
          queryKey: [GMAIL_THREAD_KEY, variables.threadId],
        });
      }
    },
  });

  const createDraft = useMutation({
    mutationFn: async (payload: {
      to?: string;
      subject?: string;
      body?: string;
      threadId?: string;
    }) => {
      const res = await fetch("/api/gmail/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save draft");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GMAIL_MESSAGES_KEY] });
    },
  });

  return {
    modifyMessage,
    trashMessage,
    sendMessage,
    createDraft,
  };
}
