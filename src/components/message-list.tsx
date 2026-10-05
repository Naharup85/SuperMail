"use client";

import React from "react";
import Link from "next/link";
import { NormalizedMessage } from "@/types/mail";
import { useConnections } from "@/hooks/use-connections";

interface MessageListProps {
  messages: NormalizedMessage[];
  isLoading: boolean;
  error: string | null;
  selectedMessageId: string | null;
  onSelectMessage: (msg: NormalizedMessage) => void;
  onRefresh: () => void;
  onConnectGmail: () => void;
  onToggleStar?: (msg: NormalizedMessage) => void;
  onToggleUnread?: (msg: NormalizedMessage) => void;
  onDeleteMessage?: (id: string) => void;
}

export function MessageList({
  messages,
  isLoading,
  error,
  selectedMessageId,
  onSelectMessage,
  onRefresh,
  onConnectGmail,
  onToggleStar,
  onToggleUnread,
  onDeleteMessage,
}: MessageListProps) {
  const { isGmailConnected } = useConnections();

  const handleStarClick = (e: React.MouseEvent, msg: NormalizedMessage) => {
    e.stopPropagation();
    if (onToggleStar) {
      onToggleStar(msg);
    }
  };

  const handleUnreadClick = (e: React.MouseEvent, msg: NormalizedMessage) => {
    e.stopPropagation();
    if (onToggleUnread) {
      onToggleUnread(msg);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDeleteMessage) {
      onDeleteMessage(id);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="divide-y divide-zinc-800/60">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <div
            key={n}
            className="flex items-center gap-4 px-4 py-3.5 animate-pulse"
          >
            <div className="h-4 w-4 rounded bg-zinc-800" />
            <div className="h-4 w-4 rounded-full bg-zinc-800" />
            <div className="h-4 w-32 rounded bg-zinc-800" />
            <div className="h-4 flex-1 rounded bg-zinc-800/60" />
            <div className="h-4 w-16 rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">
          Unable to Load Gmail Messages
        </h3>
        <p className="max-w-md text-xs text-zinc-400 mb-6">
          {error.includes("401") || error.includes("Unauthorized")
            ? "Your session may have expired, or Gmail OAuth is not yet connected for your account."
            : error}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Try Again
          </button>
          {!isGmailConnected && (
            <Link
              href="/api/corsair/connect/gmail"
              onClick={(e) => {
                e.preventDefault();
                onConnectGmail();
              }}
              className="rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:from-red-500 hover:to-rose-500"
            >
              Connect Gmail OAuth
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500 border border-zinc-800 mb-4">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-zinc-200 mb-1">
          No Messages Found
        </h3>
        <p className="max-w-md text-xs text-zinc-400 mb-6">
          Your inbox is either clear, or Gmail needs to be linked to sync your messages with Corsair.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Refresh Inbox
          </button>
          {!isGmailConnected && (
            <Link
              href="/api/corsair/connect/gmail"
              onClick={(e) => {
                e.preventDefault();
                onConnectGmail();
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-500"
            >
              Connect Gmail Account
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-900">
      {messages.map((msg) => {
        const isSelected = selectedMessageId === msg.id;
        return (
          <div
            key={msg.id}
            onClick={() => onSelectMessage(msg)}
            className={`group relative flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors ${
              isSelected
                ? "bg-zinc-800/90 border-l-2 border-indigo-500"
                : msg.isUnread
                  ? "bg-zinc-900/60 hover:bg-zinc-800/60"
                  : "hover:bg-zinc-900/40"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Unread indicator */}
              {msg.isUnread ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
              ) : (
                <span className="h-2 w-2 shrink-0" />
              )}

              {/* Star toggle */}
              <button
                type="button"
                onClick={(e) => handleStarClick(e, msg)}
                aria-label={msg.isStarred ? "Unstar message" : "Star message"}
                className={`shrink-0 transition-transform active:scale-125 ${
                  msg.isStarred
                    ? "text-amber-400"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill={msg.isStarred ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={msg.isStarred ? "0" : "1.5"}
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>

              {/* Sender */}
              <div className="w-36 shrink-0 truncate sm:w-44">
                <span
                  className={`text-xs ${
                    msg.isUnread
                      ? "font-bold text-zinc-100"
                      : "font-medium text-zinc-300"
                  }`}
                >
                  {msg.sender}
                </span>
              </div>

              {/* Subject + Snippet */}
              <div className="min-w-0 flex-1 flex items-baseline gap-2">
                <span
                  className={`truncate text-xs ${
                    msg.isUnread
                      ? "font-semibold text-zinc-100"
                      : "text-zinc-300"
                  }`}
                >
                  {msg.subject}
                </span>
                {msg.snippet && (
                  <span className="hidden truncate text-xs text-zinc-500 md:inline-block">
                    - {msg.snippet}
                  </span>
                )}
              </div>
            </div>

            {/* Right side: Actions on hover & Date */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick actions (visible on hover) */}
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => handleUnreadClick(e, msg)}
                  title={msg.isUnread ? "Mark read" : "Mark unread"}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClick(e, msg.id)}
                  title="Delete message"
                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Date */}
              <span
                className={`text-[11px] ${
                  msg.isUnread
                    ? "font-semibold text-indigo-300"
                    : "text-zinc-500"
                }`}
              >
                {msg.date || "Recent"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
