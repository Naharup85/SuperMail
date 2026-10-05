"use client";

import React, { useState } from "react";
import { NormalizedMessage } from "@/types/mail";
import { useGmailMessage, useGmailThread, useMailMutations } from "@/hooks/use-mail";

interface MailDetailProps {
  message: NormalizedMessage;
  onBack: () => void;
  onConnectGmail: () => void;
  onMessageUpdated?: (updated: NormalizedMessage) => void;
  onMessageDeleted?: (id: string) => void;
}

export function MailDetail({
  message,
  onBack,
  onMessageUpdated,
  onMessageDeleted,
}: MailDetailProps) {
  // Use TanStack Query detail & thread caching
  const { data: fetchedMessage } = useGmailMessage(message.id);
  const { data: threadMessages, isLoading: isLoadingThread } = useGmailThread(
    message.threadId,
  );

  const currentMessage =
    (threadMessages &&
      threadMessages.find((m: NormalizedMessage) => m.id === message.id)) ||
    fetchedMessage ||
    message;

  const isStarred = currentMessage.isStarred;
  const isUnread = currentMessage.isUnread;

  const { modifyMessage, trashMessage, sendMessage } = useMailMutations();

  // Quick reply state
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  // Handle Star toggle
  const handleToggleStar = async () => {
    const nextStarred = !isStarred;
    try {
      await modifyMessage.mutateAsync({
        id: currentMessage.id,
        threadId: currentMessage.threadId,
        addLabelIds: nextStarred ? ["STARRED"] : [],
        removeLabelIds: nextStarred ? [] : ["STARRED"],
      });

      const updated = {
        ...currentMessage,
        isStarred: nextStarred,
        labelIds: nextStarred
          ? [...currentMessage.labelIds, "STARRED"]
          : currentMessage.labelIds.filter((l) => l !== "STARRED"),
      };
      if (onMessageUpdated) onMessageUpdated(updated);
    } catch {
      // Reverted automatically by query state
    }
  };

  // Handle Read/Unread toggle
  const handleToggleUnread = async () => {
    const nextUnread = !isUnread;
    try {
      await modifyMessage.mutateAsync({
        id: currentMessage.id,
        threadId: currentMessage.threadId,
        addLabelIds: nextUnread ? ["UNREAD"] : [],
        removeLabelIds: nextUnread ? [] : ["UNREAD"],
      });

      const updated = {
        ...currentMessage,
        isUnread: nextUnread,
        labelIds: nextUnread
          ? [...currentMessage.labelIds, "UNREAD"]
          : currentMessage.labelIds.filter((l) => l !== "UNREAD"),
      };
      if (onMessageUpdated) onMessageUpdated(updated);
    } catch {
      // Reverted
    }
  };

  // Handle Trash / Delete
  const handleDelete = async () => {
    try {
      await trashMessage.mutateAsync({
        id: currentMessage.id,
        threadId: currentMessage.threadId,
      });
      if (onMessageDeleted) onMessageDeleted(currentMessage.id);
      onBack();
    } catch {
      // Handled
    }
  };

  // Handle Send Reply
  const handleSendReply = async () => {
    if (!replyBody.trim()) return;
    setReplyError(null);

    const recipient = currentMessage.senderEmail || currentMessage.sender;
    const replySubject = currentMessage.subject.startsWith("Re:")
      ? currentMessage.subject
      : `Re: ${currentMessage.subject}`;

    try {
      await sendMessage.mutateAsync({
        to: recipient,
        subject: replySubject,
        body: replyBody,
        threadId: currentMessage.threadId,
        inReplyTo: currentMessage.id,
      });

      setReplyBody("");
      setShowReplyBox(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reply";
      setReplyError(msg);
    }
  };

  const messagesToRender =
    threadMessages && threadMessages.length > 0
      ? threadMessages
      : [currentMessage];

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 sm:px-6 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="hidden sm:inline">Back to list</span>
          </button>
        </div>

        {/* Message Actions */}
        <div className="flex items-center gap-1.5">
          {/* Star Toggle */}
          <button
            type="button"
            onClick={handleToggleStar}
            disabled={modifyMessage.isPending}
            title={isStarred ? "Unstar" : "Star"}
            className={`p-2 rounded-lg border border-zinc-800 transition-colors ${
              isStarred
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                : "bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill={isStarred ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={isStarred ? "0" : "1.5"}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>

          {/* Mark Unread */}
          <button
            type="button"
            onClick={handleToggleUnread}
            disabled={modifyMessage.isPending}
            title={isUnread ? "Mark as read" : "Mark as unread"}
            className={`p-2 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </button>

          {/* Trash */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={trashMessage.isPending}
            title="Delete / Move to trash"
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Reply Button */}
          <button
            type="button"
            onClick={() => setShowReplyBox(!showReplyBox)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>Reply</span>
          </button>
        </div>
      </div>

      {/* Message & Thread content container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Subject header */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
              {currentMessage.subject}
            </h2>
            {messagesToRender.length > 1 && (
              <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                {messagesToRender.length} messages in thread
              </span>
            )}
          </div>

          {currentMessage.labelIds && currentMessage.labelIds.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {currentMessage.labelIds.map((label) => (
                <span
                  key={label}
                  className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Thread Messages Stream */}
        {isLoadingThread && (
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Loading full thread history...</span>
          </div>
        )}

        <div className="space-y-6">
          {messagesToRender.map((msg, idx) => {
            const senderInitials = msg.sender
              ? msg.sender
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "U";

            return (
              <div
                key={msg.id || idx}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-6 transition-all"
              >
                {/* Sender & Recipient Bar */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-sm font-semibold text-white shadow-md shadow-indigo-500/20">
                      {senderInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-100">
                          {msg.sender}
                        </span>
                        {msg.senderEmail && (
                          <span className="text-xs text-zinc-500">
                            &lt;{msg.senderEmail}&gt;
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                        <span>To: {msg.to || "Me"}</span>
                        {msg.cc && <span>&bull; Cc: {msg.cc}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-medium text-zinc-400">
                      {msg.date}
                    </span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="pt-2 text-sm leading-relaxed text-zinc-200">
                  {msg.bodyHtml ? (
                    <div
                      className="overflow-x-auto break-words [&_a]:text-indigo-400 [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: msg.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.bodyText || msg.snippet || "(No content available for this message)"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Reply Form */}
        {showReplyBox && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4 sm:p-5 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-200">
                Replying to {currentMessage.sender}
              </span>
              <button
                type="button"
                onClick={() => setShowReplyBox(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Cancel
              </button>
            </div>

            {replyError && (
              <p className="mb-2 text-xs text-red-400">{replyError}</p>
            )}

            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none resize-none leading-relaxed"
              autoFocus
            />

            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-[11px] text-zinc-500">
                To: {currentMessage.senderEmail || currentMessage.sender}
              </span>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={sendMessage.isPending || !replyBody.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {sendMessage.isPending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
