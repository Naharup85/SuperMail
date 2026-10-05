"use client";

import React, { useState } from "react";
import { MailFolder, NormalizedMessage } from "@/types/mail";
import { MessageList } from "@/components/message-list";
import { MailDetail } from "@/components/mail-detail";
import { useMailMutations } from "@/hooks/use-mail";

interface InboxProps {
  activeFolder: MailFolder;
  messages: NormalizedMessage[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  onRefresh: () => void;
  onConnectGmail: () => void;
  onOpenCompose?: () => void;
  onUpdateMessage?: (updated: NormalizedMessage) => void;
  onDeleteMessage?: (id: string) => void;
  currentPage?: number;
  pageSize?: number;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export function Inbox({
  activeFolder,
  messages,
  isLoading,
  error,
  searchQuery,
  onRefresh,
  onConnectGmail,
  onOpenCompose,
  onUpdateMessage,
  onDeleteMessage,
  currentPage = 1,
  pageSize = 20,
  onNextPage,
  onPrevPage,
}: InboxProps) {
  const [selectedMessage, setSelectedMessage] = useState<NormalizedMessage | null>(null);
  const { modifyMessage, trashMessage } = useMailMutations();

  // Filter messages based on activeFolder and search query
  const filteredMessages = messages.filter((msg) => {
    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSender = msg.sender.toLowerCase().includes(q);
      const matchSubject = msg.subject.toLowerCase().includes(q);
      const matchSnippet = msg.snippet.toLowerCase().includes(q);
      if (!matchSender && !matchSubject && !matchSnippet) return false;
    }

    // Folder filtering
    if (activeFolder === "starred") {
      return msg.isStarred;
    }
    if (activeFolder === "sent") {
      return msg.labelIds.includes("SENT") || msg.sender.toLowerCase().includes("me");
    }
    if (activeFolder === "drafts") {
      return msg.labelIds.includes("DRAFT");
    }
    return true;
  });

  // Client-side slice for current page if not already paged by API
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const displayList = paginatedMessages.length > 0 ? paginatedMessages : filteredMessages;

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize));


  const getFolderTitle = () => {
    switch (activeFolder) {
      case "starred":
        return "Starred Messages";
      case "sent":
        return "Sent Mail";
      case "drafts":
        return "Drafts";
      default:
        return "Inbox";
    }
  };

  const handleToggleStar = async (msg: NormalizedMessage) => {
    const nextStarred = !msg.isStarred;
    const updated = {
      ...msg,
      isStarred: nextStarred,
      labelIds: nextStarred
        ? [...msg.labelIds, "STARRED"]
        : msg.labelIds.filter((l) => l !== "STARRED"),
    };
    if (onUpdateMessage) onUpdateMessage(updated);

    try {
      await modifyMessage.mutateAsync({
        id: msg.id,
        threadId: msg.threadId,
        addLabelIds: nextStarred ? ["STARRED"] : [],
        removeLabelIds: nextStarred ? [] : ["STARRED"],
      });
    } catch {
      // Revert if error
      if (onUpdateMessage) onUpdateMessage(msg);
    }
  };

  const handleToggleUnread = async (msg: NormalizedMessage) => {
    const nextUnread = !msg.isUnread;
    const updated = {
      ...msg,
      isUnread: nextUnread,
      labelIds: nextUnread
        ? [...msg.labelIds, "UNREAD"]
        : msg.labelIds.filter((l) => l !== "UNREAD"),
    };
    if (onUpdateMessage) onUpdateMessage(updated);

    try {
      await modifyMessage.mutateAsync({
        id: msg.id,
        threadId: msg.threadId,
        addLabelIds: nextUnread ? ["UNREAD"] : [],
        removeLabelIds: nextUnread ? [] : ["UNREAD"],
      });
    } catch {
      if (onUpdateMessage) onUpdateMessage(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (onDeleteMessage) onDeleteMessage(id);
    try {
      await trashMessage.mutateAsync({ id });
    } catch {
      onRefresh();
    }
  };

  if (selectedMessage) {
    return (
      <MailDetail
        message={selectedMessage}
        onBack={() => setSelectedMessage(null)}
        onConnectGmail={onConnectGmail}
        onMessageUpdated={(updated) => {
          setSelectedMessage(updated);
          if (onUpdateMessage) onUpdateMessage(updated);
        }}
        onMessageDeleted={(id) => {
          setSelectedMessage(null);
          if (onDeleteMessage) onDeleteMessage(id);
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Subheader / Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold capitalize text-zinc-100">
            {getFolderTitle()}
          </h1>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {filteredMessages.length} {filteredMessages.length === 1 ? "conversation" : "conversations"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Compose quick button */}
          {onOpenCompose && (
            <button
              type="button"
              onClick={onOpenCompose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Compose</span>
            </button>
          )}

          {/* Pagination controls */}
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
            <span className="text-[11px] text-zinc-500 px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
              title="Previous page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
              title="Next page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50 ml-1"
          >
            <svg
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Message List Body */}
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={displayList}
          isLoading={isLoading}
          error={error}
          selectedMessageId={null}
          onSelectMessage={(msg) => setSelectedMessage(msg)}
          onRefresh={onRefresh}
          onConnectGmail={onConnectGmail}
          onToggleStar={handleToggleStar}
          onToggleUnread={handleToggleUnread}
          onDeleteMessage={handleDelete}
        />
      </div>
    </div>
  );
}
