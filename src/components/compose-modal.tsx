"use client";

import React, { useState } from "react";
import { useMailMutations } from "@/hooks/use-mail";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  initialThreadId?: string;
}

export function ComposeModal({
  isOpen,
  onClose,
  onSent,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  initialThreadId,
}: ComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);

  const { sendMessage, createDraft } = useMailMutations();
  const isSending = sendMessage.isPending;
  const isSavingDraft = createDraft.isPending;

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!to.trim()) {
      setError("Please specify at least one recipient");
      return;
    }

    setError(null);

    try {
      await sendMessage.mutateAsync({
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        body,
        threadId: initialThreadId,
      });

      onClose();
      if (onSent) onSent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send email";
      setError(msg);
    }
  };

  const handleSaveDraft = async () => {
    setError(null);

    try {
      await createDraft.mutateAsync({
        to: to.trim() || undefined,
        subject: subject.trim() || undefined,
        body,
        threadId: initialThreadId,
      });

      onClose();
      if (onSent) onSent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft";
      setError(msg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full sm:max-w-2xl bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200">
              {initialThreadId ? "Reply Message" : "New Message"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              &times;
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* To Field */}
          <div className="flex items-center border-b border-zinc-800 pb-2">
            <span className="w-12 text-xs font-medium text-zinc-500">To</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none"
              autoFocus
            />
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium"
              >
                Cc
              </button>
            )}
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="flex items-center border-b border-zinc-800 pb-2">
              <span className="w-12 text-xs font-medium text-zinc-500">Cc</span>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none"
              />
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center border-b border-zinc-800 pb-2">
            <span className="w-12 text-xs font-medium text-zinc-500">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-600 outline-none"
            />
          </div>

          {/* Body Field */}
          <div className="pt-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..."
              rows={12}
              className="w-full bg-transparent text-xs sm:text-sm text-zinc-200 placeholder-zinc-600 outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isSending || isSavingDraft}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  <span>Send</span>
                  <span className="hidden sm:inline text-[10px] opacity-75 font-mono ml-1">⌘↵</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSending || isSavingDraft}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50"
            >
              {isSavingDraft ? "Saving..." : "Save Draft"}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Discard draft"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
