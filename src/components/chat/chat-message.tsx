"use client";

import React from "react";
import type { UIMessage } from "ai";
import { ToolActivity } from "./tool-activity";

interface ChatMessageProps {
  message: UIMessage;
  userImage?: string | null;
  userName?: string | null;
}

/**
 * Basic markdown line formatter for bold, italics, bullets, and inline code.
 */
function FormattedText({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Bullet point
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const bulletText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-400 mt-1">&#8226;</span>
              <span>{renderInlineMarkdown(bulletText)}</span>
            </div>
          );
        }

        // Numbered list
        const numberMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numberMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-semibold text-indigo-400">{numberMatch[1]}.</span>
              <span>{renderInlineMarkdown(numberMatch[2])}</span>
            </div>
          );
        }

        // Blank line
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        return <p key={idx}>{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Simple regex parser for `code`, **bold**, *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  while (remaining.length > 0) {
    // Check for inline code `...`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
    // Check for bold **...**
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);

    if (codeMatch && (!boldMatch || codeMatch[1].length < boldMatch[1].length)) {
      if (codeMatch[1]) {
        parts.push(codeMatch[1]);
      }
      parts.push(
        <code
          key={`code-${keyCounter++}`}
          className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[11px] text-indigo-300 border border-zinc-700/50"
        >
          {codeMatch[2]}
        </code>,
      );
      remaining = codeMatch[3];
    } else if (boldMatch) {
      if (boldMatch[1]) {
        parts.push(boldMatch[1]);
      }
      parts.push(
        <strong key={`bold-${keyCounter++}`} className="font-semibold text-zinc-100">
          {boldMatch[2]}
        </strong>,
      );
      remaining = boldMatch[3];
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <>{parts}</>;
}

export function ChatMessage({ message, userImage, userName }: ChatMessageProps) {
  const isUser = message.role === "user";

  // Filter and extract parts
  const parts = message.parts || [];

  return (
    <div
      className={`flex w-full gap-3 px-4 py-3 transition-colors ${
        isUser ? "bg-zinc-900/30" : "bg-zinc-950/60"
      }`}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {isUser ? (
          userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt={userName || "User"}
              className="h-7 w-7 rounded-lg object-cover border border-zinc-700/60"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-[11px] font-semibold text-indigo-300 border border-indigo-500/30">
              {userName ? userName[0].toUpperCase() : "U"}
            </div>
          )
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 shadow-md shadow-indigo-600/20">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-zinc-300">
            {isUser ? userName || "You" : "SuperMail AI"}
          </span>
          {!isUser && (
            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-400 border border-indigo-500/20">
              READ-ONLY AGENT
            </span>
          )}
        </div>

        {/* Message Parts */}
        <div className="space-y-1 text-zinc-300">
          {parts.map((part, index) => {
            // Text part
            if (part.type === "text") {
              return <FormattedText key={index} content={part.text} />;
            }

            // Tool part (dynamic or static tool-*)
            if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
              const toolPart = part as {
                type: string;
                toolName?: string;
                state?: string;
                errorText?: string;
                toolCallId?: string;
              };
              const toolName = toolPart.toolName || part.type;
              return (
                <ToolActivity
                  key={toolPart.toolCallId || index}
                  toolName={toolName}
                  state={toolPart.state || "output-available"}
                  errorText={toolPart.errorText}
                />
              );
            }

            return null;
          })}

          {/* Fallback if parts is empty but content string exists */}
          {parts.length === 0 && (message as { content?: string }).content && (
            <FormattedText
              content={String((message as { content?: string }).content)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
