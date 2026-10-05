"use client";

import React, { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { ChatMessage } from "./chat-message";
import { PromptSuggestions } from "./prompt-suggestions";
import { useConnections } from "@/hooks/use-connections";

interface AIChatProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  className?: string;
  onConnectService?: (service: "gmail" | "calendar") => void;
}

export function AIChat({ user, className = "", onConnectService }: AIChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isGmailConnected, isCalendarConnected } = useConnections();

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    clearError,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Handle form submission
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await sendMessage({ text });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Handle keydown for textarea (Enter to send, Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden bg-zinc-950 text-zinc-100 ${className}`}
    >
      {/* Top Bar / Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/40 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/20">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-zinc-100">SuperMail AI</h2>
              <span className="rounded bg-indigo-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-400 border border-indigo-500/20">
                READ-ONLY
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              Personal Gmail & Google Calendar Assistant
            </p>
          </div>
        </div>

        {/* Integration Status Badges & Reset Button */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 border ${
                isGmailConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isGmailConnected ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              Gmail
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 border ${
                isCalendarConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isCalendarConnected ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              Calendar
            </span>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
              title="Clear conversation history"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col justify-center px-4 py-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/25">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-zinc-100">
                How can I help with your mail & calendar?
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Ask questions about your emails, threads, schedule, or availability.
              </p>
            </div>

            {/* Missing Connections Warning */}
            {(!isGmailConnected || !isCalendarConnected) && (
              <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                <p className="font-semibold">Integrations Notice:</p>
                <p className="mt-0.5 text-amber-300/80">
                  {!isGmailConnected && !isCalendarConnected
                    ? "Neither Gmail nor Calendar is connected. Connect them to search emails and view meetings."
                    : !isGmailConnected
                      ? "Gmail is not connected. Connect Gmail to enable email searches."
                      : "Google Calendar is not connected. Connect Calendar to check meetings and availability."}
                </p>
                {onConnectService && (
                  <div className="mt-2 flex gap-2">
                    {!isGmailConnected && (
                      <button
                        type="button"
                        onClick={() => onConnectService("gmail")}
                        className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                      >
                        Connect Gmail &rarr;
                      </button>
                    )}
                    {!isCalendarConnected && (
                      <button
                        type="button"
                        onClick={() => onConnectService("calendar")}
                        className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                      >
                        Connect Calendar &rarr;
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Prompt Suggestions */}
            <PromptSuggestions
              onSelectPrompt={handleSend}
              disabled={isLoading}
            />
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              userImage={user?.image}
              userName={user?.name}
            />
          ))
        )}

        {/* Streaming/Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 bg-zinc-950/40 px-4 py-3 text-xs text-zinc-400">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600">
              <svg
                className="h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-300">Thinking & retrieving data...</span>
              <button
                type="button"
                onClick={stop}
                className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center justify-between border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-red-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error.message || "An error occurred while generating a response."}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-[11px] font-semibold text-red-400 hover:text-red-300 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-zinc-800/80 bg-zinc-900/30 p-3 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          <div className="relative flex items-end rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 transition-all focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask SuperMail about your emails or calendar (e.g., 'What meetings do I have tomorrow?')..."
              rows={1}
              disabled={isLoading}
              className="max-h-32 min-h-[24px] w-full resize-none bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none leading-relaxed"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send message (Enter)"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-zinc-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>Read-only agent with tenant isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
