"use client";

import React from "react";

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const SUGGESTIONS = [
  {
    category: "Email Actions & Search",
    icon: (
      <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    prompts: [
      "Show my latest emails.",
      "Draft an email to Rahul saying I'll join tomorrow.",
      "Send an email to rahul@example.com about project update.",
    ],
  },
  {
    category: "Calendar Actions",
    icon: (
      <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6.75 3v2.25M17.25 3v2.253M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    prompts: [
      "What meetings do I have tomorrow?",
      "Schedule a meeting with Rahul tomorrow at 3 PM.",
      "Am I free tomorrow between 2 PM and 4 PM?",
    ],
  },
  {
    category: "Agent Productivity",
    icon: (
      <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    prompts: [
      "Find unread emails and summarize them.",
      "Move tomorrow's Rahul meeting from 3 PM to 4 PM.",
      "Reply to this email saying I'll get back tomorrow.",
    ],
  },
];

export function PromptSuggestions({ onSelectPrompt, disabled }: PromptSuggestionsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {SUGGESTIONS.map((group) => (
        <div
          key={group.category}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 backdrop-blur-sm transition-all hover:border-zinc-700/80"
        >
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800">
              {group.icon}
            </span>
            <span className="text-xs font-semibold text-zinc-300">
              {group.category}
            </span>
          </div>
          <div className="space-y-1.5">
            {group.prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={disabled}
                onClick={() => onSelectPrompt(prompt)}
                className="w-full text-left rounded-lg bg-zinc-800/40 px-2.5 py-1.5 text-xs text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
